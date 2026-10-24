import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { migrate } from '../server/db/migrate';
import { loadConfig } from '../server/config';
import { computeContentHash, loadQuestionBank } from '../shared/question-bank';
import type { QuestionRecord } from '../shared/schemas';

export interface QuestionImportResult {
  total: number;
  counts: Record<string, number>;
}

export function syncQuestions(
  db: Database.Database,
  questions: readonly QuestionRecord[],
  now = Date.now(),
): QuestionImportResult {
  const table = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'questions'")
    .get();

  if (!table) {
    throw new Error('questions table is missing; run the database migrations before importing');
  }

  if (questions.length === 0) {
    throw new Error('Cannot import an empty question bank');
  }

  const ids = questions.map((question) => question.id);
  const placeholders = ids.map(() => '?').join(', ');

  const removeMissing = db.prepare(`DELETE FROM questions WHERE id NOT IN (${placeholders})`);

  const upsert = db.prepare(`
    INSERT INTO questions (
      id,
      category,
      subject,
      question_text,
      options_json,
      correct_index,
      explanation,
      article_title,
      article_body,
      image_url,
      image_alt,
      image_credit,
      image_license,
      image_source_url,
      content_hash,
      imported_at,
      updated_at
    ) VALUES (
      @id,
      @category,
      @subject,
      @questionText,
      @optionsJson,
      @correctIndex,
      @explanation,
      @articleTitle,
      @articleBody,
      @imageUrl,
      @imageAlt,
      @imageCredit,
      @imageLicense,
      @imageSourceUrl,
      @contentHash,
      @importedAt,
      @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      category = excluded.category,
      subject = excluded.subject,
      question_text = excluded.question_text,
      options_json = excluded.options_json,
      correct_index = excluded.correct_index,
      explanation = excluded.explanation,
      article_title = excluded.article_title,
      article_body = excluded.article_body,
      image_url = excluded.image_url,
      image_alt = excluded.image_alt,
      image_credit = excluded.image_credit,
      image_license = excluded.image_license,
      image_source_url = excluded.image_source_url,
      content_hash = excluded.content_hash,
      updated_at = excluded.updated_at
  `);

  const counts: Record<string, number> = {};
  for (const question of questions) {
    counts[question.category] = (counts[question.category] ?? 0) + 1;
  }

  const importAll = db.transaction(() => {
    removeMissing.run(...ids);

    for (const question of questions) {
      upsert.run({
        id: question.id,
        category: question.category,
        subject: question.subject,
        questionText: question.questionText,
        optionsJson: JSON.stringify(question.options),
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        articleTitle: question.articleTitle,
        articleBody: question.articleBody,
        imageUrl: question.image?.url ?? null,
        imageAlt: question.image?.alt ?? null,
        imageCredit: question.image?.credit ?? null,
        imageLicense: question.image?.license ?? null,
        imageSourceUrl: question.image?.sourceUrl ?? null,
        contentHash: computeContentHash(question),
        importedAt: now,
        updatedAt: now,
      });
    }
  });

  importAll();

  return { total: questions.length, counts };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith('--')) ?? 'data/questions.json';
  const config = loadConfig();

  const { success, bank, report } = await loadQuestionBank(file);
  if (!success || !bank) {
    for (const error of report.errors) {
      console.error(`ERROR ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  await mkdir(dirname(config.databasePath), { recursive: true });

  const db = new Database(config.databasePath);
  try {
    db.pragma('journal_mode = WAL');
    migrate(db);
    const result = syncQuestions(db, bank.questions);
    console.log(`Imported ${result.total} questions into ${config.databasePath}`);
    for (const [category, count] of Object.entries(result.counts)) {
      console.log(`  ${category}: ${count}`);
    }
  } finally {
    db.close();
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
