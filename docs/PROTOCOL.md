# Encycla — Protocole HTTP et Socket.io

- Version du protocole : 1
- Date : 2026-10-22
- Statut : contrat d'implémentation
- Règles de jeu : [SPECIFICATION.md](SPECIFICATION.md)
- Décisions : [ADR.md](ADR.md)

## 1. Conventions générales

### 1.1 Transport

- HTTP/JSON sur `http://localhost:3000/api` en développement.
- Socket.io sur le même origin, namespace `/game`, path par défaut `/socket.io`.
- En développement, Vite (`5173`) proxy `/api` et `/socket.io` vers `3000`.
- En production, Express sert le client Vite et l'API sur le même origin.

### 1.2 Encodage

- JSON UTF-8.
- Dates : entiers Unix en **millisecondes**.
- Identifiants : UUID v4 générés côté serveur, sauf les identifiants de questions (slug stable).
- Aucun `undefined` dans les payloads ; utiliser `null`.
- Les tableaux conservent leur ordre.

### 1.3 Authentification

- Joueur : `Authorization: Bearer sess_...` pour HTTP, `handshake.auth.token` pour Socket.io.
- Overlay : token dédié, envoyé dans `handshake.auth.token` avec `role: "overlay"`.
- Control : token dédié, envoyé dans `handshake.auth.token` avec `role: "control"`.
- Admin : `Authorization: Bearer ADMIN_TOKEN` uniquement pour les routes `/api/admin/*` et `/api/tiktok/rooms`.
- Les tokens ne sont jamais loggués, ni en clair dans une URL de requête serveur.

### 1.4 Accusés de réception

Tout événement socket client → serveur accepte un callback d'ack :

```ts
type Ack<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };
```

Le client doit fournir un ack pour les actions critiques (`ROOM_JOIN`, `ANSWER`, `CONTINUE`, `GAME_START`). Si l'ack n'est pas fourni, le serveur traite quand même l'événement et émet `ERROR` en cas d'échec.

### 1.5 Erreurs

Format uniforme :

```ts
interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
}
```

`requestId` est un UUID v4 généré par le serveur et présent dans les logs.

### 1.6 Versionnement

- `GET /api/config` expose `protocolVersion: 1`.
- Le client refuse de jouer si `protocolVersion` diffère de la sienne.
- `ROOM_STATE.stateVersion` est monotone par room. Le client ignore toute version ≤ à celle déjà appliquée.
- Aucune compatibilité ascendante n'est promise en v1.

## 2. Types publics partagés

Ces types vivent dans `shared/types.ts` et sont importés par le serveur et le client.

```ts
type GameMode = 'CLASSIC' | 'SUBJECT' | 'CONTEST';
type Difficulty = 'Novice' | 'Adventurer' | 'Wizard';
type RoomPhase =
  | 'LOBBY'
  | 'COUNTDOWN'
  | 'QUESTION'
  | 'REVEAL'
  | 'ARTICLE'
  | 'LEVEL_COMPLETE'
  | 'MATCH_OVER'
  | 'PAUSED'
  | 'CLOSED';

type PlayerStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ELIMINATED'
  | 'FORFEITED'
  | 'LEFT';

interface ImageView {
  url: string;
  alt: string;
  credit?: string;
  license?: string;
  sourceUrl?: string;
}

interface QuestionView {
  id: string;
  subject: string;
  questionText: string;
  options: string[];
  image: ImageView | null;
}

interface RevealView {
  questionId: string;
  subject: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  articleTitle: string;
  articleBody: string;
  image: ImageView | null;
}

interface PlayerResult {
  playerId: string;
  choiceIndex: number | null;
  correct: boolean;
  timedOut: boolean;
  responseTimeMs: number | null;
  pointsAwarded: number;
}

interface FinalRankingEntry {
  playerId: string;
  rank: number;
  tied: boolean;
}

interface PublicPlayer {
  id: string;
  pseudo: string;
  displayName: string;
  avatar: string;
  score: number;
  lives: number;
  streak: number;
  correctCount: number;
  wrongCount: number;
  timeoutCount: number;
  totalResponseMs: number;
  isReady: boolean;
  status: PlayerStatus;
  isHost: boolean;
  joinedAt: number;
  hasAnsweredQuestionId: string | null;
}

interface RoomSettings {
  maxPlayers: number;
  timerMs: number;
  lifePolicy: 'persist' | 'refill_on_level';
  articlePolicy: 'manual' | 'auto';
  autoAdvanceMs: number | null;
  isTikTok: boolean;
  isPublic: boolean;
}

interface PublicRoomState {
  stateVersion: number;
  serverNow: number;
  roomCode: string;
  mode: GameMode;
  difficulty: Difficulty | null;
  category: string | null;
  isPublic: boolean;
  isTikTok: boolean;
  isSolo: boolean;
  tiktokConnected: boolean;
  phase: RoomPhase;
  pausedFrom: RoomPhase | null;
  level: number;
  totalLevels: number;
  questionIndex: number;
  questionsPerLevel: number;
  totalQuestionsAnswered: number;
  phaseStartedAt: number | null;
  phaseEndsAt: number | null;
  pausedAt: number | null;
  remainingMs: number | null;
  phaseToken: string | null;
  hostId: string | null;
  matchId: string | null;
  settings: RoomSettings;
  players: PublicPlayer[];
  question: QuestionView | null;
  reveal: RevealView | null;
  results: PlayerResult[] | null;
  finalRanking: FinalRankingEntry[] | null;
  winnerId: string | null;
}
```

