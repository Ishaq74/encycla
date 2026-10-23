# Encycla — Stratégie de tests et critères de qualité

- Version : 1.0
- Date : 2026-10-22
- Statut : exigences de vérification
- Règles : [SPECIFICATION.md](SPECIFICATION.md)
- Protocole : [PROTOCOL.md](PROTOCOL.md)
- Données : [DATA-MODEL.md](DATA-MODEL.md)

## 1. Objectifs

1. Prouver que le moteur applique exactement les règles, sans I/O.
2. Prouver que le serveur ne fuit jamais la bonne réponse.
3. Prouver que les scores et le leaderboard sont justes et durables.
4. Prouver que les reconnexions, pauses et abandons ne bloquent pas une room.
5. Prouver que le client reflète l'état serveur sans recalculer les règles.
6. Prouver que le jeu reste utilisable au clavier et avec un lecteur d'écran.
7. Rendre chaque régression reproductible localement et en CI.

## 2. Pyramide

| Niveau | Part | Temps cible | Outil |
| --- | --- | --- | --- |
| Unitaire moteur | ~55 % | < 3 s | Vitest |
| Unitaire serveur/client | ~20 % | < 5 s | Vitest |
| Intégration serveur | ~15 % | < 20 s | Vitest + Socket.io client |
| E2E navigateur | ~7 % | < 2 min | Playwright |
| Charge et sécurité | ~3 % | manuel/CI nocturne | scripts dédiés |

Règles :

- Pas de réseau réel dans les tests unitaires.
- Pas de `sleep` arbitraire ; timers fake ou attentes déterministes.
- Pas de base de production dans les tests.
- Chaque bug corrigé ajoute un test de régression nommé.

## 3. Outils et commandes

```json
{
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc -b --pretty false",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:load": "tsx scripts/load-test.ts",
    "data:validate": "tsx scripts/validate-questions.ts",
    "db:migrate": "tsx server/db/migrate.ts"
  }
}
```

- Node 22.
- TypeScript strict.
- Vitest avec `environment: 'node'` pour le serveur, `jsdom` pour les composants client.
- Playwright avec Chromium ; Firefox/WebKit en CI nocturne.
- `@testing-library/react` et `@testing-library/user-event`.
- `axe-core` via `@axe-core/playwright`.
- Pas de snapshot massif ; snapshots ciblés sur les vues critiques.

## 4. Déterminisme

### 4.1 Injections obligatoires

Le moteur reçoit :

```ts
interface EngineDeps {
  now: () => number;
  random: () => number;
  questionProvider: QuestionProvider;
  idFactory: () => string;
  logger: Logger;
}
```

- `now` : horloge fake dans les tests.
- `random` : séquence déterministe pour le shuffle et les IDs.
- `questionProvider` : fixture contrôlée.
- `idFactory` : IDs lisibles (`p1`, `q1`, ...).
- Aucun `Date.now()`, `Math.random()` ou `crypto.randomUUID()` direct dans le moteur.

### 4.2 Timers

- `vi.useFakeTimers()` pour les transitions.
- Avancer le temps avec `vi.advanceTimersByTime(ms)`.
- Ne jamais attendre un vrai timer en unitaire.
- En intégration, utiliser une horloge injectable côté serveur ou des timers courts (< 100 ms) avec `waitFor`.
- Les tests de pause vérifient que le temps de pause n'est pas compté.

### 4.3 Fixtures

- `tests/fixtures/questions.ts` génère 200 questions déterministes pour CLASSIC.
- 20 questions par catégorie pour SUBJECT.
- 10 questions pour CONTEST.
- Chaque question a un `correctIndex` varié, jamais toujours B.
- Les articles contiennent des caractères accentués, des apostrophes et des paragraphes.
- Les fixtures ne sont jamais importées en production.

## 5. Tests unitaires du moteur

### 5.1 Scoring CLASSIC/SUBJECT

