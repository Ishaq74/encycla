# Encycla — Développement, déploiement et exploitation

- Version : 1.0
- Date : 2026-10-22
- Statut : procédure d'exploitation
- Sécurité : [SECURITY.md](SECURITY.md)
- Données : [DATA-MODEL.md](DATA-MODEL.md)

## 1. Prérequis

| Outil | Version |
| --- | --- |
| Node.js | 22 LTS |
| pnpm | 10.28+ |
| Git | 2.40+ |
| Docker | 24+ (optionnel) |
| Docker Compose | v2 (optionnel) |
| Navigateur | Chrome/Edge/Firefox récent |

- Système cible : Linux x86_64 en production.
- Développement supporté : Windows 10/11, macOS, Linux.
- `better-sqlite3` nécessite une compilation native si aucun binaire précompilé n'est disponible :
  - Windows : Visual Studio Build Tools + Python 3.
  - Debian/Ubuntu : `build-essential python3`.
  - Alpine : `build-base python3`.

## 2. Installation locale

```powershell
git clone <repo>
Set-Location encycla
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm run db:migrate
pnpm run data:import
pnpm run dev
```

- Client : `http://localhost:5173`
- Serveur : `http://localhost:3000`
- Le client Vite proxy `/api` et `/socket.io` vers `3000`.
- Ne jamais exposer `5173` en production.

### 2.1 Variables locales

`.env.example` :

```dotenv
NODE_ENV=development
PORT=3000
PUBLIC_ORIGIN=http://localhost:5173
DATABASE_PATH=data/encycla.db
ADMIN_TOKEN=change-me
TIKTOK_ENABLED=false
TIKTOK_USERNAME=
TIKTOK_SESSION_COOKIE=
GEMINI_API_KEY=
LOG_LEVEL=debug
```

Générer des secrets locaux :

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## 3. Scripts attendus

`package.json` doit exposer :

```json
{
  "scripts": {
    "dev": "concurrently -k -n client,server \"vite\" \"tsx watch server/index.ts\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite",
    "build": "pnpm run build:client && pnpm run build:server",
    "build:client": "vite build",
    "build:server": "tsc -p tsconfig.server.json",
    "start": "node dist/server/index.js",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "tsc -b --pretty false",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:load": "tsx scripts/load-test.ts",
    "db:migrate": "tsx server/db/migrate.ts",
    "data:validate": "tsx scripts/validate-questions.ts",
    "data:import": "tsx scripts/import-questions.ts",
    "data:extract": "tsx scripts/extract-legacy-questions.ts",
    "content:generate": "tsx scripts/generate-questions.ts"
  }
}
```

`pnpm-lock.yaml` doit être commité. Toute modification ultérieure doit être intentionnelle et revue.

## 4. Développement

### 4.1 Ordre de démarrage

1. `db:migrate` crée les tables.
2. `data:import` charge les questions approuvées.
3. Le serveur démarre et vérifie :
   - la version des migrations ;
   - `PRAGMA quick_check` ;
   - le nombre de questions ;
   - les seuils CLASSIC/SUBJECT ;
   - la présence des variables obligatoires.
4. Vite démarre et proxy vers `3000`.

### 4.2 Rechargement

- Serveur : `tsx watch`, redémarrage à chaque changement.
- Client : HMR Vite.
- Un redémarrage serveur perd les rooms ; les clients doivent retourner au menu.
- En développement, si SQLite est absent ou corrompu, le serveur bascule automatiquement en mode dégradé et le jeu reste jouable.

### 4.3 Base de développement

- Chemin par défaut : `data/encycla.db`.
- Réinitialiser :

```powershell
Remove-Item data/encycla.db, data/encycla.db-wal, data/encycla.db-shm -ErrorAction SilentlyContinue
pnpm run db:migrate
pnpm run data:import
```

Ne jamais lancer cette commande en production.

## 5. Build

```powershell
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run data:validate
pnpm run test:coverage
pnpm run build
```

Sorties :

- `dist/client/` : assets statiques Vite.
- `dist/server/` : JavaScript compilé du serveur.
- `dist/shared/` : types et schémas partagés.

Le serveur Express sert `dist/client` en production. Les assets hashés ont un cache `immutable` d'un an ; `index.html` est `no-cache`.

