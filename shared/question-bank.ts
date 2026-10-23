import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  CATEGORY_VALUES,
  questionBankSchema,
  type QuestionBank,
  type QuestionCategory,
  type QuestionRecord,
} from './schemas';

export interface QuestionBankReport {
  errors: string[];
  warnings: string[];
  counts: Record<QuestionCategory, number>;
  total: number;
  shortArticles: number;
}

export interface QuestionBankValidation {
  success: boolean;
  bank: QuestionBank | null;
  report: QuestionBankReport;
}

export function normalizeContent(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function computeContentHash(
  question: Pick<QuestionRecord, 'category' | 'subject' | 'questionText' | 'options'>,
): string {
  const payload = [
    normalizeContent(question.category),
    normalizeContent(question.subject),
    normalizeContent(question.questionText),
    normalizeContent(question.options.join('|')),
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
}

function emptyCounts(): Record<QuestionCategory, number> {
  return Object.fromEntries(CATEGORY_VALUES.map((category) => [category, 0])) as Record<
    QuestionCategory,
    number
  >;
}

function formatIssues(bank: QuestionBank): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const hashes = new Set<string>();
  const subjects = new Set<string>();

  for (const question of bank.questions) {
    if (ids.has(question.id)) {
      errors.push(`Duplicate id: ${question.id}`);
    }
    ids.add(question.id);

    const hash = computeContentHash(question);
    if (hashes.has(hash)) {
      errors.push(`Duplicate contentHash: ${question.id} (${hash.slice(0, 12)})`);
    }
    hashes.add(hash);

    const subject = normalizeContent(question.subject);
    if (subjects.has(subject)) {
      errors.push(`Duplicate subject: ${question.subject}`);
    }
    subjects.add(subject);
  }

  return errors;
}

export function validateQuestionBank(input: unknown): QuestionBankValidation {
  const counts = emptyCounts();
  const parsed = questionBankSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      bank: null,
      report: {
        errors: parsed.error.issues.map((issue) => {
          const path = issue.path.join('.') || '<root>';
          return `${path}: ${issue.message}`;
        }),
        warnings: [],
        counts,
        total: 0,
        shortArticles: 0,
      },
    };
  }

  const bank = parsed.data;
  for (const question of bank.questions) {
    counts[question.category] += 1;
  }

  const errors = formatIssues(bank);
  const warnings: string[] = [];

  if (bank.questions.length < 200) {
    errors.push(`CLASSIC threshold not met: ${bank.questions.length}/200 approved questions`);
  }

  if (bank.questions.length < 10) {
    errors.push(`CONTEST threshold not met: ${bank.questions.length}/10 approved questions`);
  }

  const shortArticles = bank.questions.filter(
    (question) => question.articleBody.length < 200,
  ).length;
  if (shortArticles > 0) {
    warnings.push(
      `${shortArticles} article(s) are shorter than the editorial target of 200 characters`,
    );
  }

  const missingImages = bank.questions.filter((question) => !question.image).length;
  if (missingImages > 0) {
    warnings.push(`${missingImages} question(s) have no image`);
  }

  const disabledCategories = CATEGORY_VALUES.filter((category) => counts[category] < 20);
  if (disabledCategories.length > 0) {
    warnings.push(
      `SUBJECT disabled for ${disabledCategories.length} categories below 20 questions: ${disabledCategories.join(', ')}`,
    );
  }

  return {
    success: errors.length === 0,
    bank,
    report: {
      errors,
      warnings,
      counts,
      total: bank.questions.length,
      shortArticles,
    },
  };
}

export async function loadQuestionBank(file: string): Promise<QuestionBankValidation> {
  const raw = await readFile(file, 'utf8');

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch (error) {
    return {
      success: false,
      bank: null,
      report: {
        errors: [`Unable to parse JSON: ${error instanceof Error ? error.message : String(error)}`],
        warnings: [],
        counts: emptyCounts(),
        total: 0,
        shortArticles: 0,
      },
    };
  }

  return validateQuestionBank(input);
}
