import type { Response } from 'express';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export function sendError(response: Response, status: number, code: string, message: string): void {
  const body: ApiErrorBody = { error: { code, message } };
  response.status(status).json(body);
}
