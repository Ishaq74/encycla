import express, { type ErrorRequestHandler, type Express } from 'express';
import helmet from 'helmet';
import { VERSION } from './config';
import { buildHealth, type QuestionsHealth } from './http/health';
import { sendError } from './http/errors';
import { createSessionsRouter } from './http/sessions';
import { createMemoryPersistence } from './persistence/db';
import type { Persistence } from './persistence/repositories';
import { SessionService } from './services/session-service';

export interface AppOptions {
  persistence?: Persistence;
  questions?: QuestionsHealth;
  questionsUsable?: boolean;
  now?: () => number;
  startedAt?: number;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const persistence = options.persistence ?? createMemoryPersistence();
  const now = options.now ?? Date.now;
  const startedAt = options.startedAt ?? now();
  const questions = options.questions ?? 'degraded';
  const questionsUsable = options.questionsUsable ?? true;
  const sessions = new SessionService({
    persistence,
    ...(options.now === undefined ? {} : { now: options.now }),
  });

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '16kb' }));

  app.use('/api', createSessionsRouter(sessions));

  app.get('/api/health', (_request, response) => {
    const health = buildHealth({
      persistence,
      questions,
      questionsUsable,
      uptimeMs: now() - startedAt,
      version: VERSION,
    });
    response.status(health.statusCode).json(health.body);
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof SyntaxError) {
      sendError(response, 400, 'VALIDATION_ERROR', 'The request body is not valid JSON.');
      return;
    }
    sendError(response, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  };
  app.use(errorHandler);

  return app;
}
