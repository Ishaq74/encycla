# Encycla — Plan d'implémentation

- Version : 1.0
- Date : 2026-10-22
- Statut : plan d'exécution
- Spécification : [SPECIFICATION.md](SPECIFICATION.md)
- Protocole : [PROTOCOL.md](PROTOCOL.md)
- Tests : [TESTING.md](TESTING.md)

## 1. Principe directeur

L'ordre d'implémentation suit la dépendance réelle des composants :

```text
docs → outillage → données → moteur → persistance → serveur → client → temps réel
     → matchmaking → TikTok/overlay → durcissement → contenu → release
```

Le moteur est écrit et testé avant tout transport. Le client est construit contre des snapshots fixtures avant l'intégration socket. Aucun composant React ne contient de règle de jeu.

## 2. Arborescence cible

```text
encycla/
├── client/
│   ├── main.tsx
│   ├── App.tsx
│   ├── assets/
│   │   ├── fonts/
│   │   ├── images/
│   │   └── sounds/
│   ├── components/
│   │   ├── ui/
│   │   ├── game/
│   │   └── layout/
│   ├── views/
│   │   ├── HomeView.tsx
│   │   ├── LobbyView.tsx
│   │   ├── MatchmakingView.tsx
│   │   ├── CountdownView.tsx
│   │   ├── QuestionView.tsx
│   │   ├── RevealView.tsx
│   │   ├── ArticleView.tsx
│   │   ├── LevelCompleteView.tsx
│   │   ├── ResultsView.tsx
│   │   ├── LeaderboardView.tsx
│   │   ├── OverlayView.tsx
│   │   └── ControlView.tsx
│   ├── store/
│   │   ├── gameStore.ts
│   │   ├── sessionStore.ts
│   │   └── uiStore.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── socket.ts
│   │   ├── clock.ts
│   │   ├── audio.ts
│   │   └── format.ts
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── animations.css
│   │   └── globals.css
│   └── i18n/
│       └── en.ts
├── server/
│   ├── index.ts
│   ├── app.ts
│   ├── config.ts
│   ├── http/
│   │   ├── sessions.ts
│   │   ├── rooms.ts
│   │   ├── queue.ts
│   │   ├── leaderboard.ts
│   │   ├── config.ts
│   │   ├── health.ts
│   │   ├── admin.ts
│   │   └── tiktok.ts
│   ├── realtime/
│   │   ├── gateway.ts
│   │   ├── auth.ts
│   │   ├── handlers.ts
│   │   └── emitter.ts
│   ├── game/
│   │   ├── engine.ts
│   │   ├── state-machine.ts
│   │   ├── scoring.ts
│   │   ├── questions.ts
│   │   ├── effects.ts
│   │   ├── events.ts
│   │   └── types.ts
│   ├── rooms/
│   │   ├── RoomManager.ts
│   │   ├── RoomRuntime.ts
│   │   └── scheduler.ts
│   ├── matchmaking/
│   │   ├── QueueManager.ts
│   │   └── smallRoom.ts
│   ├── persistence/
│   │   ├── db.ts
│   │   ├── migrate.ts
│   │   ├── repositories.ts
│   │   ├── sqlite/
│   │   └── memory/
│   ├── tiktok/
│   │   ├── adapter.ts
│   │   ├── connector.ts
│   │   ├── parser.ts
│   │   └── fakeAdapter.ts
│   ├── security/
│   │   ├── tokens.ts
│   │   ├── rateLimit.ts
│   │   └── headers.ts
│   └── util/
│       ├── logger.ts
│       ├── ids.ts
│       └── clock.ts
├── shared/
│   ├── types.ts
│   ├── schemas.ts
│   ├── constants.ts
│   └── protocol.ts
├── data/
│   └── questions.json
├── scripts/
│   ├── extract-legacy-questions.ts
│   ├── validate-questions.ts
│   ├── import-questions.ts
│   ├── generate-questions.ts
│   └── load-test.ts
├── tests/
│   ├── engine/
│   ├── server/
│   ├── integration/
│   ├── client/
│   ├── e2e/
│   └── fixtures/
├── docs/
├── Dockerfile
├── docker-compose.yml
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.client.json
├── tsconfig.server.json
├── vite.config.ts
└── vitest.config.ts
```

### 2.1 Fichiers à remplacer ou supprimer