## 6. Production

### 6.1 Configuration

```dotenv
NODE_ENV=production
PORT=3000
PUBLIC_ORIGIN=https://encycla.example.com
DATABASE_PATH=/var/lib/encycla/encycla.db
ADMIN_TOKEN=<32 bytes base64url>
TIKTOK_ENABLED=true
TIKTOK_USERNAME=<compte>
TIKTOK_SESSION_COOKIE=<cookie>
GEMINI_API_KEY=
LOG_LEVEL=info
```

- `PUBLIC_ORIGIN` doit correspondre exactement au domaine public, sans slash final.
- `ADMIN_TOKEN` est obligatoire en production ; le serveur refuse de démarrer sinon.
- Les IP ne sont jamais persistées ; seul le rate limiting en mémoire les utilise.
- `GEMINI_API_KEY` n'est pas nécessaire au runtime ; ne pas la monter dans le conteneur de jeu.
- `TIKTOK_SESSION_COOKIE` est obligatoire si `TIKTOK_ENABLED=true`.

### 6.2 Démarrage

```bash
node dist/server/index.js
```

Le serveur :

1. charge l'environnement ;
2. valide les variables ;
3. ouvre SQLite, ou bascule en mode dégradé si la base est indisponible/corrompue ;
4. applique les migrations en attente ;
5. marque les matchs `in_progress` comme `abandoned` ;
6. synchronise `data/questions.json` vers `questions` ;
7. vérifie la banque de questions ;
8. écoute sur `PORT` ;
9. démarre le nettoyage des sessions ;
10. connecte TikTok si activé.

En mode dégradé, les étapes 4 à 6 sont ignorées : les questions viennent de `data/questions.json` et les sessions/scores restent en mémoire. Une migration échouée est fail-fast : arrêt du serveur, pas de mode dégradé.

### 6.3 Reverse proxy

Le serveur ne termine pas TLS en production. Utiliser Caddy ou Nginx.

#### Caddy

```caddy
encycla.example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000 {
    header_up X-Forwarded-For {remote_host}
    header_up X-Forwarded-Proto {scheme}
  }
}
```

Caddy gère TLS et HTTP/2. Vérifier que les WebSockets passent (Caddy le fait par défaut).

#### Nginx

```nginx
server {
  listen 443 ssl http2;
  server_name encycla.example.com;

  ssl_certificate     /etc/letsencrypt/live/encycla.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/encycla.example.com/privkey.pem;

  client_max_body_size 16k;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 75s;
  }
}
```

- `proxy_read_timeout` doit dépasser le ping Socket.io (25 s).
- Ne pas mettre de cache sur `/socket.io`, `/api` ou `index.html`.
- Les assets `/assets/*` peuvent être cachés.

### 6.4 `trust proxy`

- Derrière un seul reverse proxy : `app.set('trust proxy', 1)`.
- Ne jamais utiliser `true` sans contrôle : cela permettrait de falsifier l'IP et de contourner le rate limit.

## 7. Docker

