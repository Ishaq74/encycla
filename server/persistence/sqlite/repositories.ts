import type Database from 'better-sqlite3';
import { syncQuestions } from '../../../scripts/import-questions';
import type { QuestionRecord } from '../../../shared/schemas';
import type { PlayerStatus } from '../../../shared/types';
import type { FinalResult, MatchRecord, ScoreRecord } from '../../game/types';
import type {
  LeaderboardEntry,
  LeaderboardFilter,
  MatchRepository,
  NewPlayer,
  NewSession,
  PersistedScoreStatus,
  PlayerRecord,
  PlayerRepository,
  Provider,
  QuestionRepository,
  SessionRecord,
  SessionRepository,
} from '../repositories';

interface PlayerRow {
  id: string;
  provider: Provider;
  external_id: string | null;
  pseudo: string;
  pseudo_normalized: string;
  avatar: string;
  created_at: number;
  updated_at: number;
}

interface SessionRow {
  id: string;
  player_id: string;
  token_hash: string;
  created_at: number;
  expires_at: number;
  last_seen_at: number;
}

interface QuestionRow {
  id: string;
  category: string;
  subject: string;
  question_text: string;
  options_json: string;
  correct_index: number;
  explanation: string;
  article_title: string;
  article_body: string;
  image_url: string | null;
  image_alt: string | null;
  image_credit: string | null;
  image_license: string | null;
  image_source_url: string | null;
}