| Fichier | Action |
| --- | --- |
| `components/EncyclaGame.tsx` | Supprimer après migration des règles. |
| `components/ArticleViewer.tsx` | Remplacer par `client/components/game/ArticleBody.tsx`. |
| `components/EncyclopediaHome.tsx` | Remplacer par `HomeView`. |
| `components/RetroWindow.tsx` | Supprimer ou réutiliser comme `Panel` accessible. |
| `components/RetroButton.tsx` | Remplacer par `Button`. |
| `services/geminiService.ts` | Extraire les questions, puis supprimer du runtime. |
| `types.ts` | Déplacer vers `shared/types.ts`. |
| `constants.ts` | Déplacer vers `shared/constants.ts`. |
| `vite.config.ts` | Retirer `GEMINI_API_KEY`, ajouter le proxy. |
| `index.html` | Retirer Tailwind CDN, importmap, Google Fonts. |
| `package.json` | Ajouter scripts, dépendances serveur/test, retirer `@google/genai` du runtime. |
| `tsconfig.json` | Séparer client/serveur, activer `strict`. |
| `pnpm-lock.yaml` | Vérifier et commiter ; généré avec pnpm. |

## 3. Contrats d'architecture

### 3.1 Moteur

```ts
interface EngineDeps {
  now: () => number;
  random: () => number;
  idFactory: () => string;
  questions: QuestionProvider;
  logger: Logger;
}

type ReduceResult = {
  state: GameState;
  effects: EngineEffect[];
};

function reduce(
  state: GameState,
  event: GameEvent,
  deps: EngineDeps
): ReduceResult;

function tick(
  state: GameState,
  now: number,
  deps: EngineDeps
): ReduceResult;
```

Effets en données uniquement :

```ts
type EngineEffect =
  | { type: 'BROADCAST_STATE'; roomCode: string }
  | { type: 'EMIT_PLAYER_LOCKED'; roomCode: string; playerId: string; questionId: string }
  | { type: 'SCHEDULE_PHASE'; roomCode: string; at: number }
  | { type: 'CANCEL_SCHEDULE'; roomCode: string }
  | { type: 'PERSIST_MATCH_STARTED'; match: MatchRecord; players: ScoreRecord[] }
  | { type: 'PERSIST_SCORES'; roomCode: string; scores: ScoreRecord[] }
  | { type: 'PERSIST_MATCH_COMPLETED'; matchId: string; results: FinalResult[] }
  | { type: 'PERSIST_MATCH_ABANDONED'; matchId: string }
  | { type: 'EMIT_ROOM_CLOSED'; roomCode: string; reason: string }
  | { type: 'LOG'; level: LogLevel; event: string; data?: Record<string, unknown> };
```

Règles :

- Aucun import de `socket.io`, `express`, `better-sqlite3` ou `fetch` dans `server/game`.
- Aucun `Date.now`, `Math.random`, `crypto` direct.
- `reduce` ne mute pas `state` ; il retourne un nouvel objet.
- Les effets sont appliqués par `RoomManager`.
- Une transition illégale retourne `state` inchangé et un effet `LOG`/erreur.

### 3.2 RoomManager

Responsabilités :

- créer/détruire les rooms ;
- indexer par code et par joueur ;
- appliquer les effets ;
- armer les timers ;
- router les événements ;
- diffuser les snapshots ;
- persister via repositories ;
- exposer l'état aux gateways.

Interdictions :

- aucune règle de score ;
- aucune décision de phase ;
- aucun accès direct aux sockets depuis le moteur.

### 3.3 Repositories

```ts
interface PlayerRepository {
  create(player: NewPlayer): PlayerRecord;
  findById(id: string): PlayerRecord | null;
  findByProviderExternal(provider: string, externalId: string): PlayerRecord | null;
  updatePseudo(id: string, pseudo: string, normalized: string): void;
}

interface SessionRepository {
  create(session: NewSession): void;
  findByTokenHash(hash: string): SessionRecord | null;
  delete(id: string): void;
  deleteExpired(now: number): number;
  touch(id: string, now: number): void;
}

interface MatchRepository {
  create(match: MatchRecord, scores: ScoreRecord[]): void;
  updateScores(matchId: string, scores: ScoreRecord[]): void;
  complete(matchId: string, results: FinalResult[], endedAt: number): void;
  abandonInProgress(now: number): number;
  leaderboard(filter: LeaderboardFilter): LeaderboardEntry[];
}

interface QuestionRepository {
  listApproved(): QuestionRecord[];
  replaceAll(questions: QuestionRecord[]): void;
}
```

