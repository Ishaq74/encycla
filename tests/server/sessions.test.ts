import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../server/app';
import { createMemoryPersistence, initializePersistence } from '../../server/persistence/db';
import type { Persistence } from '../../server/persistence/repositories';
import { SESSION_TTL_MS, hashToken } from '../../server/security/tokens';
import { SessionError, SessionService } from '../../server/services/session-service';

function expectSessionError(callback: () => unknown, code: SessionError['code']): void {
  try {
    callback();
    throw new Error(`Expected SessionError ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(SessionError);
    expect((error as SessionError).code).toBe(code);
  }
}

function makeService(): {
  persistence: Persistence;
  service: SessionService;
  setNow: (value: number) => void;
} {
  const persistence = createMemoryPersistence();
  let now = 1_000;
  let nextId = 0;
  const service = new SessionService({
    persistence,
    now: () => now,
    idFactory: () => `id-${(nextId += 1)}`,
    tokenFactory: () => `sess_${'a'.repeat(43)}`,
  });
  return {
    persistence,
    service,
    setNow: (value) => {
      now = value;
    },
  };
}

describe('SessionService', () => {
  it('creates a hashed session and authenticates the raw token', () => {
    const { persistence, service, setNow } = makeService();
    const created = service.create('  Ada  ');

    expect(created.pseudo).toBe('Ada');
    expect(created.expiresAt).toBe(1_000 + SESSION_TTL_MS);
    expect(created.token).toMatch(/^sess_[A-Za-z0-9_-]{43}$/);
    expect(persistence.sessions.findByTokenHash(hashToken(created.token))).toMatchObject({
      playerId: created.playerId,
      tokenHash: hashToken(created.token),
    });
    expect(persistence.sessions.findByTokenHash(created.token)).toBeNull();

    const authenticated = service.authenticate(created.token);
    expect(authenticated.player.pseudo).toBe('Ada');

    setNow(62_000);
    service.authenticate(created.token);
    expect(persistence.sessions.findByTokenHash(hashToken(created.token))?.lastSeenAt).toBe(62_000);

    setNow(created.expiresAt);
    expectSessionError(() => service.authenticate(created.token), 'SESSION_EXPIRED');
    expect(persistence.sessions.findByTokenHash(hashToken(created.token))).toBeNull();
  });

  it('validates pseudonyms, updates them, and purges expired sessions', () => {
    const { persistence, service, setNow } = makeService();
    const created = service.create('Ada');

    expectSessionError(() => service.create('A'), 'VALIDATION_ERROR');
    expectSessionError(() => service.create('a'.repeat(25)), 'VALIDATION_ERROR');
    expectSessionError(() => service.create('a👨‍👩‍👧‍👦'), 'VALIDATION_ERROR');
    expectSessionError(() => service.create('Alice@example'), 'VALIDATION_ERROR');
    expectSessionError(() => service.create('<b>Alice</b>'), 'VALIDATION_ERROR');
    expectSessionError(() => service.create('\u0000'), 'VALIDATION_ERROR');
    expect(service.create('a'.repeat(24)).pseudo).toHaveLength(24);
    expect(service.create('Bad\u0000Name').pseudo).toBe('BadName');
    expect(service.create('Alice_Bob-1').pseudo).toBe('Alice_Bob-1');

    const updated = service.updatePseudo(created.playerId, 'Ada Lovelace');
    expect(updated).toMatchObject({
      id: created.playerId,
      pseudo: 'Ada Lovelace',
      pseudoNormalized: 'ada lovelace',
    });

    setNow(created.expiresAt + 1);
    expect(service.purgeExpired()).toBe(4);
    expect(persistence.sessions.findById('id-2')).toBeNull();
  });

  it('rejects missing, malformed and unknown tokens', () => {
    const { service } = makeService();
    service.create('Ada');

    expectSessionError(() => service.authenticate(null), 'AUTH_REQUIRED');
    expectSessionError(() => service.authenticate('not-a-session'), 'AUTH_INVALID');
    expectSessionError(() => service.authenticate(`sess_${'b'.repeat(43)}`), 'AUTH_INVALID');
  });
});

describe('session HTTP routes', () => {
  let server: Server;
  let baseUrl: string;
  let persistence: Persistence;

  beforeAll(async () => {
    persistence = createMemoryPersistence();
    server = createApp({ persistence, questions: 'ok' }).listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Server did not expose a TCP address.');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    persistence.close();
  });

  it('creates and reads a session', async () => {
    const createdResponse = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pseudo: 'Ada' }),
    });
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()) as {
      playerId: string;
      pseudo: string;
      token: string;
      expiresAt: number;
    };
    expect(created).toMatchObject({ pseudo: 'Ada' });
    expect(created.token).toMatch(/^sess_/);

    const meResponse = await fetch(`${baseUrl}/api/me`, {
      headers: { authorization: `Bearer ${created.token}` },
    });
    expect(meResponse.status).toBe(200);
    expect(await meResponse.json()).toMatchObject({
      playerId: created.playerId,
      pseudo: 'Ada',
    });

    const updatedResponse = await fetch(`${baseUrl}/api/me`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${created.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ pseudo: 'Grace Hopper' }),
    });
    expect(updatedResponse.status).toBe(200);
    expect(await updatedResponse.json()).toMatchObject({ pseudo: 'Grace Hopper' });
  });

  it('rejects invalid requests and authentication', async () => {
    const missingAuth = await fetch(`${baseUrl}/api/me`);
    expect(missingAuth.status).toBe(401);
    expect(await missingAuth.json()).toMatchObject({
      error: { code: 'AUTH_REQUIRED' },
    });

    const invalidAuth = await fetch(`${baseUrl}/api/me`, {
      headers: { authorization: 'Bearer invalid' },
    });
    expect(invalidAuth.status).toBe(401);

    const invalidPseudo = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pseudo: 'A' }),
    });
    expect(invalidPseudo.status).toBe(400);
    expect(await invalidPseudo.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });

    const malformedJson = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });
    expect(malformedJson.status).toBe(400);
    expect(await malformedJson.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });
});

describe('health checks', () => {
  it('reports ok when SQLite and questions are available', async () => {
    const initialized = initializePersistence({ databasePath: ':memory:' });
    const app = createApp({ persistence: initialized.persistence, questions: 'ok' });
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Server did not expose a TCP address.');
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'ok',
      db: 'ok',
      questions: 'ok',
    });

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    initialized.persistence.close();
  });

  it('returns 503 when the question bank is unusable', async () => {
    const persistence = createMemoryPersistence();
    const app = createApp({
      persistence,
      questions: 'degraded',
      questionsUsable: false,
    });
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Server did not expose a TCP address.');
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: 'error' });

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    persistence.close();
  });
});
