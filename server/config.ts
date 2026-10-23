export const VERSION = '1.0.0';

export interface ServerConfig {
  port: number;
  publicOrigin: string | null;
  databasePath: string;
  logLevel: string;
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${value}`);
  }
  return port;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: parsePort(env.PORT),
    publicOrigin: env.PUBLIC_ORIGIN ?? null,
    databasePath: env.DATABASE_PATH ?? 'data/encycla.db',
    logLevel: env.LOG_LEVEL ?? 'info',
  };
}