Deux implémentations :

- `sqlite/*` : `better-sqlite3`.
- `memory/*` : fallback si SQLite indisponible, et tests.

### 3.4 Frontière client

- `sessionStore` : token, player, statut de connexion.
- `gameStore` : `room`, `queue`, `lastError`, `clockOffset`.
- `uiStore` : son, reduced motion, modal, focus.
- `api.ts` : HTTP uniquement.
- `socket.ts` : Socket.io uniquement.
- Les vues lisent le store et envoient des intentions.
- Aucun calcul de score, vie, timer ou gagnant.

## 4. Phases

### Phase 0 — Gel documentaire et assainissement (1-2 jours)

Objectif : partir d'une base saine et reproductible.

Tâches :

1. Relire et geler l'ensemble de `docs/` : `ADR.md`, `DECISIONS.md`, `SPECIFICATION.md`, `PROTOCOL.md`, `DATA-MODEL.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, `UI-UX.md`, `IMPLEMENTATION-PLAN.md`.
2. Vérifier que `pnpm-lock.yaml` est présent, propre et commité.
3. Retirer `GEMINI_API_KEY` de `vite.config.ts`.
4. Retirer le CDN Tailwind, l'importmap et Google Fonts de `index.html`.
5. Ajouter `.env.example`.
6. Vérifier `.gitignore` : `.env`, `data/*.db*`, `dist/`, `coverage/`, `playwright-report/`, `test-results/`.
7. Ajouter `LICENSE` et `CREDITS.md` si absents.
8. Créer la CI minimale : install, lint, typecheck.

Critères de sortie :

- `pnpm install --frozen-lockfile` fonctionne.
- Aucun secret dans le bundle.
- Aucun CDN pour les polices, le JS ou le CSS ; images éditoriales via allowlist.
- `git status` ne contient que des changements intentionnels.
- La CI échoue si un secret est commité.

Risques :

- Le lockfile doit rester reproductible. Éviter `pnpm install` sans vérifier le diff ; préférer `pnpm install --frozen-lockfile`.
- Ne pas réintroduire `@google/genai` dans le client.

### Phase 1 — Outillage et socle TypeScript (2-3 jours)

Tâches :

1. Créer `tsconfig.json`, `tsconfig.client.json`, `tsconfig.server.json`, `tsconfig.shared.json` si utile.
2. Activer `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`.
3. Configurer ESLint : TypeScript, React Hooks, jsx-a11y, `react/no-danger`, `no-console` serveur.
4. Configurer Prettier.
5. Configurer Vitest et la couverture.
6. Configurer Playwright.
7. Ajouter `concurrently`, `tsx`, `zod`, `socket.io`, `socket.io-client`, `express`, `helmet`, `better-sqlite3`, `zustand`, `vitest`, `@testing-library/react`, `@playwright/test`.
8. Ajouter Tailwind compilé et `tailwind.config.ts`.
9. Ajouter les polices locales.
10. Mettre à jour les scripts pnpm.

Critères de sortie :

- `pnpm run lint`, `pnpm run typecheck`, `pnpm run build` passent.
- Un test vide passe.
- Le client démarre sur `5173`.
- Le serveur démarre sur `3000`.
- Le proxy Vite fonctionne.
- Aucun warning TypeScript.

### Phase 2 — Données et pipeline de contenu (3-5 jours)

Tâches :

1. Écrire `scripts/extract-legacy-questions.ts`.
2. Extraire les 244 questions uniques de `services/geminiService.ts`.
3. Normaliser `base64Image` en `image.url`.
4. Dédupliquer par `contentHash`.
5. Générer `data/questions.extracted.json`.
6. Écrire `shared/schemas.ts` (Zod) pour le format question.
7. Écrire `scripts/validate-questions.ts`.
8. Corriger les données : catégories, options, index, articles, crédits.
9. Vérifier les comptes par catégorie.
10. Produire `data/questions.json` approuvé.
11. Écrire `scripts/import-questions.ts`.
12. Écrire `scripts/generate-questions.ts` (Gemini hors ligne, optionnel).

Critères de sortie :

