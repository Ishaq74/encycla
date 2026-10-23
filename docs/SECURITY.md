# Encycla — Sécurité, vie privée et menace

- Version : 1.0
- Date : 2026-10-22
- Statut : exigences de sécurité
- Décisions : [ADR.md](ADR.md)
- Protocole : [PROTOCOL.md](PROTOCOL.md)
- Données : [DATA-MODEL.md](DATA-MODEL.md)

## 1. Modèle de menace

### 1.1 Actifs protégés

1. La bonne réponse et l'article avant `REVEAL`.
2. Les tokens de session, tokens overlay/control et `ADMIN_TOKEN`.
3. L'intégrité des scores et du leaderboard.
4. L'équité des parties (pas de triche, pas de blocage).
5. Les données personnelles minimales des joueurs.
6. La disponibilité du serveur et des rooms TikTok.
7. Les clés Gemini, TikTok et les secrets d'exploitation.

### 1.2 Frontières de confiance

| Frontière | Confiance |
| --- | --- |
| Navigateur joueur | Non fiable |
| Navigateur overlay/control | Non fiable, token requis |
| Chat TikTok | Non fiable |
| Connecteur TikTok | Non fiable, données à valider |
| Réseau Internet | Non fiable, TLS en production |
| Processus Node | Fiable |
| SQLite local | Fiable, accès filesystem restreint |
| `data/questions.json` | Fiable après validation et revue |
| Gemini | Non fiable, hors ligne uniquement |

### 1.3 Attaquants considérés

- Joueur curieux qui inspecte le réseau et le bundle.
- Joueur qui modifie les messages Socket.io.
- Joueur qui essaie de répondre pour un autre.
- Host malveillant qui bloque ou skip abusivement.
- Viewer TikTok qui spamme ou usurpe un pseudo.
- Attaquant qui crée massivement des sessions/rooms.
- Attaquant qui exploite une dépendance ou une image distante.
- Opérateur qui expose accidentellement une clé.

### 1.4 Hors périmètre v1

- Attaque physique sur le serveur.
- Compromission de l'infrastructure d'hébergement.
- DDoS volumétrique (à traiter par le reverse proxy/FAI).
- Sécurité du compte TikTok lui-même.
- Multi-tenant ou isolation entre organisations.

## 2. Principes

1. **Server-authoritative** : aucune règle de jeu dans le client.
2. **Least privilege** : chaque token a un rôle et une room.
3. **Defense in depth** : validation, autorisation, rate limit, CSP.
4. **No secret in client** : aucun secret dans le bundle, aucune clé exposée.
5. **Fail closed** : en cas de doute sur un token, une phase ou un payload, refuser.
6. **Minimal data** : ne collecter que le nécessaire.
7. **No HTML from users/content** : tout est rendu comme texte React.
8. **Deterministic security checks** : identiques en test et en production.

## 3. Authentification

### 3.1 Tokens de session

- Format : `sess_` + 32 octets aléatoires (`crypto.randomBytes(32)`) en base64url.
- Stockage serveur : SHA-256 du token brut, jamais le token.
- Durée : 30 jours, expiration fixe (pas de prolongation automatique).
- Transmission : `Authorization: Bearer` ou `handshake.auth.token`.
- Aucun cookie de session.
- Comparaison : lookup par hash, pas de comparaison naïve.
- Un token expiré est supprimé et renvoie `SESSION_EXPIRED`.

Le token est stocké côté client dans `localStorage` sous `encycla.session.v1`. Ce choix est accepté car :

- aucun cookie n'est utilisé, donc pas de CSRF ;
- le XSS est traité par CSP stricte, React et l'absence de HTML injecté ;
- le token est révocable en supprimant la session côté serveur.

### 3.2 Tokens overlay et control

- Générés à la création d'une room TikTok : 32 octets aléatoires.
- Stockés en mémoire sous forme de hash SHA-256.
- Liés à une seule room et à un seul rôle.
- Transmission dans le fragment d'URL (`#token=...`), puis `handshake.auth`.
- Le fragment n'est jamais envoyé au serveur HTTP, donc jamais dans les logs d'accès.
- Aucun token en query string : si un token y est détecté, il est rejeté et redacted des logs.
- Pas d'expiration propre : les tokens restent valides jusqu'à la fermeture de la room.
- Révocation : fermeture de la room ; les tokens ne sont pas régénérés en v1.

### 3.3 `ADMIN_TOKEN`