Règles :

- `question` est non nul en `QUESTION`, et en `PAUSED` lorsque `pausedFrom = QUESTION`.
- `reveal` et `results` sont non nuls en `REVEAL`, `ARTICLE`, `LEVEL_COMPLETE` et `MATCH_OVER` (dernier résultat), ainsi qu'en `PAUSED` lorsque `pausedFrom` est l'une de ces phases.
- `correctIndex` n'apparaît que dans `reveal`, jamais dans `question`.
- `reveal` est autoportant : il contient `subject`, `questionText`, `options` et l'image, car `question` redevient `null` après `QUESTION`.
- `phaseEndsAt` est nul pour les phases non minutées.
- `remainingMs` est non nul en `PAUSED`.
- `level` est 1-based ; `questionIndex` est 0-based et représente l'index dans le level courant. L'UI affiche `questionIndex + 1`.
- `difficulty` est `null` pour CLASSIC et CONTEST ; il porte la difficulté choisie en SUBJECT. CONTEST applique `Adventurer` comme preset fixe.
- `hostId` est l'ID du joueur host en web, `null` pour une room TikTok (host spectateur).
- `settings.maxPlayers` vaut 1 en solo, 2-8 en web, et 100 pour une room TikTok (capacité viewers, éliminés inclus).
- `displayName` est le pseudo désambiguïsé par le serveur si plusieurs joueurs partagent le même pseudo ; `pseudo` reste la valeur d'origine.
- `isHost` est toujours `false` pour les viewers TikTok.
- `tiktokConnected` est `true` uniquement pour une room TikTok dont le connecteur est connecté ; il vaut `false` en web et lorsque le connecteur est déconnecté. Il est mis à jour à chaque changement d'état du connecteur.
- `players` est ordonné par `joinedAt` croissant, y compris à `MATCH_OVER`.
- `results` contient une entrée par joueur non éliminé/forfait au début de la question, y compris les timeouts et les déconnectés non revenus ; les joueurs déjà éliminés ou forfaits n'y figurent pas.
- `finalRanking` est `null` hors `MATCH_OVER`. À `MATCH_OVER` d'un match complété, il contient une entrée par joueur encore membre de la room, y compris les forfaits par déconnexion restés membres, dans l'ordre de l'ADR-005 ; les forfaits volontaires retirés de la room n'y figurent pas. `rank` est 1-based et suit un classement par compétition : deux entrées ex æquo partagent le même rang et `tied` vaut `true` ; le rang suivant saute les places occupées. Pour tout match abandonné, `finalRanking` est vide.
- `winnerId` est `null` hors `MATCH_OVER`, en cas d'égalité parfaite au premier rang, ou pour un match abandonné. Sinon, c'est l'unique joueur de rang 1.
- L'ordre des `options` est l'ordre mélangé ; `correctIndex` référence cet ordre.
- `stateVersion` commence à 1 et n'augmente que lorsqu'un nouveau snapshot est émis.

## 3. API HTTP

### 3.1 `POST /api/sessions`

Crée un joueur et une session.

Requête :

```json
{ "pseudo": "Alice" }
```

Réponse `201` :

```json
{
  "playerId": "6b1c...",
  "pseudo": "Alice",
  "token": "sess_...",
  "expiresAt": 1760000000000
}
```

Erreurs : `VALIDATION_ERROR`, `RATE_LIMITED`.

### 3.2 `GET /api/me`

Auth joueur. Réponse `200` :

