import 'dotenv/config';
import { loadQuestionBank, type QuestionBankValidation } from '../shared/question-bank';
import { CATEGORY_VALUES } from '../shared/schemas';
import { createApp } from './app';
import { loadConfig } from './config';
import { initializePersistence } from './persistence/db';

const SESSION_PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

function emptyCounts(): QuestionBankValidation['report']['counts'] {
  return Object.fromEntries(
    CATEGORY_VALUES.map((category) => [category, 0]),
  ) as QuestionBankValidation['report']['counts'];
}

async function loadBank(path: string): Promise<QuestionBankValidation> {
  try {
    return await loadQuestionBank(path);
  } catch (error) {
    return {
      success: false,
      bank: null,
      report: {
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        counts: emptyCounts(),
        total: 0,
        shortArticles: 0,
      },
    };
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  const bank = await loadBank('data/questions.json');
  const questions = bank.bank?.questions ?? [];
  const initialized = initializePersistence({
    databasePath: config.databasePath,
    questions,
  });

  if (initialized.degradedReason) {
    console.warn(`Persistence disabled: ${initialized.degradedReason}`);
  }
  if (initialized.questionsError) {
    console.error(`Question import failed: ${initialized.questionsError}`);
  }
  if (initialized.abandonedMatches > 0) {
    console.info(`Abandoned ${initialized.abandonedMatches} in-progress match(es) at startup.`);
  }

  const app = createApp({
    persistence: initialized.persistence,
    questions: bank.success ? 'ok' : 'degraded',
    questionsUsable: questions.length > 0 && initialized.questionsError === null,
  });
  const server = app.listen(config.port, () => {
    console.info(`Encycla server listening on http://localhost:${config.port}`);
  });
  const purgeTimer = setInterval(() => {
    initialized.persistence.sessions.deleteExpired(Date.now());
  }, SESSION_PURGE_INTERVAL_MS);
  purgeTimer.unref();

  function shutdown(signal: string): void {
    console.info(`${signal} received, shutting down.`);
    clearInterval(purgeTimer);
    server.close((error) => {
      initialized.persistence.close();
      if (error) {
        console.error(error);
        process.exitCode = 1;
      }
    });
  }

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
