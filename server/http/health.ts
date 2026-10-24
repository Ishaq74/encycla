import type { Persistence } from '../persistence/repositories';

export type HealthStatus = 'ok' | 'degraded' | 'error';
export type QuestionsHealth = 'ok' | 'degraded';

export interface HealthInput {
  persistence: Persistence;
  questions: QuestionsHealth;
  questionsUsable?: boolean;
  uptimeMs: number;
  version: string;
}

export interface HealthBody {
  status: HealthStatus;
  db: 'ok' | 'disabled';
  questions: QuestionsHealth;
  uptimeMs: number;
  version: string;
}

export function buildHealth(input: HealthInput): { statusCode: number; body: HealthBody } {
  const db = input.persistence.kind === 'sqlite' ? 'ok' : 'disabled';
  const questionsUsable = input.questionsUsable ?? true;

  let status: HealthStatus = 'ok';
  if (!questionsUsable) {
    status = 'error';
  } else if (db === 'disabled' || input.questions === 'degraded') {
    status = 'degraded';
  }

  return {
    statusCode: status === 'error' ? 503 : 200,
    body: {
      status,
      db,
      questions: input.questions,
      uptimeMs: input.uptimeMs,
      version: input.version,
    },
  };
}
