# Encycla

**The visual encyclopedia game.** Identify the subject, answer before the timer, and read the story behind the image.

Encycla est un quiz visuel multijoueur en temps réel : solo, rooms privées, matchmaking public et live TikTok. La spécification est gelée et l'implémentation a démarré ; le dépôt contient encore le prototype client v1, qui ne doit pas être considéré comme l'implémentation cible.

- **Produit** : Encycla
- **Jeu** : Encycla MindMaze
- **Langue de l'UI** : anglais
- **Langue de la documentation** : français
- **Statut** : documentation d'architecture gelée, implémentation en cours (phases 0 à 3 en place : outillage, données, moteur de jeu)
- **Gel de la documentation** : 2026-10-23
- **Version documentaire** : 2.0
- **Date** : 2026-10-22

## Sommaire

- [Pourquoi ce projet](#pourquoi-ce-projet)
- [Modes de jeu](#modes-de-jeu)
- [Architecture en un coup d'œil](#architecture-en-un-coup-dœil)
- [Documentation](#documentation)
- [État du dépôt](#état-du-dépôt)
- [Démarrage cible](#démarrage-cible)
- [Structure cible](#structure-cible)
- [Configuration](#configuration)
- [Qualité et sécurité](#qualité-et-sécurité)
- [Déploiement](#déploiement)
- [Contenu](#contenu)
- [Non-objectifs v1](#non-objectifs-v1)
- [Feuille de route](#feuille-de-route)
- [Contribuer](#contribuer)
- [Licence et crédits](#licence-et-crédits)

## Pourquoi ce projet

Le prototype initial concentre toutes les règles dans un composant React : score, vies, timer, progression, gagnant. Cette architecture ne peut pas garantir l'équité, la reconnexion, l'anti-triche ou le multi-joueurs.

Encycla v2 applique quatre principes :

1. **Le serveur est la seule source de vérité.** Le client émet des intentions et affiche des snapshots.
2. **Toute partie est une room.** Le solo est une room à un joueur ; le duel CONTEST est une room à deux.
3. **Chaque règle est déterministe et testable.** Le moteur est un réducteur pur, avec horloge, aléatoire et banque de questions injectés.
4. **Aucun secret ni réponse dans le client.** La bonne réponse n'est diffusée qu'à la phase `REVEAL`.

## Modes de jeu

| | CLASSIC | SUBJECT | CONTEST |
| --- | --- | --- | --- |
| Niveaux | 10 | 1 | 1 |
| Questions | 20 par niveau | 20 | 10 |
| Joueurs | 1-8 web, 0 au départ puis jusqu'à 100 TikTok | 1-8 web, 0 au départ puis jusqu'à 100 TikTok | exactement 2 |
| Catégories | toutes | une catégorie fixe | toutes |
| Vies | 3 | 3 | aucune |
| Difficulté | progressive | choisie | Adventurer |
| Article | après chaque question | après chaque question | après chaque question |

- **Solo** : campagne CLASSIC ou SUBJECT, vies rechargées à chaque niveau.
- **Room privée** : code à 6 caractères, 2 à 8 joueurs, démarrage par le host.
- **Room publique** : matchmaking par mode, catégorie et difficulté ; small room après 2 minutes.
- **TikTok** : les viewers répondent `A`, `B`, `C` ou `D` dans le chat ; overlay OBS et console host.
- Une fin naturelle affiche l'article final avant le classement ; une fin anticipée web/solo (élimination, moins de 2 actifs) passe directement de `REVEAL` à `MATCH_OVER`. Une room TikTok ne s'arrête pas sur `< 2` actifs.

## Architecture en un coup d'œil

```text
Navigateur joueur ─┐
Overlay OBS ───────┼── HTTP / Socket.io ──► Express + Socket.io
Console host ──────┘                              │
                                                  ▼
                                         RoomManager (mémoire)
                                                  │
                                                  ▼
                                         Moteur pur (reduce/tick)
                                                  │
                        ┌─────────────────────────┼─────────────────────┐
                        ▼                         ▼                     ▼
                   SQLite (scores)          JSON (questions)      TikTok adapter
```

- **HTTP** : sessions, rooms, file, leaderboard, santé, administration.
- **Socket.io** : entrée de room, ready, start, réponses, continuation, pause, votes, snapshots.
- **SQLite** : sessions, matchs, scores, questions approuvées ; fallback mémoire si indisponible.
- **Moteur** : aucune I/O, aucun accès réseau, aucune dépendance au transport.
- **Client** : React + Zustand, aucune règle de jeu.

## Documentation

La documentation est la référence d'implémentation. Aucune décision ouverte n'est laissée au développeur.

| Document | Contenu |
| --- | --- |
| [docs/ADR.md](docs/ADR.md) | 18 décisions d'architecture binding. |
| [docs/DECISIONS.md](docs/DECISIONS.md) | 78 décisions explicites et dettes assumées. |
| [docs/SPECIFICATION.md](docs/SPECIFICATION.md) | Règles, modes, phases, scores, matchmaking, TikTok. |
| [docs/PROTOCOL.md](docs/PROTOCOL.md) | Contrat HTTP, Socket.io, payloads, erreurs. |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Schéma SQLite, JSON des questions, leaderboard. |
| [docs/SECURITY.md](docs/SECURITY.md) | Menace, authentification, CSP, secrets, vie privée. |
| [docs/TESTING.md](docs/TESTING.md) | Pyramide, cas obligatoires, couverture, CI. |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Local, Docker, TLS, migrations, runbook. |
| [docs/UI-UX.md](docs/UI-UX.md) | Écrans, tokens, accessibilité, overlay, control. |
| [docs/IMPLEMENTATION-PLAN.md](docs/IMPLEMENTATION-PLAN.md) | Phases, dépendances, estimation, critères de sortie. |

Ordre de lecture recommandé :

1. ce README ;
2. `ADR.md` puis `DECISIONS.md` ;
3. `SPECIFICATION.md` ;
4. `PROTOCOL.md` et `DATA-MODEL.md` ;
5. `SECURITY.md`, `TESTING.md`, `UI-UX.md` ;
6. `IMPLEMENTATION-PLAN.md` et `DEPLOYMENT.md`.

## État du dépôt

La documentation est gelée ; les phases 0 à 3 sont en place côté outillage, données et moteur :

- `vite.config.ts` n'expose plus `GEMINI_API_KEY` et `@google/genai` a été retiré du runtime ;
- Tailwind est compilé localement ; plus aucun CDN, importmap ni Google Fonts ;
- pnpm est le gestionnaire de paquets du dépôt ; `pnpm-lock.yaml` est présent et à jour ;
- `pnpm install --frozen-lockfile`, `pnpm run lint`, `pnpm run typecheck`, `pnpm test` et `pnpm run build` passent ;
- la CI vérifie les secrets, le lint, les types, les données, les tests et le build ;
- un serveur Express minimal expose `/api/health` et le proxy Vite est en place ;
- `data/questions.json` contient 244 questions legacy uniques, validées par `pnpm run data:validate` ;
- `scripts/extract-legacy-questions.ts`, `scripts/validate-questions.ts` et `scripts/import-questions.ts` sont en place ; l'import SQLite est atomique et testé ;
- `server/game` fournit un moteur pur (reducer + tick, effets injectables), le scoring, la state machine et la sélection des questions ; `pnpm test` couvre 86 tests ;
- 234 articles restent sous la cible éditoriale de 200 caractères et les licences d'images legacy restent à revoir.

Le dépôt contient encore le prototype v1 côté client :

- `components/EncyclaGame.tsx` calcule le jeu côté client ;
- `services/geminiService.ts` reste la source d'extraction legacy ;
- `components/ArticleViewer.tsx` utilise `dangerouslySetInnerHTML` ;
- le serveur Express et le harnais Vitest sont en place, mais la persistance SQLite, l'orchestration Socket.io et le client cible restent à écrire.

Ces points sont traités dans les phases 4 à 6 de `IMPLEMENTATION-PLAN.md`. Tant que l'implémentation n'est pas terminée, le prototype ne doit pas être déployé publiquement.

## Démarrage cible

Prérequis : Node.js 22 et pnpm 10.28 (ou `corepack enable`). Après les phases 0 à 5 :

```bash
git clone <repo>
cd encycla
pnpm install --frozen-lockfile
cp .env.example .env
pnpm run db:migrate
pnpm run data:import
pnpm run dev
```

- Client : `http://localhost:5173`
- Serveur : `http://localhost:3000`
- Le client Vite proxy `/api` et `/socket.io` vers le serveur.

### Prototype actuel

Le prototype se lance encore avec :

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

Il ne représente pas l'architecture cible. Ne pas l'utiliser comme base de déploiement.

## Structure cible

```text
client/          React, Zustand, vues, styles, assets
server/          Express, Socket.io, moteur, rooms, persistance, TikTok
shared/          types, schémas Zod, constantes, protocole
data/            questions.json, base SQLite non versionnée
scripts/         extraction, validation, import, génération de contenu, charge
tests/           unitaires, intégration, e2e, fixtures
docs/            documentation de référence
```

Détail complet dans [docs/IMPLEMENTATION-PLAN.md](docs/IMPLEMENTATION-PLAN.md).

## Configuration

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `NODE_ENV` | `development` | Environnement. |
| `PORT` | `3000` | Port HTTP/Socket.io. |
| `PUBLIC_ORIGIN` | — | Origin public en production. |
| `DATABASE_PATH` | `data/encycla.db` | Base SQLite. |
| `ADMIN_TOKEN` | — | Routes admin et création TikTok. |
| `TIKTOK_ENABLED` | `false` | Active le connecteur. |
| `TIKTOK_USERNAME` | — | Compte TikTok du live. |
| `TIKTOK_SESSION_COOKIE` | — | Cookie de session TikTok. |
| `GEMINI_API_KEY` | — | Scripts de contenu hors ligne uniquement. |
| `LOG_LEVEL` | `info` | Verbosité des logs. |

Règles :

- `.env` n'est jamais commité.
- Aucune variable secrète n'est préfixée `VITE_`.
- `GEMINI_API_KEY` n'est jamais montée dans le runtime de jeu.
- `TIKTOK_USERNAME` et `TIKTOK_SESSION_COOKIE` sont obligatoires si `TIKTOK_ENABLED=true`.
- Le serveur refuse de démarrer en production sans `ADMIN_TOKEN` et `PUBLIC_ORIGIN`.

## Qualité et sécurité

### Qualité

- TypeScript strict.
- ESLint + Prettier.
- Vitest pour le moteur, le serveur et le client.
- Playwright pour les parcours multi-joueurs.
- Couverture minimale : 95 % branches sur `server/game`, 80 % sur `server`, 70 % sur `client`.
- CI : lint, typecheck, données, tests, build, e2e, audit, secrets.

### Sécurité

- Aucun secret dans le bundle client.
- Tokens de session hachés en base.
- Tokens overlay/control scoped à une room, dans le fragment d'URL.
- CSP stricte, pas de `unsafe-inline`, pas de `unsafe-eval`.
- Aucun `dangerouslySetInnerHTML`.
- Validation Zod de toutes les entrées.
- Rate limiting HTTP et Socket.io.
- La bonne réponse n'est jamais envoyée avant `REVEAL`.
- Images limitées à une allowlist HTTPS.

Détail dans [docs/SECURITY.md](docs/SECURITY.md).

## Déploiement

- Une seule instance Node et SQLite local en v1.
- Docker multi-stage, runtime non-root.
- Reverse proxy TLS (Caddy ou Nginx).
- Migrations et synchronisation JSON → SQLite au démarrage ; `pnpm run data:import` reste disponible pour un import manuel.
- Sauvegarde SQLite par `VACUUM INTO`.
- Un redémarrage perd les rooms ; les matchs en cours deviennent `abandoned`.

Procédure complète dans [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Contenu

- La banque actuelle contient **244 questions uniques**.
- CLASSIC nécessite **200 questions approuvées**.
- SUBJECT nécessite **20 questions par catégorie** ; les catégories actuelles en contiennent 12 à 16.
- En conséquence, SUBJECT est désactivé par catégorie tant que le seuil n'est pas atteint.
- La bonne réponse est en position B dans 155 cas sur 257 : les options sont mélangées à chaque tirage.
- Les articles sont du texte brut, sans HTML.
- Les images sont des URLs Wikimedia créditées.
- Aucune génération Gemini au runtime ; la génération est hors ligne, avec revue humaine.

Voir [docs/DATA-MODEL.md](docs/DATA-MODEL.md).

## Non-objectifs v1

- Multi-instance et scaling horizontal.
- Mode hors-ligne.
- Génération Gemini en direct.
- Comptes email/mot de passe.
- Matchmaking classé ou ELO.
- Chat entre joueurs.
- Modération du contenu TikTok.
- Replay, historique de partie, rematch.
- Spectateurs web.
- Upload d'avatar.

## Feuille de route

| Phase | Contenu |
| --- | --- |
| 0 | Assainissement, lockfile, secrets, CI minimale. |
| 1 | TypeScript strict, lint, tests, build serveur/client. |
| 2 | Extraction, validation et import des questions. |
| 3 | Moteur pur, scoring, state machine, tests. |
| 4 | SQLite, sessions, identité, persistance. |
| 5 | HTTP, Socket.io, rooms, orchestration. |
| 6 | Client joueur, vues, accessibilité, sons. |
| 7 | Matchmaking public et small rooms. |
| 8 | TikTok, overlay, control. |
| 9 | Durcissement sécurité, charge, a11y. |
| 10 | Extension du contenu SUBJECT. |
| 11 | Release et live test. |

Détail et estimation dans [docs/IMPLEMENTATION-PLAN.md](docs/IMPLEMENTATION-PLAN.md).

## Contribuer

- Lire les documents de référence avant toute modification.
- Ne jamais implémenter une règle dans le client.
- Ne jamais ajouter une dépendance sans vérifier qu'elle existe déjà ou justifier son ajout.
- Ajouter ou mettre à jour un test pour chaque comportement.
- Ne jamais commiter de secret.
- Ne jamais utiliser de CDN pour les polices, le JS ou le CSS ; les images éditoriales suivent l'allowlist CSP.
- Ne jamais utiliser `dangerouslySetInnerHTML`.
- Ne jamais écrire de HTML dans les articles.
- Ne jamais introduire de décision produit implicite : mettre à jour `DECISIONS.md` et `ADR.md`.

## Licence et crédits

- Code : licence à définir avant publication.
- Questions et articles : contenu original, à relire et créditer.
- Images : Wikimedia Commons, crédit et licence affichés par question.
- Polices : Merriweather et Inter, SIL Open Font License.
- Sons : fichiers originaux ou CC0, crédités dans `client/assets/sounds/CREDITS.md`.