| Cas | Attendu |
| --- | --- |
| Novice L1, 0 ms, série 0 | 150 |
| Novice L1, 3 000 ms, série 0 | 150 |
| Novice L1, 3 001 ms, série 0 | 150 |
| Novice L1, 8 000 ms, série 0 | 125 |
| Novice L1, 13 000 ms, série 0 | 100 |
| Novice L1, 25 000 ms, série 0 | 100 |
| Adventurer L5, 8 000 ms, série 3 | 710 |
| Wizard L10, 14 000 ms, série 12 | 1700 |
| Série 10 puis correcte | bonus plafonné à 200 |
| Mauvaise réponse | 0, série 0, vie -1 |
| Timeout | 0, série 0, vie -1 |
| Réponse après échéance | rejet, traitée en timeout à la résolution |
| Arrondi `.5` | arrondi au plus proche, test explicite |

Vérifier que `basePoints` est arrondi une seule fois et que le bonus de vitesse ne devient jamais négatif.

### 5.2 Scoring CONTEST

- Seul correct : 1000.
- Deux corrects : +200 au plus rapide.
- Trois corrects : +200 au plus rapide uniquement.
- Égalité exacte : +200 à tous les ex æquo.
- Aucun correct : 0 pour tous.
- Pas de série, pas de vie, pas de multiplicateur.

### 5.3 Départage

Ordre testé avec des joueurs artificiels :

1. survivant avant éliminé ;
2. score ;
3. corrects ;
4. erreurs + timeouts croissants ;
5. temps total ;
6. ordre d'arrivée ;
7. égalité.

Tester chaque niveau de départage isolément et un cas combiné.

### 5.4 Vies et élimination

- 3 mauvaises réponses : éliminé.
- 2 mauvaises + 1 timeout : éliminé.
- Bonne réponse après 2 erreurs : reste à 1 vie.
- Joueur éliminé ne peut plus répondre.
- Joueur éliminé ne bloque pas la résolution.
- Solo éliminé : match terminé.
- Room web avec 2 joueurs, un éliminé : match terminé.
- Room web : tous éliminés sur la même question → classement par score.
- `winning_player_id` = premier du classement final, `NULL` si égalité parfaite.
- TikTok : 0 ou 1 actif ne termine pas le match ; les viewers peuvent rejoindre à chaque `QUESTION`.
- TikTok : fin naturelle avec `player_count=0` → match `abandoned`.
- Vies solo rechargées à `LEVEL_COMPLETE`.
- Vies room non rechargées.
- Room web à 2 : une déconnexion dans la fenêtre de 30 s ne termine pas immédiatement le match ; le joueur peut revenir.
- Déconnecté non revenu à la résolution : timeout, sans bloquer l'avancement.
- Déconnecté >30 s en partie : `FORFEITED` ; si la room web passe sous 2 actifs, fin de match.
- `CONTINUE` d'un déconnecté non requis ; le timeout de phase avance.
- Forfait conserve le score mais exclut du classement des survivants.
- `ROOM_LEAVE` en partie : `FORFEITED`, score conservé, joueur retiré de la room et absent de `finalRanking`.
- Forfait par expiration de reconnexion : reste membre en lecture seule, marqué `FORFEITED`, présent dans `finalRanking`.
- Joueur `FORFEITED` expiré en lecture seule ne peut plus répondre (`PLAYER_FORFEITED`).
- Solo quitté ou expiré : match `abandoned`.
- `finalRanking` à `MATCH_OVER` : un rang par joueur membre, forfaits par déconnexion inclus, ordre ADR-005.
- Égalité parfaite au premier rang : rangs partagés, `tied=true`, `winnerId=null`.
- Victoire unique : `winnerId` = joueur de rang 1.
- Match abandonné : `finalRanking=[]`, `winnerId=null`.

### 5.5 Machine à états