```json
{
  "playerId": "6b1c...",
  "pseudo": "Alice",
  "avatar": "🦁",
  "createdAt": 1750000000000
}
```

Erreurs : `AUTH_REQUIRED`, `AUTH_INVALID`, `SESSION_EXPIRED`.

### 3.3 `PATCH /api/me`

Auth joueur.

```json
{ "pseudo": "Alice2" }
```

Réponse `200` : même format que `GET /api/me`.

### 3.4 `POST /api/rooms`

Auth joueur. Crée une room privée.

```json
{
  "mode": "CLASSIC",
  "category": null,
  "difficulty": null,
  "maxPlayers": 4
}
```

Contraintes :

- `maxPlayers` optionnel, 2-8, défaut 8 pour `CLASSIC`/`SUBJECT` ; forcé à 2 pour `CONTEST`.
- `CLASSIC` : `category = null`, `difficulty = null`.
- `SUBJECT` : `category` requis, `difficulty` requis.
- `CONTEST` : `category = null`, `difficulty = null`, `maxPlayers = 2`.
- La catégorie SUBJECT doit avoir au moins 20 questions approuvées.

Réponse `201` :

```json
{ "roomCode": "K7M2Q4" }
```

Le créateur devient host. Il doit ensuite envoyer `ROOM_JOIN { code }` sur le socket.

Erreurs : `VALIDATION_ERROR`, `CATEGORY_INSUFFICIENT_QUESTIONS`, `ALREADY_IN_ROOM`, `RATE_LIMITED`.

### 3.5 `POST /api/solo`

Auth joueur. Crée une room solo et la démarre immédiatement.

```json
{
  "mode": "CLASSIC",
  "category": null,
  "difficulty": null
}
```

Contraintes :

- `CLASSIC` : `category = null`, `difficulty = null`.
- `SUBJECT` : `category` et `difficulty` requis, catégorie avec ≥ 20 questions.
- `CONTEST` : refusé en solo (`VALIDATION_ERROR`).
- Le socket du joueur doit être connecté (`NOT_CONNECTED`).
- Un joueur déjà dans une room reçoit `ALREADY_IN_ROOM`.

Réponse `201` :

```json
{ "roomCode": "S3LOQ2", "isSolo": true }
```

Le serveur associe directement le socket, crée le match et passe en `COUNTDOWN`. Aucun `ROOM_JOIN` n'est nécessaire.

Erreurs : `VALIDATION_ERROR`, `CATEGORY_INSUFFICIENT_QUESTIONS`, `ALREADY_IN_ROOM`, `NOT_CONNECTED`, `RATE_LIMITED`.

### 3.6 `POST /api/queue`

Auth joueur. Rejoint la file publique.

```json
{
  "mode": "CLASSIC",
  "category": null,
  "difficulty": null
}
```

Réponse `202` :

```json
{
  "queued": true,
  "position": 2,
  "targetPlayers": 4,
  "queuedAt": 1760000000000
}
```

Contraintes :

- Le socket du joueur doit être connecté (`NOT_CONNECTED`) ; sinon `MATCH_FOUND` ne peut pas être délivré.
- `CLASSIC`/`SUBJECT` : cible 4, small room possible.
- `CLASSIC` : `category = null`, `difficulty = null`.
- `SUBJECT` : `category` et `difficulty` requis, catégorie avec ≥ 20 questions approuvées.
- `CONTEST` : cible 2, `category` et `difficulty` doivent être nuls.
- Un joueur déjà en room reçoit `ALREADY_IN_ROOM`.

Erreurs : `QUEUE_ALREADY_JOINED`, `ALREADY_IN_ROOM`, `NOT_CONNECTED`, `VALIDATION_ERROR`, `CATEGORY_INSUFFICIENT_QUESTIONS`, `RATE_LIMITED`.

### 3.7 `DELETE /api/queue`

Auth joueur. Réponse `204`. Idempotent.

### 3.8 `GET /api/leaderboard`

Public.

Query :

- `mode` : `CLASSIC | SUBJECT | CONTEST` (optionnel)
- `source` : `web | tiktok` (optionnel)
- `limit` : 1-100, défaut 50
- `offset` : défaut 0

Réponse `200` :

```json
{
  "generatedAt": 1760000000000,
  "entries": [
    {
      "rank": 1,
      "playerId": "6b1c...",
      "pseudo": "Alice",
      "avatar": "🦁",
      "totalPoints": 8420,
      "matches": 12,
      "bestMatchPoints": 1700,
      "correctCount": 95,
      "firstMatchAt": 1750000000000
    }
  ]
}
```

