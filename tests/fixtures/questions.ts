import { CATEGORY_VALUES, type QuestionCategory, type QuestionRecord } from '../../shared/schemas';
import type { QuestionProvider } from '../../server/game/types';

const CATEGORY_COUNTS: Record<QuestionCategory, number> = Object.fromEntries(
  CATEGORY_VALUES.map((category) => [category, 10]),
) as Record<QuestionCategory, number>;

CATEGORY_COUNTS.Fauna = 20;
CATEGORY_COUNTS.Flora = 20;

function slug(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function makeQuestion(
  category: QuestionCategory,
  categoryIndex: number,
  questionIndex: number,
): QuestionRecord {
  const subject = `${category} subject ${questionIndex + 1}`;
  return {
    id: `${slug(category)}-q-${String(questionIndex + 1).padStart(2, '0')}`,
    category,
    subject,
    questionText: `Which statement matches ${subject}?`,
    options: [
      `First option for ${subject}`,
      `Second option for ${subject}`,
      `Third option for ${subject}`,
      `Fourth option for ${subject}`,
    ],
    correctIndex: (categoryIndex + questionIndex) % 4,
    explanation: `Explanation for ${subject}.`,
    articleTitle: `The story of ${subject}`,
    articleBody: `This is a deterministic fixture article about ${subject}. `.repeat(5),
  };
}

export const TEST_QUESTIONS: readonly QuestionRecord[] = CATEGORY_VALUES.flatMap(
  (category, categoryIndex) =>
    Array.from({ length: CATEGORY_COUNTS[category] }, (_, questionIndex) =>
      makeQuestion(category, categoryIndex, questionIndex),
    ),
);

export function makeProvider(
  questions: readonly QuestionRecord[] = TEST_QUESTIONS,
): QuestionProvider {
  return {
    getQuestions: () => questions,
  };
}

export function makeQuestionBank(count: number): QuestionRecord[] {
  return Array.from({ length: count }, (_, index) => {
    const base = TEST_QUESTIONS[index % TEST_QUESTIONS.length] as QuestionRecord;
    return {
      ...base,
      id: `${base.id}-${index}`,
      subject: `${base.subject} ${index}`,
    };
  });
}