- Toutes les transitions de la table de spécification.
- Événement invalide dans chaque phase.
- `COUNTDOWN` → `QUESTION` après exactement 3 000 ms.
- `REVEAL` → `ARTICLE` après 2 500 ms.
- `ARTICLE` → question suivante après tous les `CONTINUE`.
- `ARTICLE` → timeout 30 s en web, 8 s en TikTok.
- `LEVEL_COMPLETE` → timeout 15 s.
- `PAUSED` mémorise la phase et le temps restant.
- `PAUSED` ne fait pas avancer le timer.
- Reprise recalcule l'échéance.
- Pause auto-reprise après 120 s (rooms privées et solo).
- `HOST_SKIP` interdit en `QUESTION` pour un host privé.
- `HOST_SKIP` autorisé en `ARTICLE`/`LEVEL_COMPLETE` pour un host privé.
- `HOST_SKIP` autorisé en `QUESTION` pour le control TikTok.
- `HOST_SKIP` refusé en `REVEAL` pour le control TikTok.
- `HOST_CLOSE` autorisé pour un host privé en lobby et en partie (abandon).
- Solo : pause/resume autorisés, skip/close refusés.
- Room publique : aucun contrôle host.
- TikTok : `ROOM_JOIN` par code → `ROOM_NOT_FOUND`.
- TikTok : `GAME_START` avec 0 viewer accepté ; le match reste jouable.
- TikTok : `GAME_START` avec connecteur déconnecté refusé (`TIKTOK_NOT_CONNECTED`).
- Première réponse TikTok : création du score et incrément de `player_count`.
- Fin de match : plus de question générée.
- Fin naturelle : dernière question → `REVEAL` → `ARTICLE` final → `MATCH_OVER`.
- Fin anticipée web/solo (élimination, < 2 actifs) : `REVEAL` → `MATCH_OVER`, sans article.
- TikTok : jamais de fin anticipée sur < 2 actifs ; `HOST_CLOSE` ou fin naturelle uniquement.
- TikTok : déconnexion du connecteur → `tiktokConnected=false`, `PAUSED` au point sûr, sans auto-reprise ; `HOST_RESUME` puis réponse manuelle possibles.
- TikTok : déconnexion pendant `COUNTDOWN` → countdown terminé, puis `PAUSED` à l'entrée en `QUESTION`.
- `tiktokConnected` vaut `true` après connexion, `false` après déconnexion/reconnexion en cours, et toujours `false` en web.

### 5.6 Questions

- Tirage sans répétition dans une room.
- Mélange Fisher-Yates reproductible avec un RNG fixe.
- `correctIndex` suit le mélange.
- Aucune option dupliquée.
- Difficulté correcte par niveau CLASSIC.
- Difficulté fixe SUBJECT/CONTEST.
- Recycle des plus anciennes quand la banque est épuisée.
- `usedQuestionIds` propre à chaque room.
- Question de la bonne catégorie en SUBJECT.
- 20 questions par level, 10 en CONTEST.
- Une question résolue compte même si tout le monde a timeout.

### 5.7 Matchmaking

- File par clé `mode|difficulty|category`.
- CONTEST : 2 joueurs → room immédiate.
- CLASSIC : 4 joueurs → room immédiate.
- 2 joueurs après 120 s → proposition.
- 3 joueurs après 120 s → proposition.
- Majorité stricte 2/3 → room avec 2.
- 1/3 → pas de room, timer réinitialisé.
- Non-réponse = refus.
- 4e joueur pendant le vote → annulation et room normale.
- Déconnexion d'un votant → quorum inchangé, non-réponse = refus.
- Acceptants < 2 → pas de room.
- Le vote ne peut pas être rejoué.
- Un joueur ne peut pas voter deux fois.
- La cible atteinte avant 120 s annule la proposition.
- Annulation du `COUNTDOWN` public : joueurs restants remis en file.

### 5.8 Reconnexion