Règles d'agrégation : voir [DATA-MODEL.md](DATA-MODEL.md). Si la persistance est désactivée : `503 PERSISTENCE_DISABLED`.

### 3.9 `GET /api/config`

Public. Permet à l'UI de connaître les modes et catégories disponibles.

```json
{
  "protocolVersion": 1,
  "modes": ["CLASSIC", "SUBJECT", "CONTEST"],
  "categories": [
    { "value": "Fauna", "questionCount": 15, "subjectEnabled": false },
    { "value": "Science", "questionCount": 12, "subjectEnabled": false }
  ],
  "constants": {
    "maxLives": 3,
    "questionsPerLevel": 20,
    "totalLevelsClassic": 10,
    "contestQuestions": 10,
    "maxPlayersWeb": 8,
    "maxPlayersTikTok": 100
  }
}
```

### 3.10 `GET /api/health`

Public.

```json
{
  "status": "ok",
  "db": "ok",
  "questions": "ok",
  "uptimeMs": 123456,
  "version": "1.0.0"
}
```

- `status` : `ok | degraded | error`
- `db` : `ok | disabled`
- `questions` : `ok | degraded`

`status` vaut `degraded` si `db = disabled`, si `questions = degraded`, ou si TikTok est activé mais déconnecté. Il vaut `error` si la banque de questions est inutilisable ou si le démarrage est incomplet hors mode dégradé. Réponse `503` si `status = error` ; `200` sinon.

### 3.11 `POST /api/tiktok/rooms`

Admin uniquement (`ADMIN_TOKEN`).

```json
{
  "mode": "CLASSIC",
  "category": null,
  "difficulty": null,
  "timerMs": 15000
}
```

Réponse `201` :

```json
{
  "roomCode": "T9X4P2",
  "overlayToken": "ovl_...",
  "controlToken": "ctl_..."
}
```

Contraintes :

- `mode` requis : `CLASSIC` ou `SUBJECT` uniquement ; `CONTEST` est refusé en TikTok.
- `CLASSIC` refuse `category`/`difficulty`, `SUBJECT` les exige.
- `timerMs` optionnel, entre 10 000 et 30 000 ms, défaut 15 000.
- La catégorie SUBJECT doit avoir au moins 20 questions approuvées.
- Les tokens overlay/control n'ont pas d'expiration propre ; ils restent valides jusqu'à la fermeture de la room et sont révoqués à ce moment.

Erreurs : `AUTH_REQUIRED`, `AUTH_INVALID`, `FORBIDDEN`, `TIKTOK_DISABLED`, `TIKTOK_NOT_CONNECTED`, `VALIDATION_ERROR`, `CATEGORY_INSUFFICIENT_QUESTIONS`.

### 3.12 `POST /api/admin/rooms/:code/close`

Admin. Ferme une room bloquée. Réponse `204`.

### 3.13 Routes d'administration des questions

Réservées à l'admin, prévues pour la pipeline de contenu :

- `GET /api/admin/questions/pending`
- `POST /api/admin/questions/:id/approve`
- `POST /api/admin/questions/:id/reject`

Ces routes ne sont pas utilisées par le runtime de jeu en v1.

## 4. Socket.io

### 4.1 Connexion

Namespace : `/game`.

Joueur :

```ts
io('/game', {
  auth: { role: 'player', token: 'sess_...' }
});
```

Overlay :

```ts
io('/game', {
  auth: { role: 'overlay', roomCode: 'T9X4P2', token: 'ovl_...' }
});
```

Control :

```ts
io('/game', {
  auth: { role: 'control', roomCode: 'T9X4P2', token: 'ctl_...' }
});
```

En cas d'échec, le serveur refuse la connexion avec `connect_error` :

```ts
{ code: 'AUTH_REQUIRED' | 'AUTH_INVALID' | 'SESSION_EXPIRED' | 'ROOM_NOT_FOUND' | 'FORBIDDEN', message: string }
```

En cas de succès :

- joueur : `SESSION_READY { player }` ;
- overlay : `ROOM_STATE` immédiat ;
- control : `CONTROL_READY { capabilities }` puis `ROOM_STATE`.

Si le joueur est déjà dans une room, le serveur le réinsère dans le socket room et émet immédiatement `ROOM_STATE`.

### 4.2 Événements client → serveur

Tous les événements ont un ack `Ack<T>`.

#### `ROOM_JOIN`

```json
{ "code": "K7M2Q4" }
```

