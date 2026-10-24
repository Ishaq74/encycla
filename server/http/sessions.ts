import { Router, type NextFunction, type Request, type Response } from 'express';
import type { PlayerRecord } from '../persistence/repositories';
import { SessionError, type SessionService } from '../services/session-service';
import { extractBearerToken } from '../security/tokens';
import { sendError } from './errors';

function statusForSessionError(code: SessionError['code']): number {
  return code === 'VALIDATION_ERROR' ? 400 : 401;
}

function handleSessionError(response: Response, error: unknown): boolean {
  if (!(error instanceof SessionError)) {
    return false;
  }
  sendError(response, statusForSessionError(error.code), error.code, error.message);
  return true;
}

function meResponse(player: PlayerRecord): {
  playerId: string;
  pseudo: string;
  avatar: string;
  createdAt: number;
} {
  return {
    playerId: player.id,
    pseudo: player.pseudo,
    avatar: player.avatar,
    createdAt: player.createdAt,
  };
}

export function createSessionsRouter(sessions: SessionService): Router {
  const router = Router();

  router.post('/sessions', (request: Request, response: Response) => {
    try {
      const body = request.body as { pseudo?: unknown } | undefined;
      const created = sessions.create(body?.pseudo);
      response.status(201).json(created);
    } catch (error) {
      if (!handleSessionError(response, error)) {
        throw error;
      }
    }
  });

  router.use('/me', (request: Request, response: Response, next: NextFunction) => {
    try {
      response.locals.player = sessions.authenticate(
        extractBearerToken(request.get('authorization')),
      ).player;
      next();
    } catch (error) {
      if (!handleSessionError(response, error)) {
        next(error);
      }
    }
  });

  router.get('/me', (_request: Request, response: Response) => {
    response.status(200).json(meResponse(response.locals.player as PlayerRecord));
  });

  router.patch('/me', (request: Request, response: Response) => {
    try {
      const body = request.body as { pseudo?: unknown } | undefined;
      const player = sessions.updatePseudo(
        (response.locals.player as PlayerRecord).id,
        body?.pseudo,
      );
      response.status(200).json(meResponse(player));
    } catch (error) {
      if (!handleSessionError(response, error)) {
        throw error;
      }
    }
  });

  return router;
}