### 7.1 Dockerfile

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ && corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm run build
RUN pnpm prune --prod

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S encycla && adduser -S encycla -G encycla
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/data/questions.json ./data/questions.json
COPY --from=build /app/server/db/migrations ./server/db/migrations
RUN mkdir -p /app/data && chown -R encycla:encycla /app
USER encycla
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server/index.js"]
```

- Image de base épinglée par digest en production.
- Pas de gestionnaire de paquets dans le runtime.
- Pas de secrets dans l'image.
- `better-sqlite3` doit être compilé dans `deps` et copié dans le runtime.

### 7.2 Compose

```yaml
services:
  encycla:
    build: .
    restart: unless-stopped
    env_file: .env
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - encycla-data:/app/data
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  encycla-data:
```

- Le volume `encycla-data` contient SQLite.
- `read_only` est compatible avec le volume `data`.
- Ne pas publier `3000` sur `0.0.0.0` si un reverse proxy local est utilisé.

### 7.3 Migrations dans Docker

Le serveur applique les migrations au démarrage. Pour un contrôle explicite :

```bash
docker compose run --rm encycla node dist/server/db/migrate.js
```

L'import manuel reste disponible, même si le serveur synchronise aussi `questions.json` au démarrage :

```bash
docker compose run --rm encycla node dist/scripts/import-questions.js
```

## 8. Procédure de déploiement

### 8.1 Avant

1. Vérifier la CI verte.
2. Sauvegarder la base.
3. Vérifier l'espace disque.
4. Annoncer la maintenance si des rooms sont actives.

### 8.2 Étapes

```bash
git fetch --tags
git checkout <tag>
pnpm install --frozen-lockfile
pnpm run data:validate
pnpm run build
pnpm run db:migrate
pnpm run data:import
systemctl restart encycla
```

Ou avec Docker :

```bash
docker compose build
docker compose run --rm encycla node dist/scripts/import-questions.js
docker compose up -d
```

### 8.3 Après

1. `GET /api/health` retourne `ok`.
2. `GET /api/config` retourne les catégories et le `protocolVersion`.
3. Créer une room de smoke test et jouer une question.
4. Vérifier les logs : aucune erreur 5xx, aucun secret.
5. Vérifier le leaderboard.
6. Vérifier l'overlay TikTok si activé.

### 8.4 Continuité

- Une instance unique ne permet pas de zéro downtime.
- Un redémarrage perd les rooms en mémoire.
- Les matchs en cours deviennent `abandoned`.
- Les joueurs doivent revenir au menu.
- Prévenir avant un déploiement en heure de pointe.
- Ne pas déployer pendant un live TikTok.

## 9. Rollback

1. Arrêter le service.
2. Redéployer l'image/tag précédent.
3. Si la migration est incompatible, restaurer la sauvegarde.
4. Redémarrer.
5. Vérifier `/api/health`.
6. Vérifier le leaderboard.

Les migrations sont forward-only. Un rollback de code sans rollback de base n'est autorisé que si la migration est additive.

## 10. Sauvegardes

### 10.1 Création

```bash
sqlite3 /var/lib/encycla/encycla.db "VACUUM INTO '/backups/encycla-$(date +%F-%H%M).db';"
```

Ou via un script Node avec `better-sqlite3` :

```ts
db.prepare("VACUUM INTO ?").run(path);
```

- Ne jamais copier le fichier `.db` à chaud sans checkpoint.
- Fréquence : quotidienne.
- Rétention : 7 jours minimum, 30 jours recommandé.
- Stockage hors du serveur.
- Chiffrement au repos si le stockage est partagé.

### 10.2 Restauration

1. Arrêter le service.
2. Copier la sauvegarde vers `DATABASE_PATH`.
3. Supprimer `-wal` et `-shm` résiduels.
4. Démarrer.
5. `PRAGMA integrity_check`.
6. Vérifier le leaderboard.
7. Tester une room.

### 10.3 Test de restauration

- Une fois par mois.
- Sur un environnement séparé.
- Vérifier les comptes de matchs et de scores.
- Documenter la date et le résultat.

## 11. Supervision

### 11.1 Healthcheck

`GET /api/health` :

- `200 ok` : tout va bien.
- `503 error` : questions manquantes ou démarrage incomplet hors mode dégradé.
- DB inaccessible/corrompue : `200` avec `status: "degraded"`, `db: "disabled"`, jeu jouable.
- `degraded` (200) : DB désactivée, TikTok activé mais déconnecté, ou banque sous le seuil.

### 11.2 Logs

- JSON sur stdout.
- Collecte par le superviseur (Docker, systemd, Loki).
- Redaction des tokens.
- Rotation si fichier.
- Rétention 30 jours.

### 11.3 Métriques

- Rooms actives.
- Sockets connectés.
- Matchs terminés.
- Latence HTTP.
- Erreurs par code.
- Reconnexions et abandons.
- TikTok connecté/déconnecté.
- Taille de la base.

### 11.4 Alertes

| Alerte | Seuil |
| --- | --- |
| Erreurs 5xx | > 1 % sur 5 min |
| DB | healthcheck échoue 2 fois |
| Rooms | 0 room avec sockets > 50 |
| TikTok | déconnecté > 5 min |
| Mémoire | > 450 Mo |
| Disque | < 10 % libre |
| Latence | p95 > 250 ms sur 5 min |

## 12. Exploitation TikTok

### 12.1 Compte

- Compte dédié au jeu.
- Session TikTok valide.
- Cookie stocké comme secret.
- Ne jamais utiliser le compte principal de l'opérateur.
- Vérifier les conditions d'utilisation TikTok.

### 12.2 Création d'une room

```bash
curl -X POST https://encycla.example.com/api/tiktok/rooms \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"CLASSIC","timerMs":15000}'
```

Réponse :

```json
{
  "roomCode": "T9X4P2",
  "overlayToken": "ovl_...",
  "controlToken": "ctl_..."
}
```

### 12.3 OBS

- Browser Source : `https://encycla.example.com/?mode=overlay&room=T9X4P2#token=ovl_...`
- Résolution : 1920×1080.
- Pas de son dans OBS par défaut.
- CSS transparent.
- Rafraîchir la source en cas de perte.