- `pnpm run data:validate` passe.
- 200 questions CLASSIC minimum.
- 10 questions CONTEST minimum.
- Chaque catégorie SUBJECT activée a ≥ 20 questions.
- Aucun HTML.
- Aucune URL non autorisée.
- Aucun doublon.
- Import atomique.
- Le JSON est la source de vérité.

Risques :

- Les 244 questions actuelles ne suffisent pas pour SUBJECT. Décision : désactiver SUBJECT par catégorie tant que le seuil n'est pas atteint.
- Les articles peuvent être courts ou incohérents. Revue humaine obligatoire.
- Les images peuvent être retirées de Wikimedia. Prévoir un placeholder.

### Phase 3 — Moteur de jeu (5-7 jours)

Tâches :

1. Créer `server/game/types.ts` et `events.ts`.
2. Implémenter `scoring.ts`.
3. Implémenter `questions.ts` (pool, shuffle, used IDs, recyclage).
4. Implémenter `state-machine.ts` (phases, transitions, timers).
5. Implémenter `engine.ts` (`reduce`, `tick`).
6. Implémenter les effets.
7. Écrire les tests unitaires en TDD.
8. Ajouter les fixtures 200 questions.
9. Vérifier la couverture 95 %.

Critères de sortie :

- Toutes les transitions de la spécification sont testées.
- Les formules de score sont testées aux bornes.
- Les vies, éliminations, forfaits et égalités sont testés.
- Le shuffle est déterministe avec un RNG fixe.
- Aucune I/O dans le moteur.
- Aucun `Date.now`/`Math.random` direct.
- Aucun snapshot ne contient la réponse avant `REVEAL`.

Risques :

- Les timers et la pause sont la principale source de bugs. Tester avec une horloge fake.
- Le recyclage des questions doit être testé même s'il ne devrait pas arriver.
- Ne pas ajouter de règles non spécifiées.

### Phase 4 — Persistance, sessions et identité (4-5 jours)

Tâches :

1. Créer `server/db/migrate.ts` et `001_init.sql`.
2. Créer `server/persistence/db.ts`.
3. Implémenter les repositories SQLite.
4. Implémenter les repositories mémoire.
5. Implémenter `tokens.ts` (génération, hash, comparaison).
6. Implémenter `POST /api/sessions`, `GET/PATCH /api/me`.
7. Implémenter la purge des sessions.
8. Implémenter l'abandon des matchs au démarrage.
9. Implémenter l'import au démarrage et le fallback JSON.
10. Implémenter `GET /api/health`.

Critères de sortie :

- Un token brut n'est jamais en base.
- Session créée, lue, expirée, supprimée.
- Un match `in_progress` devient `abandoned` au redémarrage.
- L'import est atomique.
- Le fallback mémoire fonctionne si SQLite est indisponible.
- `PRAGMA quick_check` passe.

### Phase 5 — Serveur HTTP et orchestration (5-7 jours)

Tâches :

1. Créer `server/app.ts` avec Express, Helmet, JSON 16 Ko.
2. Créer `server/index.ts` avec HTTP + Socket.io + arrêt gracieux.
3. Implémenter `POST /api/rooms`.
4. Implémenter `POST/DELETE /api/queue`.
5. Implémenter `GET /api/config`.
6. Implémenter `GET /api/leaderboard`.
7. Implémenter les routes admin.
8. Créer `RoomManager`, `RoomRuntime`, `scheduler`.
9. Créer la gateway Socket.io et l'authentification.
10. Implémenter `ROOM_JOIN`, `ROOM_LEAVE`, `LOBBY_READY`, `GAME_START`, `ANSWER`, `CONTINUE`.
11. Implémenter les acks et erreurs typées.
12. Implémenter les broadcasts et `TIMER_SYNC`.
13. Implémenter la reconnexion et le remplacement de session.
14. Persister les scores à chaque `REVEAL`.
15. Persister la fin de match.

Critères de sortie :

- Une room privée à 2 joueurs se joue de bout en bout.
- Les snapshots ne fuient pas la réponse.
- Les reconnexions restaurent l'état.
- Les scores sont en base.
- Les erreurs sont typées.
- La version de protocole est exposée.

### Phase 6 — Client joueur (6-8 jours)

Tâches :

