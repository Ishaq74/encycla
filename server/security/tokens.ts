import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_TOKEN_PREFIX = 'sess_';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_TOKEN_BYTES = 32;
const SESSION_TOKEN_PATTERN = /^sess_[A-Za-z0-9_-]{43}$/;

export function generateOpaqueToken(prefix: string, bytes = 32): string {
  return `${prefix}${randomBytes(bytes).toString('base64url')}`;
}

export function generateSessionToken(): string {
  return generateOpaqueToken(SESSION_TOKEN_PREFIX, SESSION_TOKEN_BYTES);
}

export function isSessionToken(token: string): boolean {
  return SESSION_TOKEN_PATTERN.test(token);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenHashesEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const match = /^Bearer ([^\s]+)$/i.exec(header);
  return match?.[1] ?? null;
}
