import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { GENERAL_POOL, TRIVIA_DATABASE } from '../services/geminiService';
import { CATEGORY_VALUES, type QuestionCategory, type QuestionRecord } from '../shared/schemas';
import { computeContentHash, normalizeContent } from '../shared/question-bank';
import type { QuestionData } from '../types';

const OUTPUT_PATH = resolve('data/questions.extracted.json');

const GENERAL_CATEGORY: Record<string, QuestionCategory> = {
  'full moon': 'Space & Astronomy',
  'glass of water': 'Science',
  'planet earth': 'Space & Astronomy',
  'pyramids of giza': 'Architecture',
  'great wall of china': 'Architecture',
  colosseum: 'Architecture',
  'mona lisa': 'Arts & Literature',
  'eiffel tower': 'Architecture',
  sunflower: 'Flora',
  lion: 'Fauna',
  'soccer ball': 'Sports',
  'statue of liberty': 'Architecture',
  violin: 'Music',
  sushi: 'Gastronomy',
  microscope: 'Inventions',
  elephant: 'Fauna',
  rose: 'Flora',
  butterfly: 'Insects',
  pizza: 'Gastronomy',
  guitar: 'Music',
};

interface LegacyEntry {
  category: QuestionCategory;
  data: QuestionData;
  priority: number;
  sourceIndex: number;
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generatedAt(): string {
  const epoch = process.env.SOURCE_DATE_EPOCH;

  if (epoch) {
    const timestamp = Number(epoch);
    if (!Number.isFinite(timestamp)) {
      throw new Error(`Invalid SOURCE_DATE_EPOCH: ${epoch}`);
    }
    return new Date(timestamp * 1000).toISOString();
  }

  return new Date().toISOString();
}

function toQuestion(entry: LegacyEntry, id: string): QuestionRecord {
  const source = entry.data;
  const imageUrl = source.base64Image?.trim();

  return {
    id,
    category: entry.category,
    subject: source.subject.trim(),
    questionText: source.questionText.trim(),
    options: source.options.map((option) => option.trim()),
    correctIndex: source.correctAnswerIndex,
    explanation: source.explanation.trim(),
    articleTitle: source.articleTitle.trim(),
    articleBody: source.articleBody.trim(),
    ...(imageUrl
      ? {
          image: {
            url: imageUrl,
            alt: `${source.subject.trim()} - Wikimedia Commons image`,
            credit: 'Wikimedia Commons',
            license: 'See source file',
            sourceUrl: imageUrl,
          },
        }
      : {}),
  };
}

function collectEntries(): LegacyEntry[] {
  const entries: LegacyEntry[] = [];
  let sourceIndex = 0;

  for (const [category, questions] of Object.entries(TRIVIA_DATABASE)) {
    if (!CATEGORY_VALUES.includes(category as QuestionCategory)) {
      throw new Error(`Unknown legacy category: ${category}`);
    }

    for (const data of questions) {
      entries.push({
        category: category as QuestionCategory,
        data,
        priority: 0,
        sourceIndex,
      });
      sourceIndex += 1;
    }
  }

  for (const data of GENERAL_POOL) {
    const category = GENERAL_CATEGORY[normalizeContent(data.subject)];
    if (!category) {
      throw new Error(`No category mapping for general subject: ${data.subject}`);
    }

    entries.push({
      category,
      data,
      priority: 1,
      sourceIndex,
    });
    sourceIndex += 1;
  }

  return entries;
}

function deduplicate(entries: LegacyEntry[]): {
  unique: LegacyEntry[];
  removed: LegacyEntry[];
} {
  const bySubject = new Map<string, LegacyEntry>();
  const removed: LegacyEntry[] = [];

  for (const entry of entries) {
    const key = normalizeContent(entry.data.subject);
    const existing = bySubject.get(key);

    if (!existing) {
      bySubject.set(key, entry);
      continue;
    }

    if (entry.priority < existing.priority) {
      removed.push(existing);
      bySubject.set(key, entry);
      continue;
    }

    removed.push(entry);
  }

  return {
    unique: [...bySubject.values()].sort((left, right) => {
      const categoryDelta =
        CATEGORY_VALUES.indexOf(left.category) - CATEGORY_VALUES.indexOf(right.category);
      return categoryDelta === 0 ? left.sourceIndex - right.sourceIndex : categoryDelta;
    }),
    removed,
  };
}

function buildIds(entries: LegacyEntry[]): QuestionRecord[] {
  const counters = new Map<string, number>();

  return entries.map((entry) => {
    const base = `${slugify(entry.category)}-${slugify(entry.data.subject)}`;
    const next = (counters.get(base) ?? 0) + 1;
    counters.set(base, next);

    const suffix = String(next).padStart(2, '0');
    return toQuestion(entry, `${base}-${suffix}`);
  });
}

function countByCategory(questions: QuestionRecord[]): Record<QuestionCategory, number> {
  const counts = Object.fromEntries(CATEGORY_VALUES.map((category) => [category, 0])) as Record<
    QuestionCategory,
    number
  >;

  for (const question of questions) {
    counts[question.category] += 1;
  }

  return counts;
}

async function main(): Promise<void> {
  const entries = collectEntries();
  const { unique, removed } = deduplicate(entries);
  const questions = buildIds(unique);

  const hashes = new Map<string, string>();
  for (const question of questions) {
    const hash = computeContentHash(question);
    const existing = hashes.get(hash);
    if (existing) {
      throw new Error(`Content hash collision between ${existing} and ${question.id}`);
    }
    hashes.set(hash, question.id);
  }

  const bank = {
    version: 1 as const,
    generatedAt: generatedAt(),
    questions,
  };

  const prettierConfig = await prettier.resolveConfig(OUTPUT_PATH);
  const output = await prettier.format(JSON.stringify(bank), {
    ...prettierConfig,
    parser: 'json',
  });

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, output, 'utf8');

  const counts = countByCategory(questions);
  console.log(`Extracted ${questions.length} unique questions to ${OUTPUT_PATH}`);
  console.log(`Source entries: ${entries.length}; removed duplicates: ${removed.length}`);
  console.log('Questions per category:');
  for (const category of CATEGORY_VALUES) {
    console.log(`  ${category}: ${counts[category]}`);
  }

  if (removed.length > 0) {
    console.log('Removed duplicate subjects:');
    for (const entry of removed) {
      console.log(`  ${entry.category}: ${entry.data.subject}`);
    }
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