1. Créer les tokens CSS et le shell.
2. Créer `sessionStore`, `gameStore`, `uiStore`.
3. Créer `api.ts` et `socket.ts`.
4. Créer `HomeView`.
5. Créer `LobbyView`.
6. Créer `CountdownView`.
7. Créer `QuestionView`.
8. Créer `RevealView`.
9. Créer `ArticleBody` et `ArticleView`.
10. Créer `LevelCompleteView`.
11. Créer `ResultsView`.
12. Créer `LeaderboardView`.
13. Créer les composants UI.
14. Ajouter les sons et le mute.
15. Ajouter les annonces ARIA.
16. Ajouter le responsive.

Critères de sortie :

- Le client joue contre le serveur réel.
- Aucune règle de jeu dans le client.
- Aucun `dangerouslySetInnerHTML`.
- Aucun `style=` inline.
- Navigation clavier complète.
- axe-core sans violation critique.
- 360 px sans scroll horizontal.
- Les tests de composants passent.

### Phase 7 — Matchmaking public (3-4 jours)

Tâches :

1. Implémenter `QueueManager`.
2. Implémenter les clés de file.
3. Implémenter les cibles 2/4.
4. Implémenter les propositions small room.
5. Implémenter les votes et la majorité stricte.
6. Implémenter les événements `QUEUE_STATE`, `MATCH_FOUND`, `SMALL_ROOM_PROPOSAL`.
7. Implémenter l'auto-start.
8. Implémenter l'annulation si un joueur part.
9. Ajouter les tests.

Critères de sortie :

- CONTEST 2 joueurs immédiat.
- CLASSIC 4 joueurs immédiat.
- Small room après 120 s.
- Non-réponse = refus.
- Cible atteinte pendant le vote = annulation.
- Aucun joueur perdu.

### Phase 8 — TikTok, overlay et control (5-7 jours)

Tâches :

1. Définir `TikTokAdapter`.
2. Implémenter `parser.ts`.
3. Implémenter `fakeAdapter.ts` pour les tests.
4. Implémenter `connector.ts` avec backoff.
5. Implémenter la création admin de room TikTok.
6. Implémenter les viewers et la capacité 100.
7. Implémenter la déduplication.
8. Implémenter `HOST_MANUAL_ANSWER`.
9. Implémenter `OverlayView`.
10. Implémenter `ControlView`.
11. Implémenter les tokens overlay/control et le fragment.
12. Implémenter l'auto-avance article 8 s.
13. Ajouter les tests et la checklist manuelle.

Critères de sortie :

- 100 viewers simulés.
- Parsing strict.
- Aucun cookie loggué.
- Overlay lecture seule.
- Control opérationnel.
- Fallback manuel.
- Aucun contrôle dans l'overlay.
- Aucune réponse avant `REVEAL`.

### Phase 9 — Durcissement (4-6 jours)

Tâches :

1. CSP, HSTS, CORS, Permissions-Policy.
2. Rate limiting HTTP et socket.
3. Validation Zod de tous les payloads.
4. Tests de sécurité.
5. Scan Gitleaks et audit pnpm.
6. Tests de charge.
7. Tests axe et NVDA/VoiceOver.
8. Revue des logs et redaction.
9. Sauvegarde/restauration.
10. Docker non-root et healthcheck.

Critères de sortie :

- Audit sécurité sans critique/high non traité.
- Aucun secret dans le bundle ou les logs.
- Rate limits testés.
- CSP sans `unsafe-*`.
- Tests de charge dans les limites.
- Accessibilité validée.
- Sauvegarde restaurée avec succès.

### Phase 10 — Contenu et SUBJECT (dépend de la phase 2)

Tâches :

1. Compléter les catégories à 20 questions minimum.
2. Revue éditoriale.
3. Vérifier les licences d'images.
4. Activer SUBJECT par catégorie.
5. Mettre à jour `/api/config`.
6. Tests de tirage par catégorie.

Critères de sortie :

- Chaque catégorie activée a ≥ 20 questions.
- Aucun doublon.
- Aucun contenu fragile ou ambigu.
- Les catégories non complètes restent désactivées.

Cette phase peut être menée en parallèle des phases 5-6, mais SUBJECT n'est pas release-ready avant.

### Phase 11 — Release (2-3 jours)

Tâches :

1. Build production.
2. Docker.
3. Reverse proxy TLS.
4. Migrations.
5. Import.
6. Smoke tests.
7. Live test TikTok 1 h / 20 viewers.
8. Monitoring.
9. Documentation opérateur.
10. Tag et notes de version.