function mapPlayer(row: PlayerRow): PlayerRecord {
  return {
    id: row.id,
    provider: row.provider,
    externalId: row.external_id,
    pseudo: row.pseudo,
    pseudoNormalized: row.pseudo_normalized,
    avatar: row.avatar,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSession(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    playerId: row.player_id,
    tokenHash: row.token_hash,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastSeenAt: row.last_seen_at,
  };
}

function toPersistedStatus(status: PlayerStatus): PersistedScoreStatus {
  if (status === 'ELIMINATED') {
    return 'eliminated';
  }
  if (status === 'FORFEITED' || status === 'LEFT') {
    return 'forfeited';
  }
  return 'playing';
}

function totalQuestions(mode: MatchRecord['mode']): number {
  if (mode === 'CLASSIC') {
    return 200;
  }
  if (mode === 'SUBJECT') {
    return 20;
  }
  return 10;
}

function winnerFromResults(results: readonly FinalResult[]): string | null {
  const first = results.filter((result) => result.rank === 1);
  return first.length === 1 && first[0]?.tied === false ? first[0].playerId : null;
}

function clampLimit(value: number | undefined): number {
  return Math.min(Math.max(value ?? 50, 1), 100);
}

function mapQuestion(row: QuestionRow): QuestionRecord {
  const question: QuestionRecord = {
    id: row.id,
    category: row.category as QuestionRecord['category'],
    subject: row.subject,
    questionText: row.question_text,
    options: JSON.parse(row.options_json) as [string, string, string, string],
    correctIndex: row.correct_index,
    explanation: row.explanation,
    articleTitle: row.article_title,
    articleBody: row.article_body,
  };

  if (row.image_url !== null) {
    question.image = {
      url: row.image_url,
      alt: row.image_alt ?? '',
      credit: row.image_credit ?? '',
      license: row.image_license ?? '',
      sourceUrl: row.image_source_url ?? row.image_url,
    };
  }

  return question;
}

export class SqlitePlayerRepository implements PlayerRepository {
  constructor(private readonly db: Database.Database) {}

  create(player: NewPlayer): PlayerRecord {
    this.db
      .prepare(
        `INSERT INTO players (
          id, provider, external_id, pseudo, pseudo_normalized, avatar, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        player.id,
        player.provider,
        player.externalId,
        player.pseudo,
        player.pseudoNormalized,
        player.avatar,
        player.createdAt,
        player.updatedAt,
      );
    return player;
  }

  findById(id: string): PlayerRecord | null {
    const row = this.db.prepare('SELECT * FROM players WHERE id = ?').get(id) as
      PlayerRow | undefined;
    return row ? mapPlayer(row) : null;
  }

  findByProviderExternal(provider: Provider, externalId: string): PlayerRecord | null {
    const row = this.db
      .prepare('SELECT * FROM players WHERE provider = ? AND external_id = ?')
      .get(provider, externalId) as PlayerRow | undefined;
    return row ? mapPlayer(row) : null;
  }

  updatePseudo(id: string, pseudo: string, normalized: string, now = Date.now()): void {
    this.db
      .prepare('UPDATE players SET pseudo = ?, pseudo_normalized = ?, updated_at = ? WHERE id = ?')
      .run(pseudo, normalized, now, id);
  }
}

export class SqliteSessionRepository implements SessionRepository {
  constructor(private readonly db: Database.Database) {}

  create(session: NewSession): void {
    this.db
      .prepare(
        `INSERT INTO player_sessions (
          id, player_id, token_hash, created_at, expires_at, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        session.id,
        session.playerId,
        session.tokenHash,
        session.createdAt,
        session.expiresAt,
        session.lastSeenAt,
      );
  }

  findById(id: string): SessionRecord | null {
    const row = this.db.prepare('SELECT * FROM player_sessions WHERE id = ?').get(id) as
      SessionRow | undefined;
    return row ? mapSession(row) : null;
  }

  findByTokenHash(hash: string): SessionRecord | null {
    const row = this.db.prepare('SELECT * FROM player_sessions WHERE token_hash = ?').get(hash) as
      SessionRow | undefined;
    return row ? mapSession(row) : null;
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM player_sessions WHERE id = ?').run(id);
  }

  deleteExpired(now: number): number {
    return this.db.prepare('DELETE FROM player_sessions WHERE expires_at < ?').run(now).changes;
  }

  touch(id: string, now: number): void {
    this.db.prepare('UPDATE player_sessions SET last_seen_at = ? WHERE id = ?').run(now, id);
  }
}

export class SqliteMatchRepository implements MatchRepository {
  constructor(
    private readonly db: Database.Database,
    private readonly players: PlayerRepository,
  ) {}

  private scoreValues(score: ScoreRecord): {
    player: PlayerRecord;
    status: PersistedScoreStatus;
  } {
    const player = this.players.findById(score.playerId);
    if (!player) {
      throw new Error(`Player not found: ${score.playerId}`);
    }
    return { player, status: toPersistedStatus(score.status) };
  }

  create(match: MatchRecord, scores: readonly ScoreRecord[], now = match.startedAt): void {
    const insertMatch = this.db.prepare(
      `INSERT INTO matches (
        id, room_code, mode, category, difficulty, source, player_count, total_questions,
        status, winning_player_id, settings_json, protocol_version, created_at, started_at, ended_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', NULL, ?, 1, ?, NULL, NULL)`,
    );
    const insertScore = this.db.prepare(
      `INSERT INTO scores (
        match_id, player_id, pseudo_snapshot, avatar_snapshot, provider, score,
        correct_count, wrong_count, timeout_count, total_response_ms, best_streak,
        lives_remaining, status, joined_at, updated_at, finalized_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    );

    this.db.transaction(() => {
      insertMatch.run(
        match.id,
        match.roomCode,
        match.mode,
        match.category,
        match.difficulty,
        match.source,
        match.playerCount,
        totalQuestions(match.mode),
        JSON.stringify(match.settings),
        match.startedAt,
      );

      for (const score of scores) {
        const { player, status } = this.scoreValues(score);
        insertScore.run(
          match.id,
          score.playerId,
          player.pseudo,
          player.avatar,
          player.provider,
          score.score,
          score.correctCount,
          score.wrongCount,
          score.timeoutCount,
          score.totalResponseMs,
          score.bestStreak,
          score.lives,
          status,
          player.createdAt,
          now,
        );
      }
    })();
  }

  start(matchId: string, now: number): void {
    this.db
      .prepare('UPDATE matches SET started_at = COALESCE(started_at, ?) WHERE id = ?')
      .run(now, matchId);
  }

  updateScores(matchId: string, scores: readonly ScoreRecord[], now = Date.now()): void {
    const update = this.db.prepare(
      `UPDATE scores SET
        score = ?, correct_count = ?, wrong_count = ?, timeout_count = ?,
        total_response_ms = ?, best_streak = ?, lives_remaining = ?, status = ?, updated_at = ?
      WHERE match_id = ? AND player_id = ?`,
    );
    const insert = this.db.prepare(
      `INSERT INTO scores (
        match_id, player_id, pseudo_snapshot, avatar_snapshot, provider, score,
        correct_count, wrong_count, timeout_count, total_response_ms, best_streak,
        lives_remaining, status, joined_at, updated_at, finalized_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    );

    this.db.transaction(() => {
      for (const score of scores) {
        const { player, status } = this.scoreValues(score);
        const result = update.run(
          score.score,
          score.correctCount,
          score.wrongCount,
          score.timeoutCount,
          score.totalResponseMs,
          score.bestStreak,
          score.lives,
          status,
          now,
          matchId,
          score.playerId,
        );

        if (result.changes === 0) {
          insert.run(
            matchId,
            score.playerId,
            player.pseudo,
            player.avatar,
            player.provider,
            score.score,
            score.correctCount,
            score.wrongCount,
            score.timeoutCount,
            score.totalResponseMs,
            score.bestStreak,
            score.lives,
            status,
            player.createdAt,
            now,
          );
        }
      }

      this.db
        .prepare(
          'UPDATE matches SET player_count = (SELECT COUNT(*) FROM scores WHERE match_id = ?) WHERE id = ?',
        )
        .run(matchId, matchId);
    })();
  }

  complete(matchId: string, results: readonly FinalResult[], endedAt: number): void {
    const updateMatch = this.db.prepare(
      `UPDATE matches SET status = 'completed', ended_at = ?, winning_player_id = ?
       WHERE id = ? AND status = 'in_progress'`,
    );
    const updateScore = this.db.prepare(
      `UPDATE scores SET
        status = CASE WHEN status = 'forfeited' THEN status ELSE ? END,
        finalized_at = ?, updated_at = ?
       WHERE match_id = ? AND player_id = ?`,
    );

    this.db.transaction(() => {
      const result = updateMatch.run(endedAt, winnerFromResults(results), matchId);
      if (result.changes === 0) {
        return;
      }
      for (const entry of results) {
        updateScore.run(
          entry.status === 'ELIMINATED' ? 'eliminated' : 'completed',
          endedAt,
          endedAt,
          matchId,
          entry.playerId,
        );
      }
      this.db
        .prepare(
          `UPDATE scores SET finalized_at = ?, updated_at = ?
           WHERE match_id = ? AND finalized_at IS NULL`,
        )
        .run(endedAt, endedAt, matchId);
    })();
  }

  abandon(matchId: string, endedAt: number): void {
    this.db.transaction(() => {
      this.db
        .prepare("UPDATE matches SET status = 'abandoned', ended_at = ? WHERE id = ?")
        .run(endedAt, matchId);
      this.db
        .prepare(
          `UPDATE scores SET status = 'abandoned', finalized_at = ?, updated_at = ?
           WHERE match_id = ? AND finalized_at IS NULL AND status <> 'forfeited'`,
        )
        .run(endedAt, endedAt, matchId);
    })();
  }

  abandonInProgress(now: number): number {
    return this.db.transaction(() => {
      const result = this.db
        .prepare(
          "UPDATE matches SET status = 'abandoned', ended_at = ? WHERE status = 'in_progress'",
        )
        .run(now);
      this.db
        .prepare(
          `UPDATE scores SET status = 'abandoned', finalized_at = ?, updated_at = ?
           WHERE match_id IN (SELECT id FROM matches WHERE status = 'abandoned')
             AND finalized_at IS NULL
             AND status <> 'forfeited'`,
        )
        .run(now, now);
      return result.changes;
    })();
  }

  leaderboard(filter: LeaderboardFilter = {}): LeaderboardEntry[] {
    const conditions = [
      "m.status = 'completed'",
      'm.player_count >= 2',
      "s.status IN ('completed', 'eliminated')",
    ];
    const params: (string | number)[] = [];

    if (filter.mode != null) {
      conditions.push('m.mode = ?');
      params.push(filter.mode);
    }
    if (filter.source != null) {
      conditions.push('m.source = ?');
      params.push(filter.source);
    }

    const limit = clampLimit(filter.limit);
    const offset = Math.max(filter.offset ?? 0, 0);
    params.push(limit, offset);

    const rows = this.db
      .prepare(
        `WITH filtered AS (
          SELECT s.*, m.ended_at, s.match_id AS m_id
          FROM scores s
          JOIN matches m ON m.id = s.match_id
          WHERE ${conditions.join(' AND ')}
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
        LIMIT ? OFFSET ?`,
      )
      .all(...params) as {
      player_id: string;
      pseudo: string;
      avatar: string;
      total_points: number;
      matches: number;
      best_match_points: number;
      correct_count: number;
      first_match_at: number;
    }[];

    return rows.map((row) => ({
      playerId: row.player_id,
      pseudo: row.pseudo,
      avatar: row.avatar,
      totalPoints: row.total_points,
      matches: row.matches,
      bestMatchPoints: row.best_match_points,
      correctCount: row.correct_count,
      firstMatchAt: row.first_match_at,
    }));
  }
}

export class SqliteQuestionRepository implements QuestionRepository {
  constructor(private readonly db: Database.Database) {}

  listApproved(): QuestionRecord[] {
    const rows = this.db.prepare('SELECT * FROM questions ORDER BY id').all() as QuestionRow[];
    return rows.map(mapQuestion);
  }

  replaceAll(questions: readonly QuestionRecord[], now = Date.now()): number {
    return syncQuestions(this.db, questions, now).total;
  }
}
