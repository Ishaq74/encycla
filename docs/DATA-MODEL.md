# Encycla — Modèle de données et persistance

- Version : 1.0
- Date : 2026-10-22
- Statut : référence d'implémentation
- Décisions : [ADR.md](ADR.md)
- Règles de jeu : [SPECIFICATION.md](SPECIFICATION.md)
- Protocole : [PROTOCOL.md](PROTOCOL.md)

## 1. Principes

1. **Le JSON est la source éditoriale.** `data/questions.json` est versionné, relu et validé. SQLite en est un miroir d'exécution en lecture seule côté jeu.
2. **SQLite est la source d'historique.** Sessions, matchs et scores survivent aux redémarrages.
3. **Les rooms sont en mémoire.** Une room ne survit pas à un redémarrage ; un match `in_progress` devient `abandoned`.
4. **Aucune donnée de jeu dans le client.** Le client ne stocke que son token de session, son pseudo et ses préférences UI.
5. **Pas de secret dans les snapshots.** La bonne réponse n'entre en base de room qu'en mémoire et n'est diffusée qu'à `REVEAL`.
6. **Toute écriture de score est transactionnelle.** Un match ne peut pas avoir un score partiel visible au leaderboard.

## 2. Fichiers et emplacements

| Chemin | Rôle | Versionné |
| --- | --- | --- |
| `data/questions.json` | Banque éditoriale approuvée | Oui |
| `data/encycla.db` | Base SQLite runtime | Non (`.gitignore`) |
| `data/encycla.db-wal` | WAL SQLite | Non |
| `data/encycla.db-shm` | Shared memory SQLite | Non |
| `server/db/migrations/*.sql` | Migrations ordonnées | Oui |
| `scripts/import-questions.ts` | Synchronisation JSON → SQLite | Oui |
| `scripts/validate-questions.ts` | Validation éditoriale | Oui |
| `scripts/extract-legacy-questions.ts` | Extraction one-shot depuis le prototype | Oui |

Le répertoire `data/` est créé au démarrage s'il n'existe pas. Le processus doit avoir les droits d'écriture sur ce répertoire.

## 3. SQLite

### 3.1 Configuration obligatoire