Critères de sortie :

- Les critères de sortie de `DECISIONS.md` sont satisfaits.
- Un match privé et un match public sont joués en production.
- Un live TikTok d'une heure tient.
- Le leaderboard persiste après redémarrage.
- Aucune erreur 5xx non expliquée.

## 5. Ordre des premiers commits

1. `chore: restore lockfile and remove client secrets`
2. `chore: add strict TypeScript, lint, test tooling`
3. `feat(shared): add domain types and Zod schemas`
4. `feat(data): extract and validate question bank`
5. `feat(db): add migrations and repositories`
6. `feat(engine): add scoring and question selection`
7. `feat(engine): add phase state machine`
8. `feat(server): add sessions and room creation`
9. `feat(server): add socket gateway and player flow`
10. `feat(client): add session, store and home`
11. `feat(client): add lobby and question flow`
12. `feat(server): add matchmaking`
13. `feat(tiktok): add adapter, overlay and control`
14. `test: add integration and e2e coverage`
15. `chore: harden security, accessibility and deployment`

Chaque commit doit passer lint, typecheck et tests.

## 6. Dépendances entre phases

```text
Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 11
                     └────────────→ 10 ────────┘
```

- La phase 6 peut commencer avec des fixtures avant la fin de la phase 5.
- La phase 7 dépend de la phase 5.
- La phase 8 dépend de la phase 5 et du client.
- La phase 10 est indépendante du code mais bloque la release SUBJECT.
- La phase 9 se fait en continu, pas seulement à la fin.

## 7. Estimation

| Phase | Jours |
| --- | --- |
| 0 | 1-2 |
| 1 | 2-3 |
| 2 | 3-5 |
| 3 | 5-7 |
| 4 | 4-5 |
| 5 | 5-7 |
| 6 | 6-8 |
| 7 | 3-4 |
| 8 | 5-7 |
| 9 | 4-6 |
| 10 | 3-10 (contenu) |
| 11 | 2-3 |
| **Total** | **43-67 jours** |

Hypothèses :

- Une personne à temps plein.
- Contenu éditorial inclus.
- Pas de refonte majeure après la phase 5.
- Le live TikTok est testé sur un compte secondaire.

## 8. Risques et mitigations

| Risque | Impact | Mitigation |
| --- | --- | --- |
| Questions insuffisantes | SUBJECT indisponible | Désactiver par catégorie, phase 10. |
| Images Wikimedia retirées | Article sans image | Placeholder local, crédit conservé. |
| Connecteur TikTok instable | Live interrompu | Backoff, pause, fallback manuel, fake adapter. |
| Timers imprécis | Mauvaise équité | Horloge serveur, échéance absolue, tests fake timers. |
| Fuite de réponse | Triche | Snapshots filtrés, tests de non-fuite, revue. |
| SQLite indisponible | Perte de scores | Fallback mémoire, health dégradé, jeu continue. |
| `pnpm-lock.yaml` absent ou modifié | Build non reproductible | Vérifier propre et commiter ; ne pas régénérer sans diff. |
| Secret dans le bundle | Compromission | Scan CI, CSP, retrait de `define`. |
| Scope creep | Retard | Non-objectifs v1 verrouillés. |
| Accessibilité tardive | Refonte | Tests axe dès la phase 6. |
| Scaling horizontal demandé | Architecture inadaptée | Documenter la limite, refus v1. |

## 9. Definition of Done globale

- [ ] Tous les tests passent.
- [ ] Couverture respectée.
- [ ] Lint et typecheck verts.
- [ ] Aucun secret.
- [ ] Aucun `dangerouslySetInnerHTML`.
- [ ] Aucun `style=` inline.
- [ ] Aucun CDN de polices/JS/CSS ; images éditoriales via allowlist.
- [ ] Accessibilité AA vérifiée.
- [ ] Protocole documenté et versionné.
- [ ] Données validées.
- [ ] Migrations testées.
- [ ] Sauvegarde/restauration testées.
- [ ] Docker non-root.
- [ ] Healthcheck.
- [ ] Logs sans secrets.
- [ ] Leaderboard persistant.
- [ ] Match privé et public jouables.
- [ ] Overlay et control testés.
- [ ] Live TikTok 1 h / 20 viewers validé.
- [ ] Documentation à jour.
- [ ] Aucune référence à la marque encyclopédique historique dans le dépôt.