- 32 octets aléatoires minimum, fourni par variable d'environnement.
- Comparaison à temps constant (`crypto.timingSafeEqual`).
- Jamais exposé au client, jamais loggué.
- Rotation : mise à jour de l'environnement, redémarrage, ancien token invalide.
- Les routes admin renvoient `401 AUTH_REQUIRED` si le token est absent et `401 AUTH_INVALID` s'il est invalide, sans confirmer l'existence de la route.

### 3.4 Sessions TikTok

- Aucune session n'est créée pour un viewer.
- L'identité est `(provider='tiktok', external_id=uniqueId)`.
- Le viewer ne peut pas se reconnecter avec une autre identité.
- Un changement de pseudo TikTok met à jour l'affichage, pas l'identité.

## 4. Autorisation

### 4.1 Matrice des capacités

| Action | Joueur | Host privé | Host public | Control TikTok | Overlay | Admin |
| --- | --- | --- | --- | --- | --- | --- |
| Voir snapshot public | oui (membre) | oui | oui | oui | oui | non |
| Répondre | oui | oui | oui | non | non | non |
| `CONTINUE` | oui | oui | oui | non | non | non |
| `GAME_START` | non | oui (lobby) | non | oui | non | non |
| Pause/resume | non | oui | non | oui | non | non |
| Skip article/level | non | oui | non | oui | non | non |
| Skip question | non | non | non | oui | non | non |
| Réponse manuelle | non | non | non | oui | non | non |
| Fermer la room | non | oui | non | oui | non | oui |
| Créer room TikTok | non | non | non | non | non | oui |
| Approuver question | non | non | non | non | non | oui |

Règles :

- Le host web est le créateur d'une room privée. En room publique, le host est informatif et sans pouvoir.
- En solo, le joueur est host : pause/resume autorisés, skip interdit.
- Le control TikTok est un host opérateur : toutes les capacités de la colonne.
- Un joueur éliminé, ou `FORFEITED` par expiration de reconnexion, perd les capacités de jeu mais garde la lecture. Un départ volontaire en partie le retire de la room.
- Un joueur `FORFEITED` perd tout accès à la room.

### 4.2 Vérifications systématiques

Pour chaque événement :

1. Le socket est-il authentifié avec le bon rôle ?
2. La room existe-t-elle et est-elle ouverte ?
3. Le joueur est-il membre de la room ?
4. La phase autorise-t-elle l'action ?
5. Le joueur a-t-il la capacité ?
6. Le payload est-il valide ?
7. La limite de débit est-elle respectée ?

Toute réponse négative renvoie un code générique et est logguée sans données sensibles.

## 5. Validation des entrées

### 5.1 Schémas Zod

Tous les payloads HTTP et Socket.io sont validés par un schéma Zod strict :

- champs inconnus rejetés (`.strict()`) ;
- types exacts, pas de coercition implicite ;
- chaînes trimées et normalisées ;
- longueurs maximales ;
- enums fermés ;
- UUID validés ;
- entiers bornés.

Un payload invalide renvoie `VALIDATION_ERROR` sans détail interne.

### 5.2 Pseudos

- 2 à 24 graphèmes.
- Lettres Unicode, chiffres, espace, `_`, `-`.
- NFKC, trim, espaces compactés.
- Suppression des caractères de contrôle et des bidi controls.
- Pas de HTML, pas de `@`, pas d'URL.
- Les homoglyphes ne sont pas bloqués en v1 ; l'avatar et le `displayName` calculé par le serveur désambiguïsent.
- Un pseudo vide après normalisation est refusé.

### 5.3 Codes de room

- Exactement 6 caractères.
- Alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- Regex `^[A-HJ-NP-Z2-9]{6}$`.
- Toute autre valeur est rejetée avant le lookup.

### 5.4 Images

- HTTPS uniquement.
- Allowlist : `upload.wikimedia.org`, `commons.wikimedia.org`.
- Pas de `data:`, `blob:`, `javascript:`, `file:`.
- `alt` obligatoire.
- Les images sont servies directement par le navigateur ; le serveur ne les proxyfie pas en v1.
- En cas d'image indisponible : placeholder local.

### 5.5 Articles

- Texte brut uniquement.
- Longueur maximale 5 000 caractères.
- Aucune balise HTML acceptée à l'import.
- Rendu React en texte, paragraphes via `split('\n\n')`.
- Interdiction de `dangerouslySetInnerHTML` (règle ESLint bloquante).

### 5.6 Réponses

- `questionId` : slug connu de la room courante.
- `choiceIndex` : entier strict 0-3.
- `phaseToken` : 32 hex.
- Le temps de réponse n'est jamais fourni par le client.
- Une deuxième réponse est rejetée, même identique.