Ack : `{ "roomCode": "K7M2Q4" }`.

Erreurs : `ROOM_NOT_FOUND`, `ROOM_FULL`, `ROOM_IN_PROGRESS`, `ALREADY_IN_ROOM`, `RATE_LIMITED`.

Une room publique n'est pas rejoignable par code : le serveur répond `ROOM_NOT_FOUND` pour ne pas confirmer son existence. Seules les rooms privées web (`isPublic=false`, `isTikTok=false`) acceptent `ROOM_JOIN` ; une room TikTok répond `ROOM_NOT_FOUND`.

#### `ROOM_LEAVE`

```json
{}
```

Ack : `{ "left": true }`.

En lobby : retire le joueur ; si c'était le host, le rôle passe au plus ancien connecté. En partie : forfait et retire le joueur de la room ; son score est conservé. En solo, le match passe à `abandoned`.

#### `LOBBY_READY`

```json
{ "ready": true }
```

Ack : `{ "ready": true }`. Erreurs : `INVALID_PHASE`, `NOT_IN_ROOM`, `VALIDATION_ERROR`.

#### `GAME_START`

```json
{}
```

Ack : `{ "phase": "COUNTDOWN" }`.

- Room privée web : host, au moins 2 joueurs connectés, tous prêts.
- Room TikTok : control, aucun minimum de viewers, prêts ignorés ; le connecteur doit être connecté (`tiktokConnected=true`).
- Room publique : démarrage automatique uniquement ; `GAME_START` est refusé.

Erreurs : `NOT_HOST`, `NOT_ENOUGH_PLAYERS`, `PLAYERS_NOT_READY`, `INVALID_PHASE`, `TIKTOK_NOT_CONNECTED` (TikTok uniquement).

#### `ANSWER`

```json
{
  "questionId": "fauna-lion-01",
  "choiceIndex": 2
}
```

Ack : `{ "lockedIn": true, "receivedAt": 1760000000000 }`.

Erreurs : `INVALID_PHASE`, `INVALID_OPTION`, `ANSWER_TOO_LATE`, `ANSWER_ALREADY_SUBMITTED`, `QUESTION_MISMATCH`, `PLAYER_ELIMINATED`, `PLAYER_FORFEITED`, `NOT_IN_ROOM`.

L'ack ne contient jamais `correct`.

#### `CONTINUE`

```json
{ "phaseToken": "7f3a..." }
```

Ack : `{ "ready": true, "waitingFor": ["playerId"] }`.

Erreurs : `INVALID_PHASE`, `STALE_PHASE_TOKEN`, `NOT_IN_ROOM`, `PLAYER_FORFEITED`.

#### `HOST_PAUSE`

Ack : `{ "phase": "PAUSED" }`. Erreurs : `NOT_HOST`, `INVALID_PHASE`.

Autorisé pour le host d'une room privée, le joueur solo et le control TikTok. Le host public reçoit `NOT_HOST`.

#### `HOST_RESUME`

Ack : `{ "phase": "<resumePhase>" }` (`QUESTION`, `REVEAL`, `ARTICLE` ou `LEVEL_COMPLETE`). Erreurs : `NOT_HOST`, `INVALID_PHASE`.

#### `HOST_SKIP`

Ack : `{ "phase": "REVEAL" }`, `{ "phase": "QUESTION" }`, `{ "phase": "LEVEL_COMPLETE" }` ou `{ "phase": "MATCH_OVER" }`.

Erreurs : `NOT_HOST`, `INVALID_PHASE`.

- Host privé : autorisé en `ARTICLE` et `LEVEL_COMPLETE` uniquement.
- Control TikTok : autorisé en `QUESTION`, `ARTICLE` et `LEVEL_COMPLETE`.
- Solo et host public : toujours `NOT_HOST`.

#### `HOST_MANUAL_ANSWER`

Réservé au control TikTok.

```json
{ "playerId": "6b1c...", "choiceIndex": 1 }
```

Ack : `{ "accepted": true }`. Erreurs : `NOT_HOST`, `INVALID_PHASE`, `PLAYER_NOT_FOUND`, `INVALID_OPTION`, `PLAYER_ELIMINATED`, `PLAYER_FORFEITED`, `ANSWER_ALREADY_SUBMITTED`, `ANSWER_TOO_LATE`.

#### `HOST_CLOSE`

Ack : `{ "closed": true }`. Erreurs : `NOT_HOST`, `INVALID_PHASE`.

Autorisé pour le host privé et le control TikTok. Une fermeture en partie abandonne le match sans vainqueur.