### 12.4 Console

- `https://encycla.example.com/?mode=control&room=T9X4P2#token=ctl_...`
- Ne pas partager ce lien.
- Ne pas afficher la console à l'antenne.
- Fermer la room après le live.

### 12.5 Incident connecteur

1. La room se met en pause au prochain point sûr.
2. L'overlay affiche « Chat reconnecting… ».
3. Le connecteur retente avec backoff.
4. Si le chat ne revient pas : utiliser la réponse manuelle.
5. Si le live doit continuer : ne pas redémarrer le serveur.

## 13. Runbook

### 13.1 Room bloquée

1. Vérifier la phase via `/api/health` et les logs.
2. Si le host est déconnecté, attendre le transfert ou utiliser l'admin.
3. `POST /api/admin/rooms/:code/close`.
4. Vérifier que le match est `abandoned`.

### 13.2 Base verrouillée

1. Vérifier `busy_timeout`.
2. Vérifier qu'aucun script d'import ne tourne.
3. Redémarrer le service.
4. Si la base reste indisponible, le serveur bascule en mode dégradé : le jeu continue, le leaderboard renvoie `PERSISTENCE_DISABLED`.
5. `PRAGMA integrity_check` dès que la base est de nouveau accessible.

### 13.3 Mémoire élevée

1. Vérifier le nombre de rooms/sockets.
2. Fermer les rooms inactives.
3. Redémarrer hors heures de pointe.
4. Réduire la limite de rooms.

### 13.4 Questions manquantes

1. `pnpm run data:validate`.
2. Vérifier `data/questions.json`.
3. `pnpm run data:import`.
4. Redémarrer.
5. `/api/health` doit repasser `ok`.

### 13.5 Session perdue

1. Le joueur se reconnecte.
2. Si le token est expiré : nouvelle session.
3. Si la room est perdue : retour au menu.
4. Ne jamais réutiliser un token d'un autre joueur.

### 13.6 Dérive d'horloge

- Le serveur est l'horloge autoritaire.
- Vérifier NTP sur l'hôte.
- Une dérive > 1 s peut fausser les timers.
- Redémarrer le service après correction.

## 14. Limites et scaling

- Une instance Node.
- SQLite local.
- Rooms en mémoire.
- 200 rooms simultanées.
- 5 000 sockets.
- 100 viewers TikTok par room.
- Pas de scaling horizontal en v1.
- Pour scaler : extraire les rooms dans Redis, passer à PostgreSQL, ajouter un load balancer sticky, puis réévaluer le protocole.
- Le scaling horizontal est un projet distinct, pas une option de configuration.

## 15. Checklist de release

- [ ] `pnpm-lock.yaml` présent et commité.
- [ ] `pnpm install --frozen-lockfile` reproductible.
- [ ] Lint, typecheck, tests, build verts.
- [ ] `data:validate` vert.
- [ ] Migrations testées sur une copie de production.
- [ ] Sauvegarde récente.
- [ ] Variables de production présentes.
- [ ] TLS et HSTS actifs.
- [ ] CSP vérifiée.
- [ ] Aucun secret dans l'image.
- [ ] Conteneur non-root.
- [ ] Healthcheck configuré.
- [ ] Mode dégradé SQLite testé (jeu jouable, leaderboard 503).
- [ ] Reverse proxy WebSocket OK.
- [ ] Smoke test room privée.
- [ ] Smoke test overlay/control si TikTok.
- [ ] Logs sans token.
- [ ] Plan de rollback connu.
- [ ] Monitoring et alertes actifs.