## 6. Sécurité web

### 6.1 En-têtes

En production, chaque réponse inclut :

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' https://upload.wikimedia.org https://commons.wikimedia.org;
  font-src 'self';
  connect-src 'self' wss://DOMAIN;
  media-src 'self';
  object-src 'none';
  base-uri 'none';
  form-action 'none';
  frame-ancestors 'none';
  upgrade-insecure-requests

Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

- En développement, `connect-src` autorise `ws://localhost:3000` et `http://localhost:3000`.
- Aucun `unsafe-inline`, aucun `unsafe-eval`.
- Les styles dynamiques utilisent des variables CSS et des classes, pas `style="..."` arbitraire.
- `frame-ancestors 'none'` protège contre le clickjacking ; l'overlay OBS n'est pas une iframe.

### 6.2 CORS

- Production : même origin uniquement, aucune origine externe.
- Développement : `http://localhost:5173` uniquement.
- Pas de `Access-Control-Allow-Origin: *`.
- Pas de credentials CORS (aucun cookie).
- Les routes admin ne sont pas appelables depuis un navigateur tiers.

### 6.3 CSRF

- Aucun cookie d'authentification.
- Tokens dans `Authorization` ou `handshake.auth`, jamais lus automatiquement par le navigateur.
- Aucune mutation via `GET`.
- `SameSite` non applicable.
- Le risque CSRF est donc nul par construction ; il ne faut pas introduire de cookie de session plus tard sans réévaluer.

### 6.4 XSS

- React échappe les textes.
- Aucun `dangerouslySetInnerHTML`, aucun `innerHTML`, aucun `eval`.
- Les URLs d'images sont validées par allowlist.
- Les pseudos et articles sont des textes.
- CSP sans `unsafe-inline`.
- Les erreurs serveur ne sont jamais injectées comme HTML.
- L'overlay applique les mêmes règles.

### 6.5 Clickjacking et ouverture

- `frame-ancestors 'none'`.
- Pas de `window.open` vers des URLs contrôlées par l'utilisateur.
- Les liens externes (crédits image) utilisent `rel="noopener noreferrer"`.

### 6.6 Service worker et cache

- Pas de service worker en v1.
- Les assets sont hashés par Vite.
- `index.html` est `no-cache`.
- Aucune donnée de room dans le cache HTTP.

## 7. Sécurité Socket.io

- Authentification au handshake, avant tout événement.
- Namespace `/game` uniquement.
- Chaque socket est rattaché à un rôle et, si applicable, à une room.
- Vérification de la room à chaque événement, pas seulement à la connexion.
- Les sockets overlay/control ne peuvent pas envoyer d'événements de jeu.
- Les broadcasts ne sortent jamais de la room.
- `sessionReplaced` : un nouveau socket invalide l'ancien.
- Limite : 10 événements/s, burst 20.
- Taille maximale d'un payload socket : 16 Ko.
- `perMessageDeflate` désactivé (évite les bombes de compression).
- Ping interval 25 s, timeout 20 s.
- Aucun `correctIndex` dans les événements avant `REVEAL`.

## 8. Rate limiting et anti-abus

| Portée | Limite | Stockage |
| --- | --- | --- |
| HTTP par IP | 100/min | mémoire |
| Sessions par IP | 10/min | mémoire |
| Rooms par session | 10/min | mémoire |
| Join par IP | 10/min | mémoire |
| File par session | 20/min | mémoire |
| Connexions socket par IP | 20/min, 5 simultanées | mémoire |
| Événements socket | 10/s, burst 20 | par socket |
| Réponses | 1/question/joueur | état de room |
| Continues | 1/phase/joueur | état de room |
| Votes small room | 1/proposition/joueur | état de room |
| Rooms simultanées | 200 | mémoire |
| File publique | 500 joueurs | mémoire |
| Viewers TikTok | 100/room | état de room |

- En dépassement : `RATE_LIMITED`.
- Un abus répété : déconnexion et blocage temporaire de l'IP (5 min).
- Les compteurs sont remis à zéro au redémarrage (une instance).
- Les routes admin ont une limite séparée : 30/min.

## 9. Gestion des secrets

### 9.1 Variables