#### `SMALL_ROOM_VOTE`

```json
{ "proposalId": "uuid", "accept": true }
```

Ack : `{ "recorded": true }`. Erreurs : `PROPOSAL_NOT_FOUND`, `PROPOSAL_EXPIRED`.

### 4.3 Événements serveur → client

#### `SESSION_READY`

```json
{
  "player": {
    "id": "6b1c...",
    "pseudo": "Alice",
    "avatar": "🦁"
  },
  "roomCode": "K7M2Q4"
}
```

`roomCode` est `null` si le joueur n'est dans aucune room.

#### `ROOM_STATE`

Payload : `PublicRoomState` (section 2).

Émis à chaque changement de phase, join/leave, ready, révélation, pause, fin de match, changement d'état du connecteur TikTok, et après reconnexion.

#### `PLAYER_LOCKED`

```json
{ "questionId": "fauna-lion-01", "playerId": "6b1c..." }
```

Événement léger, sans `stateVersion`. Le prochain snapshot contient l'information.

#### `TIMER_SYNC`

```json
{
  "phase": "QUESTION",
  "phaseEndsAt": 1760000020000,
  "serverNow": 1760000010000,
  "paused": false,
  "remainingMs": null
}
```

Émis toutes les 5 s pendant `COUNTDOWN`, `QUESTION`, `ARTICLE` et `LEVEL_COMPLETE`, et après une reprise. Pas de `TIMER_SYNC` en `REVEAL` (2,5 s) ni en `LOBBY`.

#### `MATCH_FOUND`

```json
{ "roomCode": "P4N8R2" }
```

#### `SMALL_ROOM_PROPOSAL`

```json
{
  "proposalId": "uuid",
  "playerCount": 3,
  "expiresAt": 1760000015000,
  "serverNow": 1760000000000
}
```

#### `QUEUE_STATE`

```json
{
  "position": 3,
  "targetPlayers": 4,
  "queuedAt": 1760000000000,
  "proposal": null
}
```

#### `CONTROL_READY`

```json
{ "capabilities": ["start", "pause", "resume", "skip", "manual_answer", "close"] }
```

#### `ROOM_CLOSED`

```json
{ "reason": "HOST_CLOSED" | "ADMIN_CLOSED" | "MATCH_CANCELLED" | "NO_PLAYERS" | "SERVER_RESTART" | "MATCH_OVER_TIMEOUT" }
```

#### `SESSION_REPLACED`

```json
{ "reason": "NEW_CONNECTION" }
```

#### `ERROR`

```json
{ "error": { "code": "RATE_LIMITED", "message": "Too many events", "requestId": "uuid" } }
```

Utilisé pour les erreurs asynchrones ou les événements sans ack.

## 5. Codes d'erreur

| Code | HTTP | Socket | Signification |
| --- | --- | --- | --- |
| `VALIDATION_ERROR` | 400 | oui | Payload invalide. |
| `AUTH_REQUIRED` | 401 | oui | Token manquant. |
| `AUTH_INVALID` | 401 | oui | Token inconnu ou invalide. |
| `SESSION_EXPIRED` | 401 | oui | Session expirée. |
| `FORBIDDEN` | 403 | oui | Rôle ou host insuffisant. |
| `ROOM_NOT_FOUND` | 404 | oui | Code inconnu. |
| `ROOM_FULL` | 409 | oui | Capacité atteinte. |
| `ROOM_IN_PROGRESS` | 409 | oui | Partie déjà commencée. |
| `ROOM_CLOSED` | 409 | oui | Room fermée. |
| `ALREADY_IN_ROOM` | 409 | oui | Joueur déjà dans une room. |
| `NOT_IN_ROOM` | 409 | oui | Joueur absent de la room. |
| `NOT_CONNECTED` | 409 | — | Aucun socket actif pour ce joueur. |
| `NOT_HOST` | 403 | oui | Action réservée au host. |
| `NOT_ENOUGH_PLAYERS` | 409 | oui | Moins de 2 joueurs. |
| `PLAYERS_NOT_READY` | 409 | oui | Tous les joueurs ne sont pas prêts. |
| `INVALID_PHASE` | 409 | oui | Action interdite dans cette phase. |
| `STALE_PHASE_TOKEN` | 409 | oui | `CONTINUE` périmé. |
| `INVALID_OPTION` | 400 | oui | `choiceIndex` hors 0-3. |
| `QUESTION_MISMATCH` | 409 | oui | `questionId` ne correspond pas. |
| `ANSWER_TOO_LATE` | 409 | oui | Réponse après l'échéance. |
| `ANSWER_ALREADY_SUBMITTED` | 409 | oui | Deuxième réponse. |
| `PLAYER_ELIMINATED` | 409 | oui | Joueur éliminé. |
| `PLAYER_FORFEITED` | 409 | oui | Joueur forfait, sans capacité de jeu. |
| `PLAYER_NOT_FOUND` | 404 | oui | Joueur inconnu. |
| `QUEUE_ALREADY_JOINED` | 409 | — | Déjà en file. |
| `QUEUE_NOT_JOINED` | 409 | — | Pas en file. |
| `PROPOSAL_NOT_FOUND` | 404 | oui | Proposition inconnue. |
| `PROPOSAL_EXPIRED` | 409 | oui | Vote terminé. |
| `CATEGORY_INSUFFICIENT_QUESTIONS` | 409 | — | Catégorie < 20 questions. |
| `TIKTOK_DISABLED` | 503 | — | Mode TikTok désactivé. |
| `TIKTOK_NOT_CONNECTED` | 503 | — | Connecteur non connecté. |
| `PERSISTENCE_DISABLED` | 503 | — | SQLite indisponible. |
| `RATE_LIMITED` | 429 | oui | Limite dépassée. |
| `INTERNAL_ERROR` | 500 | oui | Erreur inattendue. |
| `PROTOCOL_VERSION_MISMATCH` | 409 | oui | Client incompatible. |