À chaque ouverture de connexion :

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
```

- Une seule instance Node en v1 : pas de contention multi-processus.
- `better-sqlite3` en mode synchrone.
- Toutes les écritures de jeu passent par des transactions `IMMEDIATE`.
- Les lectures du leaderboard peuvent utiliser la même connexion.

### 3.2 Migrations

- Fichiers `NNN_nom.sql`, numérotation strictement croissante.
- Table `schema_migrations` créée par le migrateur.
- Une migration s'exécute dans une transaction.
- Si une migration échoue : rollback, arrêt du serveur, code de sortie non nul.
- Aucune migration destructive sans sauvegarde explicite.
- Le serveur refuse de démarrer si la base contient une version supérieure à celle du binaire.

```sql
CREATE TABLE schema_migrations (
  version     INTEGER PRIMARY KEY,
  name        TEXT    NOT NULL,
  applied_at  INTEGER NOT NULL
);
```

### 3.3 Schéma initial

```sql
CREATE TABLE players (
  id                TEXT PRIMARY KEY,
  provider          TEXT NOT NULL DEFAULT 'web'
                    CHECK (provider IN ('web', 'tiktok')),
  external_id       TEXT,
  pseudo            TEXT NOT NULL,
  pseudo_normalized TEXT NOT NULL,
  avatar            TEXT NOT NULL,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  CHECK (
    (provider = 'web' AND external_id IS NULL)
    OR (provider = 'tiktok' AND external_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX players_provider_external
  ON players(provider, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX players_pseudo_normalized
  ON players(pseudo_normalized);

CREATE TABLE player_sessions (
  id           TEXT PRIMARY KEY,
  player_id    TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX player_sessions_player
  ON player_sessions(player_id);

CREATE INDEX player_sessions_expires
  ON player_sessions(expires_at);

CREATE TABLE matches (
  id                TEXT PRIMARY KEY,
  room_code         TEXT NOT NULL,
  mode              TEXT NOT NULL
                    CHECK (mode IN ('CLASSIC', 'SUBJECT', 'CONTEST')),
  category          TEXT,
  difficulty        TEXT
                    CHECK (difficulty IS NULL OR difficulty IN ('Novice', 'Adventurer', 'Wizard')),
  source            TEXT NOT NULL
                    CHECK (source IN ('web', 'tiktok')),
  player_count      INTEGER NOT NULL CHECK (player_count BETWEEN 0 AND 100),
  total_questions   INTEGER NOT NULL CHECK (total_questions > 0),
  status            TEXT NOT NULL
                    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  winning_player_id TEXT,
  settings_json     TEXT NOT NULL,
  protocol_version  INTEGER NOT NULL DEFAULT 1,
  created_at        INTEGER NOT NULL,
  started_at        INTEGER,
  ended_at          INTEGER,
  FOREIGN KEY (winning_player_id) REFERENCES players(id),
  CHECK (
    (mode = 'SUBJECT' AND category IS NOT NULL AND difficulty IS NOT NULL)
    OR (mode IN ('CLASSIC', 'CONTEST') AND category IS NULL AND difficulty IS NULL)
  )
);

CREATE INDEX matches_status_ended
  ON matches(status, ended_at);

CREATE INDEX matches_mode_source
  ON matches(mode, source);

CREATE TABLE scores (
  match_id          TEXT NOT NULL,
  player_id         TEXT NOT NULL,
  pseudo_snapshot   TEXT NOT NULL,
  avatar_snapshot   TEXT NOT NULL,
  provider          TEXT NOT NULL
                    CHECK (provider IN ('web', 'tiktok')),
  score             INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  correct_count     INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  wrong_count       INTEGER NOT NULL DEFAULT 0 CHECK (wrong_count >= 0),
  timeout_count     INTEGER NOT NULL DEFAULT 0 CHECK (timeout_count >= 0),
  total_response_ms INTEGER NOT NULL DEFAULT 0 CHECK (total_response_ms >= 0),
  best_streak       INTEGER NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  lives_remaining   INTEGER NOT NULL DEFAULT 0 CHECK (lives_remaining >= 0),
  status            TEXT NOT NULL
                    CHECK (status IN ('playing', 'completed', 'eliminated',
                                      'forfeited', 'abandoned')),
  joined_at         INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  finalized_at      INTEGER,
  PRIMARY KEY (match_id, player_id),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE INDEX scores_player
  ON scores(player_id, finalized_at);

CREATE INDEX scores_match_score
  ON scores(match_id, score DESC);

CREATE TABLE questions (
  id               TEXT PRIMARY KEY,
  category         TEXT NOT NULL,
  subject          TEXT NOT NULL,
  question_text    TEXT NOT NULL,
  options_json     TEXT NOT NULL,
  correct_index    INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation      TEXT NOT NULL,
  article_title    TEXT NOT NULL,
  article_body     TEXT NOT NULL,
  image_url        TEXT,
  image_alt        TEXT,
  image_credit     TEXT,
  image_license    TEXT,
  image_source_url TEXT,
  content_hash     TEXT NOT NULL UNIQUE,
  imported_at      INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);

CREATE INDEX questions_category
  ON questions(category);

CREATE TABLE questions_pending (
  id             TEXT PRIMARY KEY,
  payload_json   TEXT NOT NULL,
  source         TEXT NOT NULL CHECK (source IN ('gemini', 'manual', 'legacy')),
  model          TEXT,
  prompt_version TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at     INTEGER NOT NULL,
  reviewed_at    INTEGER,
  review_note    TEXT
);

CREATE INDEX questions_pending_status
  ON questions_pending(status, created_at);
```

### 3.4 Choix de types

- Les dates sont des `INTEGER` Unix en millisecondes, cohérentes avec le protocole.
- Les booléens sont des `INTEGER 0/1` si nécessaire ; aucun booléen dans le schéma initial.
- Les objets complexes (`settings_json`, `options_json`, `payload_json`) sont du JSON sérialisé, validé à l'écriture et à la lecture.
- Les identifiants sont des UUID v4 textuels, sauf `questions.id` qui est un slug stable.
- Les montants de score sont des entiers ; aucune décimale n'est persistée.

## 4. Joueurs et sessions

### 4.1 Identité web

- `players.id` : UUID généré par le serveur à la création de session.
- `provider = 'web'`, `external_id = NULL`.
- Le pseudo est modifiable ; l'identité ne l'est pas.
- Pseudo : 2 à 24 graphèmes après normalisation.
- Deux joueurs peuvent avoir le même pseudo : le serveur calcule un `displayName` désambiguïsé (suffixe court) dans le snapshot ; `pseudo` reste la valeur d'origine.

### 4.2 Identité TikTok

- `provider = 'tiktok'`, `external_id = uniqueId` normalisé (lowercase, trim).
- Upsert à la première réponse valide :

```sql
INSERT INTO players (id, provider, external_id, pseudo, pseudo_normalized,
                     avatar, created_at, updated_at)
VALUES (?, 'tiktok', ?, ?, ?, ?, ?, ?)
ON CONFLICT(provider, external_id) WHERE external_id IS NOT NULL
DO UPDATE SET pseudo = excluded.pseudo,
              pseudo_normalized = excluded.pseudo_normalized,
              updated_at = excluded.updated_at;
```

- Aucune session n'est créée pour un viewer.
- Un viewer ne peut pas se reconnecter : son identité est son `uniqueId`.

### 4.3 Sessions

- Token brut : `sess_` + 32 octets aléatoires encodés en base64url.
- Stockage : SHA-256 du token brut, jamais le token.
- Durée fixe : 30 jours, non prolongée par usage.
- `last_seen_at` mis à jour au maximum une fois par minute pour le diagnostic uniquement.
- Une session expirée est refusée et purgée.
- Un joueur peut avoir plusieurs sessions (multi-appareils) ; la dernière connexion socket remplace l'ancienne.
- Purge quotidienne :

```sql
DELETE FROM player_sessions WHERE expires_at < ?;
```

### 4.4 IP et user-agent non persistés

- Aucune IP ni aucun user-agent n'est persisté en base.
- L'IP est utilisée uniquement en mémoire pour le rate limiting, puis oubliée.
- Jamais d'IP brute, jamais de cookie de session en clair dans les logs.
- Cette minimisation est alignée sur ADR-013.

## 5. Matchs et scores

### 5.1 Création d'un match

Un match est créé au début du `COUNTDOWN` (`GAME_START`, auto-start public ou `POST /api/solo`), pas à la création de la room. `created_at` date ce début ; `started_at` est renseigné à la première entrée en `QUESTION` ; `ended_at` est renseigné à la fin ou à l'abandon.

Transaction :

1. Insérer `matches` avec `status='in_progress'` et le `player_count` courant.
2. Insérer une ligne `scores` par joueur déjà présent avec `status='playing'`.
3. Écrire `settings_json`.
4. Émettre le snapshot.

`settings_json` est le snapshot immuable de `RoomSettings` (`maxPlayers`, `timerMs`, `lifePolicy`, `articlePolicy`, `autoAdvanceMs`, `isTikTok`, `isPublic`). Une room TikTok peut démarrer avec `player_count=0`. Au premier commentaire valide d'un viewer, insérer sa ligne `scores`, incrémenter `matches.player_count` et enregistrer sa réponse dans la même transaction que son join.

`total_questions` est calculé :

- CLASSIC : 200 ;
- SUBJECT : 20 ;
- CONTEST : 10.

`player_count` inclut les joueurs forfaits/éliminés tant que le match vit. Une room TikTok peut rester à 0 tant qu'aucun viewer n'a rejoint.

### 5.2 Mise à jour à chaque révélation

À `REVEAL`, dans une transaction :

```sql
UPDATE scores
SET score = ?,
    correct_count = ?,
    wrong_count = ?,
    timeout_count = ?,
    total_response_ms = ?,
    best_streak = ?,
    lives_remaining = ?,
    status = ?,
    updated_at = ?
WHERE match_id = ? AND player_id = ?;
```

- `status` vaut `playing`, `eliminated` ou `forfeited`.
- `wrong_count` ne compte que les réponses fausses ; les timeouts sont dans `timeout_count`.
- `total_response_ms` inclut `responseTimeMs` pour une réponse et `timerMs` pour un timeout.
- Les compteurs sont **autoritatifs** : on écrit la valeur courante du moteur, pas un delta.
- Une résolution de question ne peut se produire qu'une fois ; le moteur est la garde d'idempotence.
- En cas de crash avant le commit, le match sera marqué `abandoned` au redémarrage.

### 5.3 Fin de match

Transaction :

1. Calculer le classement final et l'exposer dans le snapshot `MATCH_OVER` via `finalRanking` et `winnerId` ; le classement et les rangs ne sont pas stockés.
2. `UPDATE matches SET status='completed', ended_at=?, winning_player_id=? WHERE id=? AND status='in_progress'`.
3. `UPDATE scores SET status = CASE WHEN status = 'forfeited' THEN 'forfeited' ELSE ? END, finalized_at=?, updated_at=? WHERE match_id=?`.
4. Commit.

`status` final d'un joueur :

- `completed` : a terminé le match ;
- `eliminated` : éliminé ;
- `forfeited` : parti ou déconnecté trop longtemps ;
- `abandoned` : match interrompu.

`winning_player_id` vaut le premier du classement final, ou `NULL` en cas d'égalité parfaite ou de match abandonné. Un score déjà `forfeited` n'est jamais réécrit en `completed` ou `eliminated` lors de la finalisation ; `finalized_at` peut être renseigné. Un forfait (`ROOM_LEAVE` en partie ou expiration de reconnexion) passe le score à `forfeited` immédiatement, sans finaliser le match en room. En solo, le forfait abandonne immédiatement le match. Si une room TikTok se termine avec `player_count=0`, le match est marqué `abandoned`, jamais `completed`.

### 5.4 Abandon

- `HOST_CLOSE` en partie : match `abandoned`, scores non finalisés (hors `forfeited`) passés à `abandoned`.
- `COUNTDOWN` annulé (joueur manquant, fermeture) : la ligne `matches` déjà créée passe `abandoned` avec `ended_at`, scores non finalisés passés à `abandoned`.
- Room web : moins de 2 joueurs actifs → match `completed` si au moins un joueur non-forfait peut être classé (y compris tous éliminés sur la même question), sinon `abandoned`. Un joueur déconnecté reste actif pendant sa fenêtre de 30 s. Une room TikTok continue avec 0 ou 1 actif.
- Redémarrage serveur : tous les matchs `in_progress` deviennent `abandoned`.
- Room fermée en `LOBBY` sans match démarré : aucune ligne `matches`.

Au démarrage :

```sql
UPDATE matches
SET status = 'abandoned', ended_at = ?
WHERE status = 'in_progress';

UPDATE scores
SET status = 'abandoned', finalized_at = ?, updated_at = ?
WHERE match_id IN (SELECT id FROM matches WHERE status = 'abandoned')
  AND finalized_at IS NULL
  AND status <> 'forfeited';
```

### 5.5 Rétention

- Matchs et scores : conservés indéfiniment (volumétrie faible).
- Sessions expirées : purgées quotidiennement.
- `questions_pending` : conservées jusqu'à revue.
- Rooms : mémoire seulement.
- Aucune purge automatique des joueurs.

## 6. Banque de questions

### 6.1 Schéma JSON

```json
{
  "version": 1,
  "generatedAt": "2026-10-22T00:00:00.000Z",
  "questions": [
    {
      "id": "fauna-lion-01",
      "category": "Fauna",
      "subject": "Lion",
      "questionText": "Which big cat is known for the male's mane?",
      "options": ["Lion", "Tiger", "Leopard", "Jaguar"],
      "correctIndex": 0,
      "explanation": "Only male lions grow a prominent mane.",
      "articleTitle": "Lion",
      "articleBody": "The lion is a large felid of the genus Panthera...",
      "image": {
        "url": "https://upload.wikimedia.org/.../Lion.jpg",
        "alt": "A male lion resting in grass",
        "credit": "Wikimedia Commons",
        "license": "CC BY-SA 4.0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:..."
      }
    }
  ]
}
```

### 6.2 Règles éditoriales

- `id` : slug stable `lowercase-with-dashes`, unique, jamais réutilisé.
- `category` : valeur exacte de l'enum `Category`.
- `subject` : 1-80 caractères.
- `questionText` : 1-300 caractères, anglais, une seule question.
- `options` : exactement 4 chaînes non vides, distinctes après normalisation.
- `correctIndex` : entier 0-3.
- `explanation` : 1-500 caractères.
- `articleTitle` : 1-120 caractères.
- `articleBody` : 200-5 000 caractères, texte brut, paragraphes séparés par `\n\n`.
- `image.url` : HTTPS, domaine autorisé (`upload.wikimedia.org`, `commons.wikimedia.org`) pour la v1.
- `image.alt` : obligatoire, 5-200 caractères.
- `image.credit`, `image.license`, `image.sourceUrl` : obligatoires si l'image est présente.
- Aucun HTML, aucun script, aucun `data:` URI.
- La bonne réponse ne doit pas être déductible de la formulation (pas d'indice « all of the above »).

### 6.3 Validation

`scripts/validate-questions.ts` applique :

1. Validation Zod du fichier complet.
2. Unicité des `id`.
3. Unicité globale de `contentHash`.
4. Unicité des sujets normalisés.
5. Exactement 4 options.
6. `correctIndex` valide.
7. Catégorie connue.
8. URL HTTPS et allowlist.
9. Absence de balises HTML.
10. Comptage par catégorie.
11. Seuils :
    - CLASSIC : au moins 200 questions approuvées ;
    - SUBJECT : au moins 20 questions par catégorie ;
    - CONTEST : au moins 10 questions.

Le script échoue avec un code non nul et un rapport lisible. Les articles legacy plus courts que 200 caractères et les catégories sous 20 questions produisent des avertissements non bloquants ; `--strict-editorial` rend les articles courts bloquants.

### 6.4 Hash de contenu

```text
contentHash = sha256(
  normalize(category) + "|" +
  normalize(subject) + "|" +
  normalize(questionText) + "|" +
  normalize(options.join("|"))
)
```

`normalize` : NFKC, trim, lowercase, espaces compactés. Le hash exclut `id`, `correctIndex` et l'article, afin de détecter les doublons de question.

### 6.5 Import en base

`pnpm run data:import` :

1. Lit et valide `data/questions.json`.
2. Ouvre une transaction.
3. Supprime les lignes `questions` qui ne sont plus dans le JSON.
4. Upsert par `id` de toutes les questions.
5. Commit.
6. Logge le nombre de questions importées et le compte par catégorie.

L'import ne touche jamais `questions_pending`, `players`, `matches` ou `scores`.

### 6.6 Extraction depuis le prototype

Le prototype contient la banque dans `services/geminiService.ts`. L'extraction one-shot doit :

1. Parser les objets de question du fichier source.
2. Normaliser `base64Image` en `image.url` (ce sont déjà des URLs Wikimedia).
3. Dédupliquer par sujet normalisé, puis vérifier l'unicité du `contentHash`.
4. Générer des `id` slugs stables à partir de la catégorie, du sujet et d'un suffixe.
5. Produire `data/questions.extracted.json`.
6. Passer `validate-questions`.
7. Faire une revue humaine de la catégorie, des options et de la bonne réponse.
8. Copier dans `data/questions.json` uniquement après validation.

État connu : 244 questions uniques, 12 à 16 par catégorie, 155/257 bonnes réponses en position B. Le mélange runtime corrige le biais de position, mais la revue éditoriale reste obligatoire.

### 6.7 Pipeline Gemini hors ligne

- Aucun appel Gemini au runtime.
- `pnpm run content:generate` peut générer des candidats dans `questions_pending`.
- Chaque candidat est validé par le même schéma.
- Un humain approuve ou rejette.
- Seules les questions approuvées sont ajoutées à `data/questions.json`.
- Les prompts et le modèle sont enregistrés avec le candidat pour l'audit.

## 7. Leaderboard

### 7.1 Périmètre

Inclus :

- matchs `completed` ;
- `player_count >= 2` ;
- scores `completed` ou `eliminated` ;
- tous modes et toutes sources par défaut ; les filtres optionnels `mode` (`CLASSIC`, `SUBJECT`, `CONTEST`) et `source` (`web`, `tiktok`) restreignent le résultat.

Exclus :

- matchs solo ;
- matchs `abandoned` ;
- scores `forfeited` ou `abandoned`.

### 7.2 Agrégation

```sql
WITH filtered AS (
  SELECT s.*, m.ended_at, s.match_id AS m_id
  FROM scores s
  JOIN matches m ON m.id = s.match_id
  WHERE m.status = 'completed'
    AND m.player_count >= 2
    AND s.status IN ('completed', 'eliminated')
    AND (? IS NULL OR m.mode = ?)
    AND (? IS NULL OR m.source = ?)
),
aggregated AS (
  SELECT
    player_id,
    SUM(score) AS total_points,
    COUNT(*) AS matches,
    MAX(score) AS best_match_points,
    SUM(correct_count) AS correct_count,
    MIN(ended_at) AS first_match_at
  FROM filtered
  GROUP BY player_id
),
latest AS (
  SELECT
    player_id,
    pseudo_snapshot,
    avatar_snapshot,
    ROW_NUMBER() OVER (
      PARTITION BY player_id
      ORDER BY ended_at DESC, m_id DESC
    ) AS rn
  FROM filtered
)
SELECT
  a.player_id,
  l.pseudo_snapshot AS pseudo,
  l.avatar_snapshot AS avatar,
  a.total_points,
  a.matches,
  a.best_match_points,
  a.correct_count,
  a.first_match_at
FROM aggregated a
JOIN latest l ON l.player_id = a.player_id AND l.rn = 1
ORDER BY a.total_points DESC,
         a.best_match_points DESC,
         a.correct_count DESC,
         a.first_match_at ASC,
         a.player_id ASC
LIMIT ? OFFSET ?;
```

### 7.3 Règles

- `pseudo` et `avatar` sont les snapshots du match le plus récent du joueur, pas une jointure live.
- Le rang est calculé après agrégation, pas en SQL avec `RANK()`.
- `limit` maximum 100, défaut 50.
- `generatedAt` est l'heure serveur.
- Pas de cache en v1 ; la requête est indexée et rapide.
- Un joueur sans match éligible n'apparaît pas.
- Les égalités parfaites sont ordonnées par `player_id` pour être déterministes.

## 8. Rooms en mémoire

```ts
interface RoomRuntime {
  code: string;
  createdAt: number;
  mode: GameMode;
  difficulty: Difficulty | null;
  category: string | null;
  isPublic: boolean;
  isTikTok: boolean;
  isSolo: boolean;
  tiktokConnected: boolean;
  hostId: string | null;
  settings: RoomSettings;
  phase: RoomPhase;
  pausedFrom: RoomPhase | null;
  phaseStartedAt: number | null;
  phaseEndsAt: number | null;
  pausedAt: number | null;
  remainingMsWhenPaused: number | null;
  phaseToken: string | null;
  stateVersion: number;
  level: number;
  questionIndex: number;
  questionsResolvedThisLevel: number;
  totalQuestionsAnswered: number;
  players: Map<string, PlayerRuntime>;
  question: QuestionRuntime | null;
  usedQuestionIds: Set<string>;
  matchId: string | null;
  timer: NodeJS.Timeout | null;
  lastActivityAt: number;
}
```

- Aucune sérialisation de `RoomRuntime` en base.
- `PlayerRuntime` et `QuestionRuntime` sont des types internes de `shared/types.ts`, jamais sérialisés tels quels. `PlayerRuntime` porte l'état de connexion/socket et la réponse verrouillée ; `QuestionRuntime` porte `optionOrder` et `correctIndex` mélangé.
- Le champ interne `remainingMsWhenPaused` est exposé au client sous `remainingMs` ; `pausedFrom` et `pausedAt` gardent le même nom.
- `tiktokConnected` reflète l'état du connecteur et est exposé tel quel dans `PublicRoomState` ; il vaut toujours `false` en web.
- Les `QuestionRuntime` contiennent `correctIndex` et l'ordre mélangé ; ils ne sont jamais envoyés au client avant `REVEAL`.
- Le scheduler est un `setTimeout` par room, pas un tick global de 200 ms.
- Les timers sont annulés et recréés à chaque transition.
- Une room inactive est fermée après 10 minutes.

## 9. Transactions et idempotence

| Opération | Transaction | Garde |
| --- | --- | --- |
| Créer session | `INSERT players` + `INSERT player_sessions` | token unique |
| Démarrer match | `INSERT matches` + `INSERT scores` | room en COUNTDOWN |
| Révéler | `UPDATE scores` × N | une résolution par question |
| Terminer match | `UPDATE matches` + `UPDATE scores` | `status='in_progress'` |
| Abandonner au boot | `UPDATE matches` + `UPDATE scores` | `status='in_progress'` |
| Importer questions | `DELETE` + `UPSERT` | transaction unique |

Une opération rejouée avec le même état ne doit pas doubler un score. Le moteur vérifie `phase` et `questionId` avant toute écriture.

## 10. Sauvegarde et restauration

- Sauvegarde à chaud :

```sql
VACUUM INTO '/backups/encycla-2026-10-22.db';
```

- Ne jamais copier `encycla.db` pendant une écriture WAL sans checkpoint.
- Restauration : arrêter le serveur, remplacer le fichier, redémarrer, vérifier `PRAGMA integrity_check`.
- Les sauvegardes ne contiennent ni token brut ni secret.
- Fréquence recommandée : quotidienne, rétention 7 jours.

## 11. Intégrité et diagnostics

- Au démarrage : `PRAGMA quick_check` ; si échec, basculer en mode dégradé (section 12).
- Vérifier que les comptes par catégorie respectent les seuils.
- Synchroniser `data/questions.json` vers `questions` au démarrage (`content_hash`).
- Compter les matchs `in_progress` au boot (doivent être marqués abandonnés).
- `GET /api/health` expose `db` et `questions`.
- Les erreurs SQL sont logguées sans paramètres sensibles.

## 12. Mode dégradé sans persistance

- Si SQLite est indisponible, corrompu ou si `PRAGMA quick_check` échoue, le serveur démarre en mode dégradé.
- Les sessions, joueurs et scores sont conservés en mémoire, perdus au redémarrage.
- Les questions sont servies depuis `data/questions.json` en mémoire.
- Le leaderboard renvoie `503 PERSISTENCE_DISABLED`.
- `/api/health` expose `db: "disabled"`. `questions` reste `"ok"` si la banque `data/questions.json` est valide ; il passe à `"degraded"` si un seuil de contenu n'est plus atteint.
- Le jeu continue : rooms, matchs et scores de la session en cours fonctionnent.
- Aucun match n'est écrit en base dans ce mode.
- Le mode dégradé est automatique ; il n'y a pas de `PERSISTENCE=memory` à configurer.
- Une migration échouée n'active pas le mode dégradé : le serveur s'arrête (fail-fast) pour éviter un schéma partiel.
- Les tests du moteur utilisent des repositories en mémoire, indépendamment de ce mode.

## 13. Contraintes de volumétrie

| Donnée | Volume attendu | Limite v1 |
| --- | --- | --- |
| Questions | 200-1 000 | 10 000 |
| Players | 100 000 | — |
| Sessions | 1 par appareil | purge 30 j |
| Matches | 1 000 / mois | — |
| Scores | 8 par match web, 100 par match TikTok | — |
| Rooms simultanées | 50 | 200 |
| Socket par room | 8 web / 2 TikTok (overlay + control) | 8 web / 2 TikTok |

Au-delà de 200 rooms ou 5 000 sockets, passer à une architecture multi-instance (hors périmètre v1).

## 14. Invariants vérifiés par les tests

1. Un token brut n'existe jamais en base.
2. Un `correctIndex` n'est jamais sérialisé dans `PublicRoomState.question`.
3. Un match `completed` a un `ended_at` et tous ses scores `finalized_at`.
4. Un match `abandoned` n'apparaît jamais au leaderboard.
5. Un score ne régresse jamais au cours d'un match.
6. Un import de questions est atomique.
7. Un redémarrage marque tous les matchs `in_progress` comme `abandoned`.
8. Le leaderboard exclut les matchs solo, les forfaits et les abandons.
9. Le leaderboard est stable pour des données identiques.
10. Les comptes par catégorie sont exacts après import.
11. En mode dégradé, aucune écriture SQLite n'est tentée et le jeu reste jouable.
12. Au démarrage, `data/questions.json` est synchronisé vers `questions` en une transaction.
13. À `MATCH_OVER` d'un match complété, `finalRanking` est cohérent avec les joueurs encore membres, les rangs sont déterministes, et `winnerId` est l'unique rang 1 ou `null` en cas d'égalité. Pour tout abandon, `finalRanking` est vide et `winnerId=null`.
