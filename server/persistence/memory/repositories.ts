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

interface MemoryScore {
  playerId: string;
  pseudoSnapshot: string;
  avatarSnapshot: string;
  provider: Provider;
  score: number;
  correctCount: number;
  wrongCount: number;
  timeoutCount: number;
  totalResponseMs: number;
  bestStreak: number;
  livesRemaining: number;
  status: PersistedScoreStatus;
  joinedAt: number;
  updatedAt: number;
  finalizedAt: number | null;
}

interface MemoryMatch {
  id: string;
  roomCode: string;
  mode: MatchRecord['mode'];
  category: string | null;
  difficulty: MatchRecord['difficulty'];
  source: Provider;
  playerCount: number;
  totalQuestions: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  winningPlayerId: string | null;
  settings: MatchRecord['settings'];
  protocolVersion: number;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  scores: Map<string, MemoryScore>;
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

export class MemoryPlayerRepository implements PlayerRepository {
  private readonly players = new Map<string, PlayerRecord>();

  create(player: NewPlayer): PlayerRecord {
    if (this.players.has(player.id)) {
      throw new Error(`Player already exists: ${player.id}`);
    }
    this.players.set(player.id, { ...player });
    return { ...player };
  }

  findById(id: string): PlayerRecord | null {
    const player = this.players.get(id);
    return player ? { ...player } : null;
  }

  findByProviderExternal(provider: Provider, externalId: string): PlayerRecord | null {
    for (const player of this.players.values()) {
      if (player.provider === provider && player.externalId === externalId) {
        return { ...player };
      }
    }
    return null;
  }

  updatePseudo(id: string, pseudo: string, normalized: string, now = Date.now()): void {
    const player = this.players.get(id);
    if (!player) {
      return;
    }
    this.players.set(id, {
      ...player,
      pseudo,
      pseudoNormalized: normalized,
      updatedAt: now,
    });
  }
}

export class MemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, SessionRecord>();

  create(session: NewSession): void {
    if (this.sessions.has(session.id)) {
      throw new Error(`Session already exists: ${session.id}`);
    }
    this.sessions.set(session.id, { ...session });
  }

  findById(id: string): SessionRecord | null {
    const session = this.sessions.get(id);
    return session ? { ...session } : null;
  }

  findByTokenHash(hash: string): SessionRecord | null {
    for (const session of this.sessions.values()) {
      if (session.tokenHash === hash) {
        return { ...session };
      }
    }
    return null;
  }

  delete(id: string): void {
    this.sessions.delete(id);
  }

  deleteExpired(now: number): number {
    let deleted = 0;
    for (const [id, session] of this.sessions) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
        deleted += 1;
      }
    }
    return deleted;
  }

  touch(id: string, now: number): void {
    const session = this.sessions.get(id);
    if (session) {
      this.sessions.set(id, { ...session, lastSeenAt: now });
    }
  }
}

export class MemoryMatchRepository implements MatchRepository {
  private readonly matches = new Map<string, MemoryMatch>();

  constructor(private readonly players: PlayerRepository) {}

  private playerSnapshot(
    playerId: string,
    fallbackAt: number,
  ): {
    pseudo: string;
    avatar: string;
    provider: Provider;
    joinedAt: number;
  } {
    const player = this.players.findById(playerId);
    return {
      pseudo: player?.pseudo ?? playerId,
      avatar: player?.avatar ?? '?',
      provider: player?.provider ?? 'web',
      joinedAt: player?.createdAt ?? fallbackAt,
    };
  }

  private scoreFromEngine(score: ScoreRecord, now: number, existing?: MemoryScore): MemoryScore {
    const snapshot = this.playerSnapshot(score.playerId, now);
    return {
      playerId: score.playerId,
      pseudoSnapshot: existing?.pseudoSnapshot ?? snapshot.pseudo,
      avatarSnapshot: existing?.avatarSnapshot ?? snapshot.avatar,
      provider: existing?.provider ?? snapshot.provider,
      score: score.score,
      correctCount: score.correctCount,
      wrongCount: score.wrongCount,
      timeoutCount: score.timeoutCount,
      totalResponseMs: score.totalResponseMs,
      bestStreak: score.bestStreak,
      livesRemaining: score.lives,
      status: toPersistedStatus(score.status),
      joinedAt: existing?.joinedAt ?? snapshot.joinedAt,
      updatedAt: now,
      finalizedAt: existing?.finalizedAt ?? null,
    };
  }

  create(match: MatchRecord, scores: readonly ScoreRecord[], now = match.startedAt): void {
    if (this.matches.has(match.id)) {
      throw new Error(`Match already exists: ${match.id}`);
    }
    const stored: MemoryMatch = {
      id: match.id,
      roomCode: match.roomCode,
      mode: match.mode,
      category: match.category,
      difficulty: match.difficulty,
      source: match.source,
      playerCount: match.playerCount,
      totalQuestions: totalQuestions(match.mode),
      status: 'in_progress',
      winningPlayerId: null,
      settings: { ...match.settings },
      protocolVersion: 1,
      createdAt: match.startedAt,
      startedAt: null,
      endedAt: null,
      scores: new Map(),
    };

    for (const score of scores) {
      stored.scores.set(score.playerId, this.scoreFromEngine(score, now));
    }
    this.matches.set(match.id, stored);
  }

