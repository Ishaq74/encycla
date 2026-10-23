import 'dotenv/config';
import { createApp } from './app';
import { loadConfig } from './config';

const config = loadConfig();
const server = createApp().listen(config.port, () => {
  console.info(`Encycla server listening on http://localhost:${config.port}`);
});

function shutdown(signal: string): void {
  console.info(`${signal} received, shutting down.`);
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