- Déconnexion < 30 s : état conservé.
- Réponse verrouillée conservée.
- Timer continue pendant la déconnexion.
- Déconnexion > 30 s : forfait.
- Reconnexion avec un nouveau socket : l'ancien est remplacé.
- Deux onglets : le dernier gagne.
- Host quitte le lobby : transfert au plus ancien.
- Host quitte en partie privée : la partie continue.

## 6. Tests du serveur

### 6.1 API HTTP

- Création de session valide.
- Pseudo invalide (vide, 1 caractère, 21 caractères, HTML, contrôle).
- Token absent/invalide/expiré.
- Création de room CLASSIC/SUBJECT/CONTEST.
- SUBJECT avec catégorie insuffisante.
- Capacité de room.
- Rejoindre une room inconnue/pleine/démarrée.
- File : join, doublon, leave, position.
- Leaderboard : filtres, limite, offset, données absentes.
- Config : catégories et seuils.
- Health : DB OK/dégradée ; en dégradé, `db=disabled`, `status=degraded`, `questions=ok` si le JSON est valide **et** les seuils sont atteints, sinon `questions=degraded`.
- SQLite indisponible : serveur opérationnel, questions JSON, partie jouable, leaderboard `PERSISTENCE_DISABLED`.
- SQLite corrompue au boot : `quick_check` échoue, bascule dégradée, aucune écriture tentée.
- Quota de pseudo : 2 et 24 graphèmes acceptés, 25 refusés.
- Pseudos identiques : `displayName` désambiguïsé par le serveur, `pseudo` inchangé.
- Admin : token absent, invalide, valide.
- TikTok : création avec/sans admin, mode désactivé.
- Corps > 16 Ko rejeté.
- JSON malformé rejeté.

### 6.2 Authentification et autorisation

Matrice complète de la section 4 de [SECURITY.md](SECURITY.md) :

- Joueur non membre ne peut pas envoyer `ANSWER`.
- Joueur ne peut pas répondre pour un autre.
- Host public ne peut pas pause/skip/close.
- Host privé ne peut pas répondre manuellement.
- Overlay ne peut pas envoyer d'action.
- Control ne peut pas répondre à la place d'un joueur sauf `HOST_MANUAL_ANSWER`.
- Admin ne peut pas rejoindre une room.
- Token overlay d'une room ne fonctionne pas sur une autre.
- Token control ne fonctionne pas comme overlay.
- Session révoquée : socket déconnecté au prochain événement.
- Aucune IP ni user-agent écrit dans `player_sessions` ni dans les logs.

### 6.3 Non-fuite de la réponse

Pour chaque phase :

- `QUESTION` : `question` sans `correctIndex`, sans `reveal`, sans `results`.
- `REVEAL` : `subject`, `questionText`, `options`, `correctIndex`, `results` et `articleBody` présents ; `question` null.
- `ARTICLE` : `reveal` autoportant présent, article et réponse présents.
- `MATCH_OVER` : dernier reveal présent, `finalRanking` et `winnerId` présents et cohérents avec `players`.
- Aucun snapshot `LOBBY`, `COUNTDOWN`, `QUESTION` ou `PAUSED` depuis `QUESTION` ne contient `correctIndex`.
- Les erreurs ne contiennent jamais la réponse.
- Les logs de test ne contiennent pas la réponse en clair pour un joueur non autorisé.
- Une requête HTTP ne permet pas de lire une question non révélée.

### 6.4 Protocole

- `stateVersion` strictement croissante.
- Un client qui reçoit une version ancienne l'ignore (test client).
- `PLAYER_LOCKED` n'incrémente pas la version.
- `ANSWER` sans `questionId` rejeté.
- `ANSWER` avec un `questionId` périmé rejeté.
- `ANSWER` après échéance rejeté.
- Deuxième `ANSWER` rejeté.
- `CONTINUE` avec token périmé rejeté.
- `CONTINUE` deux fois : idempotent ou rejeté explicitement.
- Ack d'erreur contient `code`, `message`, `requestId`.
- `TIMER_SYNC` cohérent avec `phaseEndsAt`.
- Reconnexion : `SESSION_READY` + snapshot.
- Remplacement : `SESSION_REPLACED`.
- Room fermée : `ROOM_CLOSED`.
- Aucun événement d'une room ne fuit vers une autre.

