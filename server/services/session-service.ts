import { randomUUID } from 'node:crypto';
import type { Persistence, PlayerRecord, SessionRecord } from '../persistence/repositories';
import {
  SESSION_TTL_MS,
  generateSessionToken,
  hashToken,
  isSessionToken,
} from '../security/tokens';

export type SessionErrorCode =
  'VALIDATION_ERROR' | 'AUTH_REQUIRED' | 'AUTH_INVALID' | 'SESSION_EXPIRED';

export class SessionError extends Error {
  constructor(
    readonly code: SessionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

export interface SessionServiceOptions {
  persistence: Persistence;
  now?: () => number;
  idFactory?: () => string;
  tokenFactory?: () => string;
}

export interface CreatedSession {
  playerId: string;
  pseudo: string;
  token: string;
  expiresAt: number;
}

export interface AuthenticatedSession {
  player: PlayerRecord;
  session: SessionRecord;
}

const AVATARS = ['🦁', '🦊', '🐼', '🦉', '🐙', '🦄', '🐸', '🐝', '🦋', '🐢', '🦜', '🐬'] as const;

const graphemeSegmenter =
  typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

export function normalizePseudo(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function pseudoNormalized(value: string): string {
  return normalizePseudo(value).toLowerCase();
}

export function countGraphemes(value: string): number {
  if (graphemeSegmenter) {
    return [...graphemeSegmenter.segment(value)].length;
  }
  return [...value].length;
}

export function validatePseudo(value: unknown): string {
  if (typeof value !== 'string') {
    throw new SessionError('VALIDATION_ERROR', 'Pseudo is required.');
  }

  const normalized = normalizePseudo(value);
  const length = countGraphemes(normalized);

  if (length < 2 || length > 24) {
    throw new SessionError('VALIDATION_ERROR', 'Pseudo must contain between 2 and 24 characters.');
  }
  if (!/^[\p{L}\p{M}\p{N} _-]+$/u.test(normalized)) {
    throw new SessionError('VALIDATION_ERROR', 'Pseudo contains unsupported characters.');
  }

  return normalized;
}

function avatarFor(playerId: string): string {
  const total = [...playerId].reduce((sum, character) => sum + character.codePointAt(0)!, 0);
  return AVATARS[total % AVATARS.length] as string;
}

export class SessionService {
  private readonly now: () => number;
  private readonly idFactory: () => string;
  private readonly tokenFactory: () => string;

  constructor(private readonly options: SessionServiceOptions) {
    this.now = options.now ?? Date.now;
    this.idFactory = options.idFactory ?? randomUUID;
    this.tokenFactory = options.tokenFactory ?? generateSessionToken;
  }

  create(pseudoInput: unknown): CreatedSession {
    const pseudo = validatePseudo(pseudoInput);
    const now = this.now();
    const playerId = this.idFactory();
    const token = this.tokenFactory();
    const player: PlayerRecord = {
      id: playerId,
      provider: 'web',
      externalId: null,
      pseudo,
      pseudoNormalized: pseudoNormalized(pseudo),
      avatar: avatarFor(playerId),
      createdAt: now,
      updatedAt: now,
    };
    const expiresAt = now + SESSION_TTL_MS;
    const session: SessionRecord = {
      id: this.idFactory(),
      playerId,
      tokenHash: hashToken(token),
      createdAt: now,
      expiresAt,
      lastSeenAt: now,
    };

    const write = (): void => {
      this.options.persistence.players.create(player);
      this.options.persistence.sessions.create(session);
    };

    if (this.options.persistence.db) {
      this.options.persistence.db.transaction(write)();
    } else {
      write();
    }

    return { playerId, pseudo, token, expiresAt };
  }

  authenticate(token: string | null): AuthenticatedSession {
    if (!token) {
      throw new SessionError('AUTH_REQUIRED', 'Authentication is required.');
    }
    if (!isSessionToken(token)) {
      throw new SessionError('AUTH_INVALID', 'The session token is invalid.');
    }

    const session = this.options.persistence.sessions.findByTokenHash(hashToken(token));
    if (!session) {
      throw new SessionError('AUTH_INVALID', 'The session token is invalid.');
    }

    const now = this.now();
    if (session.expiresAt <= now) {
      this.options.persistence.sessions.delete(session.id);
      throw new SessionError('SESSION_EXPIRED', 'The session has expired.');
    }

    const player = this.options.persistence.players.findById(session.playerId);
    if (!player) {
      this.options.persistence.sessions.delete(session.id);
      throw new SessionError('AUTH_INVALID', 'The session player no longer exists.');
    }

    if (now - session.lastSeenAt >= 60_000) {
      this.options.persistence.sessions.touch(session.id, now);
    }

    return { player, session: { ...session, lastSeenAt: now } };
  }

  updatePseudo(playerId: string, pseudoInput: unknown): PlayerRecord {
    const pseudo = validatePseudo(pseudoInput);
    this.options.persistence.players.updatePseudo(
      playerId,
      pseudo,
      pseudoNormalized(pseudo),
      this.now(),
    );
    const player = this.options.persistence.players.findById(playerId);
    if (!player) {
      throw new SessionError('AUTH_INVALID', 'The session player no longer exists.');
    }
    return player;
  }

  purgeExpired(): number {
    return this.options.persistence.sessions.deleteExpired(this.now());
  }
}