## 6. Séquences

### 6.1 Création de session et room privée

1. Client → `POST /api/sessions { pseudo }`.
2. Serveur → `201 { playerId, token, ... }`.
3. Client stocke le token.
4. Client ouvre le socket avec `auth.token`.
5. Serveur → `SESSION_READY`.
6. Client → `POST /api/rooms { mode, ... }`.
7. Serveur → `201 { roomCode }`.
8. Client → socket `ROOM_JOIN { code }`.
9. Serveur → `ROOM_STATE` (LOBBY).
10. Les autres joueurs répètent 1-4 puis `ROOM_JOIN`.
11. Chaque joueur → `LOBBY_READY { ready: true }`.
12. Host → `GAME_START`.
13. Serveur → `ROOM_STATE` (COUNTDOWN), puis après 3 s `ROOM_STATE` (QUESTION).

Pour une partie solo, les étapes 6 à 12 sont remplacées par `POST /api/solo`, qui associe directement le socket, crée le match et passe en `COUNTDOWN`.

Si la condition d'annulation du `COUNTDOWN` est remplie, la room est fermée (`ROOM_CLOSED`, reason `MATCH_CANCELLED`) : en room publique, tout joueur requis non connecté ou parti annule ; en room privée ou solo, il faut moins de 2 joueurs actifs. Le match déjà créé et ses scores non finalisés passent `abandoned`, et les joueurs publics restants sont remis en file. Une déconnexion privée à 2 joueurs dans la fenêtre de 30 s n'annule pas le countdown.

### 6.2 Réponse et révélation

1. Serveur → `ROOM_STATE` (QUESTION, `question`, `phaseEndsAt`).
2. Joueur → `ANSWER { questionId, choiceIndex }`.
3. Serveur → ack `{ lockedIn: true }`.
4. Serveur → broadcast `PLAYER_LOCKED`.
5. S'il y a au moins un actif connecté et que tous les actifs connectés ont répondu, la question est résolue immédiatement. Si tous les actifs connectés n'ont pas répondu à `phaseEndsAt`, ou s'il n'y a aucun actif connecté, elle est résolue au timer. Une room TikTok avec 0 viewer attend le timer ; les déconnectés ne bloquent pas et sont résolus en timeout.
6. Serveur → `ROOM_STATE` (REVEAL, `reveal`, `results`, scores à jour).
7. Après 2,5 s → `ROOM_STATE` (ARTICLE), ou `MATCH_OVER` si fin anticipée web/solo.
8. Chaque actif web connecté → `CONTINUE { phaseToken }` (si `ARTICLE`).
9. En `ARTICLE`, s'il y a au moins un actif connecté et que tous les actifs connectés sont prêts, ou au timeout (30 s web / 8 s TikTok auto), → `ROOM_STATE` (QUESTION suivante, LEVEL_COMPLETE ou MATCH_OVER).
10. En `LEVEL_COMPLETE`, même règle de `CONTINUE`, avec un timeout de 15 s maximum web et TikTok, → `ROOM_STATE` (QUESTION suivante ou MATCH_OVER).