### 6.5 Persistance

- Migration sur base vide.
- Migration idempotente.
- Migration dans le désordre : refus.
- Match créé en `in_progress` avec scores `playing`.
- `COUNTDOWN` annulé : match `abandoned`, scores `abandoned`, `ROOM_CLOSED` reason `MATCH_CANCELLED`.
- Révélation met à jour les compteurs.
- Fin de match : `completed`, `ended_at`, `finalized_at`.
- Redémarrage : `in_progress` → `abandoned`.
- Un match abandonné n'apparaît pas au leaderboard.
- Un match solo n'apparaît pas.
- Un match TikTok avec `player_count < 2` n'apparaît pas.
- Un forfait n'apparaît pas.
- Un éliminé apparaît.
- Leaderboard stable et trié.
- Filtres mode/source.
- Token brut absent de la base.
- Hash de token unique.
- Sessions expirées purgées.
- Import atomique : une erreur ne laisse pas de questions partielles.
- Suppression d'une question du JSON la retire de la base.

### 6.6 Transactions et concurrence

- Deux `ANSWER` simultanés du même joueur : un seul accepté.
- Deux résolutions simultanées : une seule écriture.
- Deux créations de room avec le même code : une seule réussit.
- Deux imports simultanés : un seul commit.
- Un crash simulé entre deux écritures ne laisse pas de score final incohérent.
- Le moteur ne dépend pas de l'ordre des messages réseau.

## 7. Tests d'intégration temps réel

Serveur réel sur un port éphémère, SQLite temporaire, clients Socket.io réels.

Scénarios :

1. **Solo CLASSIC complet simulé** : 200 questions, timers accélérés, score final.
2. **Room privée 2 joueurs** : lobby, ready, start, 20 questions, révélation, article, level suivant.
3. **Room publique CONTEST** : file, match immédiat, 10 questions, classement.
4. **Room publique CLASSIC** : 4 joueurs, auto-start.
5. **Small room** : 3 joueurs, vote, room à 2.
6. **Reconnexion** : coupure, retour, snapshot identique.
7. **Remplacement d'onglet** : ancien socket fermé.
8. **Élimination** : joueur éliminé ne bloque pas.
9. **Timeout global** : tous les joueurs timeouts, article, vie -1.
10. **Pause/reprise** : temps restant conservé.
11. **Host quitte le lobby** : transfert.
12. **Leaderboard après match** : visible via HTTP.
13. **Redémarrage** : match en cours abandonné.
14. **TikTok simulé** : adaptateur de chat injecté, viewers A/B/C/D, overlay, control.
15. **Overlay/control** : lecture seule, tokens invalides.
16. **Rate limit** : 11e événement/s rejeté.

Chaque scénario vérifie :

- les snapshots reçus ;
- l'absence de `correctIndex` avant `REVEAL` ;
- les scores finaux ;
- les lignes SQLite ;
- l'absence de timer orphelin après fermeture.

## 8. Tests client

### 8.1 Store

- Applique un snapshot.
- Ignore une version plus ancienne.
- Ne calcule jamais de score.
- Ne déduit jamais la bonne réponse.
- Gère `SESSION_READY`, `ROOM_STATE`, `TIMER_SYNC`, `ERROR`.
- Réinitialise l'état à la sortie.

### 8.2 Composants