| Variable | Portée | Obligatoire |
| --- | --- | --- |
| `PORT` | serveur | non (3000) |
| `NODE_ENV` | serveur | oui |
| `DATABASE_PATH` | serveur | non (`data/encycla.db`) |
| `ADMIN_TOKEN` | serveur | oui en production |
| `TIKTOK_USERNAME` | serveur | si TikTok |
| `TIKTOK_SESSION_COOKIE` | serveur | si TikTok |
| `TIKTOK_ENABLED` | serveur | non |
| `GEMINI_API_KEY` | scripts offline | non |
| `PUBLIC_ORIGIN` | serveur | oui en production |
| `LOG_LEVEL` | serveur | non |

### 9.2 Règles

- `.env` est gitignoré.
- `.env.example` ne contient que des placeholders.
- Aucune variable secrète n'est préfixée `VITE_`.
- `vite.config.ts` ne définit aucune clé.
- Le bundle client est scanné en CI pour `AIza`, `sess_`, `ADMIN_TOKEN`, `GEMINI`.
- Les logs redacted : `Authorization`, `token`, `cookie`, `password`, `secret`, `key`.
- Les tokens ne sont jamais dans les URLs HTTP (fragment pour overlay/control).
- Les clés sont chargées au démarrage et validées ; le serveur refuse de démarrer si une clé obligatoire manque en production.
- Rotation documentée dans [DEPLOYMENT.md](DEPLOYMENT.md).

### 9.3 Gemini

- Utilisé uniquement par les scripts de contenu, jamais au runtime.
- La clé n'est jamais présente dans le conteneur de jeu.
- Les réponses Gemini sont non fiables : validation, revue humaine, aucune exécution.
- Les prompts ne contiennent aucune donnée personnelle.

### 9.4 TikTok

- Le cookie de session TikTok est un secret critique.
- Jamais loggué, jamais exposé à l'overlay.
- Le connecteur tourne dans le même processus en v1, avec accès restreint.
- En cas de fuite : déconnexion de la session TikTok, rotation du cookie, redémarrage.

## 10. Sécurité du contenu

- Les questions et articles sont revus par un humain.
- Aucun HTML, aucun Markdown non échappé.
- Les images sont créditées et sous licence vérifiée.
- Pas de contenu généré par Gemini sans revue.
- Les candidats sont stockés avec leur modèle et prompt.
- Un contenu signalé peut être retiré de `questions.json` puis réimporté.
- Aucune donnée personnelle dans les questions.

## 11. Journalisation et observabilité

### 11.1 Logs

- JSON structuré.
- Champs : `timestamp`, `level`, `event`, `requestId`, `roomCode`, `playerId`, `errorCode`.
- Redaction automatique des secrets.
- Pas de token, pas de cookie, pas d'IP brute, pas de contenu d'article.
- Les erreurs 5xx incluent une stack côté serveur, jamais côté client.
- Rétention : 30 jours.

### 11.2 Métriques

- Rooms actives, joueurs connectés, matchs terminés.
- Latence HTTP p95/p99.
- Erreurs par code.
- Reconnexions, timeouts, abandons.
- Connexions TikTok, commentaires parsés/rejetés.
- Aucune métrique par joueur identifiable.

### 11.3 Alertes

- Taux d'erreur 5xx > 1 % pendant 5 min.
- Base indisponible.
- Aucune room alors que des sockets sont connectés.
- Connecteur TikTok déconnecté > 5 min.
- Pic de `RATE_LIMITED`.

## 12. Vie privée

### 12.1 Données collectées

| Donnée | Finalité | Base | Rétention |
| --- | --- | --- | --- |
| Pseudo | Affichage, leaderboard | jeu | indéfinie |
| Avatar | Affichage | jeu | indéfinie |
| ID joueur | Identité technique | jeu | indéfinie |
| Scores | Leaderboard | jeu | indéfinie |
| `uniqueId` TikTok | Identité viewer | jeu | indéfinie |
| Pseudo TikTok | Affichage | jeu | indéfinie |

### 12.2 Minimisation

- Pas d'email, pas de téléphone, pas de nom réel.
- Pas de géolocalisation.
- Pas de tracking publicitaire.
- Pas de cookies analytiques.
- Pas de fingerprinting.
- Les IP ne sont jamais persistées : elles servent uniquement au rate limiting en mémoire et sont oubliées.

### 12.3 Droits

- Un joueur peut changer son pseudo.
- Une demande de suppression est traitée manuellement par l'opérateur : suppression de `players`, `scores` associés ou anonymisation.
- Les scores des matchs terminés peuvent être anonymisés (`pseudo_snapshot='Anonyme'`) sans casser le leaderboard.
- Aucun export automatisé en v1.
- Contact et politique de confidentialité à publier avant mise en production publique.