### 6.3 Reconnexion

1. Socket se déconnecte ; serveur marque `DISCONNECTED`, démarre le timer de 30 s.
2. Client se reconnecte avec le même token.
3. Serveur → `SESSION_READY { roomCode }`.
4. Serveur → `ROOM_STATE` complet.
5. Si la room a avancé pendant la coupure, le snapshot contient l'état courant.
6. Si la fenêtre est dépassée en lobby, le joueur est retiré et reçoit `NOT_IN_ROOM`. En partie, il passe `FORFEITED` et reste membre en lecture seule ; une reconnexion restaure le snapshot sans capacités de jeu. Si la room est terminée, `ROOM_CLOSED`.

### 6.4 File publique et small room

1. N clients → `POST /api/queue`.
2. Serveur → `202 { position, targetPlayers }`.
3. Serveur → `QUEUE_STATE` à chaque changement.
4. À 120 s avec 2-3 joueurs → `SMALL_ROOM_PROPOSAL`.
5. Clients → `SMALL_ROOM_VOTE`.
6. Majorité stricte → création de room, `MATCH_FOUND`.
7. Serveur → `ROOM_STATE` (COUNTDOWN) après auto-join.
8. Minorité → reste en file avec timer réinitialisé.

### 6.5 TikTok

1. Admin → `POST /api/tiktok/rooms`.
2. Serveur → `{ roomCode, overlayToken, controlToken }`.
3. Overlay ouvre le socket avec `role=overlay` → `ROOM_STATE`.
4. Control ouvre le socket avec `role=control` → `CONTROL_READY` + `ROOM_STATE`.
5. Control → `GAME_START`.
6. Connecteur reçoit les commentaires ; le premier `A/B/C/D` valide pendant `QUESTION` crée le viewer.
7. Le serveur résout la question comme pour un joueur web.
8. Overlay reçoit `ROOM_STATE` (REVEAL).
9. Article auto-avancé après 8 s.
10. Fin : `MATCH_OVER`, persistance, `ROOM_CLOSED` après TTL.

## 7. Limites de débit

| Portée | Limite |
| --- | --- |
| HTTP global par IP | 100 req/min |
| `POST /api/sessions` par IP | 10 req/min |
| `POST /api/rooms` par session | 10 req/min |
| `POST /api/queue` par session | 20 req/min |
| `ROOM_JOIN` par IP | 10 req/min |
| Socket global | 10 événements/s, burst 20 |
| `ANSWER` | 1 par question et par joueur |
| `CONTINUE` | 1 par phase et par joueur |

En cas de dépassement : `RATE_LIMITED`. Un abus répété peut entraîner la déconnexion du socket.

## 8. Taille et performance

- Corps HTTP maximum : 16 Ko.
- Snapshot `ROOM_STATE` : cible < 32 Ko pour 8 joueurs web, < 64 Ko pour 100 viewers TikTok (article inclus).
- Les snapshots ne sont pas émis à chaque réponse ; seulement `PLAYER_LOCKED`.
- Les ticks de timer sont des `TIMER_SYNC` légers.
- Une room n'émet pas de snapshot si son `stateVersion` ne change pas.
- 100 viewers TikTok + 1 overlay + 1 control doivent tenir dans un processus Node.

## 9. Sécurité du protocole

- Aucun `correctIndex` dans `QUESTION`.
- Aucun `articleBody` avant `REVEAL`.
- Aucun token dans une URL envoyée au serveur. Pour l'overlay et le control, le token peut être placé dans le fragment (`#token=...`) pour ne pas apparaître dans les logs ; le client lit le fragment et l'envoie dans `handshake.auth`.
- Les erreurs ne révèlent ni l'existence d'une room privée à un non-membre, ni la bonne réponse, ni l'identité d'un joueur non visible.
- Les routes admin nécessitent `ADMIN_TOKEN`.
- Une room privée n'est pas listée publiquement.
- Le code de room n'est pas une authentification ; il est rate-limité.

## 10. Compatibilité et évolution

- Toute modification breaking incrémente `protocolVersion`.
- Les nouveaux champs optionnels sont ignorés par les anciens clients.
- Les enums ne doivent jamais être réordonnés ; les valeurs sont stables.
- Les noms d'événements sont en `SCREAMING_SNAKE_CASE` côté client et serveur.
- Les champs JSON sont en `camelCase`.
- Les dates sont des nombres, jamais des chaînes ISO dans le protocole.