  start(matchId: string, now: number): void {
    const match = this.matches.get(matchId);
    if (match && match.startedAt === null) {
      match.startedAt = now;
    }
  }

  updateScores(matchId: string, scores: readonly ScoreRecord[], now = Date.now()): void {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error(`Match not found: ${matchId}`);
    }
    for (const score of scores) {
      const existing = match.scores.get(score.playerId);
      match.scores.set(score.playerId, this.scoreFromEngine(score, now, existing));
    }
  }

  complete(matchId: string, results: readonly FinalResult[], endedAt: number): void {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'in_progress') {
      return;
    }

    match.status = 'completed';
    match.endedAt = endedAt;
    match.winningPlayerId = winnerFromResults(results);

    for (const result of results) {
      const score = match.scores.get(result.playerId);
      if (!score) {
        continue;
      }
      if (score.status !== 'forfeited') {
        score.status = result.status === 'ELIMINATED' ? 'eliminated' : 'completed';
      }
      score.finalizedAt = endedAt;
      score.updatedAt = endedAt;
    }

    for (const score of match.scores.values()) {
      if (score.finalizedAt === null) {
        score.finalizedAt = endedAt;
        score.updatedAt = endedAt;
      }
    }
  }

  abandon(matchId: string, endedAt: number): void {
    const match = this.matches.get(matchId);
    if (!match) {
      return;
    }
    match.status = 'abandoned';
    match.endedAt = endedAt;
    match.winningPlayerId = null;
    for (const score of match.scores.values()) {
      if (score.finalizedAt === null && score.status !== 'forfeited') {
        score.status = 'abandoned';
        score.finalizedAt = endedAt;
        score.updatedAt = endedAt;
      }
    }
  }

  abandonInProgress(now: number): number {
    let count = 0;
    for (const match of this.matches.values()) {
      if (match.status === 'in_progress') {
        this.abandon(match.id, now);
        count += 1;
      }
    }
    return count;
  }

  leaderboard(filter: LeaderboardFilter = {}): LeaderboardEntry[] {
    const aggregated = new Map<
      string,
      LeaderboardEntry & { latestEndedAt: number; latestMatchId: string }
    >();

    for (const match of this.matches.values()) {
      if (match.status !== 'completed' || match.playerCount < 2) {
        continue;
      }
      if (filter.mode != null && match.mode !== filter.mode) {
        continue;
      }
      if (filter.source != null && match.source !== filter.source) {
        continue;
      }

      for (const score of match.scores.values()) {
        if (score.status !== 'completed' && score.status !== 'eliminated') {
          continue;
        }
        const current = aggregated.get(score.playerId);
        const endedAt = match.endedAt ?? 0;
        if (!current) {
          aggregated.set(score.playerId, {
            playerId: score.playerId,
            pseudo: score.pseudoSnapshot,
            avatar: score.avatarSnapshot,
            totalPoints: score.score,
            matches: 1,
            bestMatchPoints: score.score,
            correctCount: score.correctCount,
            firstMatchAt: endedAt,
            latestEndedAt: endedAt,
            latestMatchId: match.id,
          });
          continue;
        }

        current.totalPoints += score.score;
        current.matches += 1;
        current.bestMatchPoints = Math.max(current.bestMatchPoints, score.score);
        current.correctCount += score.correctCount;
        current.firstMatchAt = Math.min(current.firstMatchAt, endedAt);
        if (
          endedAt > current.latestEndedAt ||
          (endedAt === current.latestEndedAt && match.id > current.latestMatchId)
        ) {
          current.latestEndedAt = endedAt;
          current.latestMatchId = match.id;
          current.pseudo = score.pseudoSnapshot;
          current.avatar = score.avatarSnapshot;
        }
      }
    }

    const limit = clampLimit(filter.limit);
    const offset = Math.max(filter.offset ?? 0, 0);

    return [...aggregated.values()]
      .sort(
        (left, right) =>
          right.totalPoints - left.totalPoints ||
          right.bestMatchPoints - left.bestMatchPoints ||
          right.correctCount - left.correctCount ||
          left.firstMatchAt - right.firstMatchAt ||
          left.playerId.localeCompare(right.playerId),
      )
      .slice(offset, offset + limit)
      .map(({ latestEndedAt: _latestEndedAt, latestMatchId: _latestMatchId, ...entry }) => entry);
  }
}

export class MemoryQuestionRepository implements QuestionRepository {
  private questions: QuestionRecord[];

  constructor(questions: readonly QuestionRecord[] = []) {
    this.questions = questions.map((question) => structuredClone(question));
  }

  listApproved(): QuestionRecord[] {
    return this.questions.map((question) => structuredClone(question));
  }

  replaceAll(questions: readonly QuestionRecord[]): number {
    this.questions = questions.map((question) => structuredClone(question));
    return this.questions.length;
  }
}