- Lobby : code, joueurs, prêt, start host.
- Question : 4 options, timer, clavier A/B/C/D.
- Reveal : bonne réponse, explication, points.
- Article : paragraphes, image, bouton continuer.
- Level complete : bilan, vies rechargées en solo.
- Match over : classement depuis `finalRanking`, `winnerId`, Draw, match abandonné, pas de recalcul client.
- Leaderboard : filtres, états vide/erreur.
- Overlay : pas de contrôles, top 10 final depuis `finalRanking`, badge `Chat reconnecting…` quand `tiktokConnected=false`.
- Control : boutons host, token absent, badge `LIVE`/`CHAT OFFLINE` selon `tiktokConnected`.
- Sound : mute persistant.

### 8.3 Accessibilité

- axe-core sur chaque vue.
- Navigation clavier complète.
- Focus visible.
- `aria-live` annonce les phases.
- Options avec `aria-label`.
- Timer annoncé à 10 s, 5 s, 0.
- Contraste AA.
- `prefers-reduced-motion`.
- Aucun piège de focus.
- Test manuel NVDA (Windows) et VoiceOver (macOS) avant release.

### 8.4 Responsive

- 360×640, 768×1024, 1280×720, 1920×1080.
- Aucun débordement horizontal.
- Cibles ≥ 44 px.
- Overlay 1920×1080 uniquement.

## 9. Tests E2E Playwright

### 9.1 Parcours

1. Créer une session, jouer un solo CLASSIC accéléré.
2. Deux contextes navigateur : room privée, réponses différentes, révélation, classement.
3. File publique CONTEST : deux contextes, match, score.
4. Reconnexion : couper le contexte, revenir, vérifier le score.
5. Recharger la page en pleine question : snapshot restauré.
6. Leaderboard : match terminé visible.
7. SUBJECT désactivé si catégorie insuffisante.
8. Overlay/control : ouvrir avec tokens, vérifier les contrôles.
9. Mobile : jouer une question au clavier tactile.
10. Erreur réseau : message clair, pas d'écran blanc.

### 9.2 Règles

- Un seul worker pour les scénarios multi-joueurs.
- Serveur de test avec banque accélérée et timers courts.
- Pas de dépendance à TikTok réel.
- Capture d'écran et trace uniquement en échec.
- Retry 0 en local, 1 en CI.
- Aucun `waitForTimeout` arbitraire.

## 10. Tests de charge

### 10.1 HTTP

- 200 requêtes/s pendant 60 s sur `/api/config` et `/api/health`.
- 50 créations de session/s.
- p95 < 100 ms, p99 < 250 ms.

### 10.2 Socket

- 200 rooms × 8 joueurs = 1 600 sockets.
- 10 questions par room, réponses étalées.
- Aucun message perdu, aucun timer en double.
- Mémoire < 512 Mo.
- p95 de broadcast < 50 ms.

### 10.3 TikTok

- 100 viewers, 50 commentaires/s.
- 101e viewer ignoré, capacité stable.
- Parser < 1 ms par commentaire.
- Aucun crash, déduplication correcte.
- Backoff du connecteur.

La charge n'est pas un critère de release v1, mais un test de non-régression nocturne.

## 11. Tests de sécurité

- `pnpm audit` et Gitleaks en CI.
- Scan du bundle pour `GEMINI`, `AIza`, `ADMIN_TOKEN`.
- Injection HTML dans pseudo et article : rendu texte.
- `javascript:` dans une URL d'image : rejet.
- IDOR : token d'une room sur une autre.
- Réponse pour autrui.
- Rejeu d'un `ANSWER` après révélation.
- Rejeu d'un `CONTINUE`.
- Force brute de code de room : rate limit.
- Création massive de sessions : rate limit.
- En-têtes CSP/HSTS vérifiés.
- Cookies absents.
- Tokens absents des logs.
- Test de remplacement de session.
- Test de révocation admin.
- Test de room fermée.

## 12. Tests de données

