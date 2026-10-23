import express, { type Express } from 'express';
import helmet from 'helmet';
import { VERSION } from './config';

const startedAt = Date.now();

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_request, response) => {
    response.status(200).json({
      status: 'degraded',
      db: 'disabled',
      questions: 'degraded',
      uptimeMs: Date.now() - startedAt,
      version: VERSION,
    });
  });

  return app;
}