### 12.4 Mineurs

- Le jeu n'est pas spécifiquement destiné aux mineurs.
- Aucune collecte d'âge.
- L'opérateur TikTok est responsable du respect des règles de la plateforme.
- Les pseudos sont publics : ne pas utiliser d'information personnelle.

## 13. Chaîne d'approvisionnement

- `pnpm install --frozen-lockfile` avec `pnpm-lock.yaml` commité.
- Versions Node 22 LTS et pnpm verrouillées.
- `pnpm audit --prod` en CI.
- Dependabot ou `pnpm audit` hebdomadaire.
- Aucune dépendance CDN dans `index.html`.
- Pas de police distante, pas de script tiers.
- Docker : image de base `node:22-alpine` épinglée par digest en production.
- Build multi-stage ; runtime non-root (`node`).
- `pnpm install --frozen-lockfile --ignore-scripts` dans le stage de build si possible ; `better-sqlite3` est compilé dans le stage de build.
- Scan d'image (Trivy) en CI.
- Gitleaks en CI.
- Aucun secret dans les couches Docker.

## 14. Durcissement du serveur

- `helmet` pour les en-têtes.
- `express.json({ limit: '16kb' })`.
- `server.headersTimeout = 10000`.
- `server.requestTimeout = 15000`.
- `server.keepAliveTimeout = 5000`.
- Désactiver `x-powered-by`.
- Trust proxy configuré explicitement (`1` derrière un reverse proxy unique).
- Timeouts socket.
- Validation de `Origin` pour les upgrades WebSocket en production.
- Arrêt gracieux : cesser d'accepter, fermer les sockets, fermer SQLite.
- Limite de mémoire Node `--max-old-space-size=512`.
- Aucun accès filesystem arbitraire depuis une requête.
- Pas d'exécution de commandes shell avec des entrées utilisateur.

## 15. Sécurité Docker

- Utilisateur non-root.
- `read_only: true` avec volumes inscriptibles pour `/app/data` et `/tmp`.
- Pas de montage du socket Docker.
- Pas de `--privileged`.
- Variables d'environnement via secrets Docker/CI, pas dans l'image.
- Réseau bridge dédié.
- Reverse proxy TLS (Caddy/Nginx) devant l'application.
- `restart: unless-stopped`.
- Healthcheck `/api/health`.

## 16. Réponse à incident

### 16.1 Compromission d'un token de session

1. Supprimer la ligne `player_sessions` correspondante.
2. Vérifier les scores suspects.
3. Informer le joueur si applicable.

### 16.2 Compromission d'`ADMIN_TOKEN`

1. Retirer la variable et redémarrer.
2. Générer un nouveau token.
3. Vérifier les logs des routes admin.
4. Fermer les rooms TikTok suspectes.

### 16.3 Compromission du cookie TikTok

1. Déconnecter la session TikTok.
2. Révoquer la session côté TikTok.
3. Redémarrer le connecteur avec un nouveau cookie.
4. Vérifier qu'aucun cookie n'apparaît dans les logs.

### 16.4 Fuite de la base

1. Isoler le serveur.
2. Restaurer une sauvegarde saine.
3. Supprimer les sessions actives (`DELETE FROM player_sessions`).
4. Notifier selon les obligations légales.

### 16.5 XSS ou dépendance compromise

1. Déployer un correctif ou retirer la dépendance.
2. Invalider toutes les sessions si des tokens ont pu être exfiltrés.
3. Vérifier les CSP reports.
4. Auditer les scores modifiés.

## 17. Checklist avant mise en production

- [ ] `pnpm audit` sans vulnérabilité critique ou high non traitée.
- [ ] Gitleaks sans secret détecté.
- [ ] `ADMIN_TOKEN` aléatoire et stocké hors dépôt.
- [ ] TLS actif, HSTS actif.
- [ ] CSP vérifiée en production, aucun `unsafe-*`.
- [ ] `connect-src` limité au domaine.
- [ ] Cookies TikTok absents des logs.
- [ ] Aucun secret dans le bundle client.
- [ ] `dangerouslySetInnerHTML` absent du code.
- [ ] Rate limits testés.
- [ ] Reconnexion et remplacement de session testés.
- [ ] Leaderboard sans match solo.
- [ ] Sauvegarde et restauration testées.
- [ ] `PRAGMA integrity_check` OK.
- [ ] Conteneur non-root, filesystem read-only.
- [ ] Politique de confidentialité publiée.
- [ ] Contact de signalement disponible.
- [ ] Procédure de rotation des secrets écrite.