- `data/questions.json` valide.
- 4 options uniques.
- `correctIndex` varié.
- Aucun HTML.
- URLs HTTPS et allowlist.
- Aucun doublon de `contentHash`.
- IDs uniques.
- Comptes par catégorie exacts.
- Seuil CLASSIC 200.
- Seuil SUBJECT 20.
- Import puis relecture : hash identique.
- Une question retirée disparaît de la base.
- Une question modifiée met à jour la base.

## 13. Couverture

Seuils bloquants dans `vitest.config.ts` :

```ts
coverage: {
  provider: 'v8',
  thresholds: {
    'server/game/**': { branches: 95, lines: 95, functions: 95 },
    'server/**': { branches: 80, lines: 80, functions: 80 },
    'client/**': { branches: 70, lines: 70, functions: 70 }
  }
}
```

- Les fichiers de types, migrations et scripts exclus.
- La couverture n'est pas une fin en soi : les règles critiques doivent avoir des tests explicites même si couvertes indirectement.
- Mutation testing (Stryker) sur `server/game` est optionnel, non bloquant en v1.

## 14. CI

Pipeline sur chaque PR :

1. `pnpm install --frozen-lockfile`
2. `pnpm run lint`
3. `pnpm run typecheck`
4. `pnpm run data:validate`
5. `pnpm run test:coverage`
6. `pnpm run test:integration`
7. `pnpm run build`
8. `pnpm run test:e2e` (Chromium)
9. Gitleaks
10. `pnpm audit --prod`

Nightly :

- Playwright Firefox/WebKit.
- Tests de charge.
- Scan Docker (Trivy).
- Mutation testing optionnel.

Une PR ne peut pas être mergée si lint, typecheck, tests ou build échouent.

## 15. Politique de flakiness

- Un test instable est corrigé ou supprimé, jamais ignoré silencieusement.
- `test.skip` interdit sans issue et date.
- Retry CI maximum 1 pour E2E uniquement.
- Les tests de temps utilisent une horloge injectable.
- Les tests réseau utilisent `waitFor` sur un état, pas un délai.
- Un test qui échoue 2 fois en 24 h est mis en quarantaine et assigné.

## 16. Matrice de traçabilité

| Exigence | Tests |
| --- | --- |
| Room privée complète | 5.5, 7.2, 9.1.2 |
| Matchmaking public | 5.7, 7.3-7.5 |
| Non-fuite de la réponse | 6.3, 11 |
| Score exact | 5.1-5.3 |
| Vies et élimination | 5.4, 7.8 |
| Reconnexion | 5.8, 7.6-7.7, 9.1.4 |
| Pause | 5.5, 7.10 |
| Persistance | 6.5, 7.13 |
| Leaderboard | 6.5, 9.1.6 |
| TikTok | 7.14, 10.3, 17 |
| Overlay/control | 7.15, 9.1.8 |
| Accessibilité | 8.3, 9.1.9 |
| Sécurité | 11, CI |
| Données | 12, CI |

## 17. Tests manuels TikTok

À faire sur un compte secondaire, jamais en direct :

1. Connexion du connecteur.
2. Réception d'un commentaire simple.
3. `A`, `a.`, `@user B` acceptés.
4. `AB`, `réponse A`, URL rejetés.
5. Deux réponses du même viewer : une seule comptée.
6. 100 viewers simulés.
7. Coupure réseau du connecteur : backoff visible.
8. Reprise après reconnexion.
9. Pause/reprise depuis la console.
10. Réponse manuelle.
11. Overlay dans OBS : lisibilité, timer, top 10.
12. Fin de match et classement.
13. Aucun cookie dans les logs.
14. Aucun lag supérieur à 2 s entre chat et overlay.

## 18. Definition of Done

Une fonctionnalité est terminée si :

- le comportement est spécifié ;
- les tests unitaires et d'intégration passent ;
- la couverture ne baisse pas ;
- l'accessibilité de base est vérifiée ;
- aucun secret n'est introduit ;
- la doc est à jour ;
- le comportement est identique en production et en test ;
- les cas d'erreur ont un code et un message ;
- le code est reviewé.
