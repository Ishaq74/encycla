import type { QuestionRecord } from '../../shared/schemas';
import type { QuestionRuntime } from './types';

export interface QuestionSelection {
  runtime: QuestionRuntime;
  recycled: boolean;
}

function randomIndex(length: number, random: () => number): number {
  if (length <= 1) {
    return 0;
  }
  const value = Math.floor(random() * length);
  return Math.min(length - 1, Math.max(0, value));
}

export function shuffleOptions(question: QuestionRecord, random: () => number): QuestionRuntime {
  const optionOrder = question.options.map((_, index) => index);

  for (let index = optionOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    const current = optionOrder[index] as number;
    optionOrder[index] = optionOrder[swapIndex] as number;
    optionOrder[swapIndex] = current;
  }

  return {
    question,
    optionOrder,
    options: optionOrder.map((index) => question.options[index] as string),
    correctIndex: optionOrder.indexOf(question.correctIndex),
  };
}

export function selectQuestion(
  questions: readonly QuestionRecord[],
  category: string | null,
  usedQuestionIds: readonly string[],
  random: () => number,
): QuestionSelection | null {
  const eligible = category === null
    ? questions
    : questions.filter((question) => question.category === category);

  if (eligible.length === 0) {
    return null;
  }

  const used = new Set(usedQuestionIds);
  const unused = eligible.filter((question) => !used.has(question.id));

  if (unused.length > 0) {
    const question = unused[randomIndex(unused.length, random)] as QuestionRecord;
    return { runtime: shuffleOptions(question, random), recycled: false };
  }

  const oldestUsedId = usedQuestionIds.find((id) =>
    eligible.some((question) => question.id === id),
  );
  if (oldestUsedId === undefined) {
    return null;
  }

  const question = eligible.find((candidate) => candidate.id === oldestUsedId);
  if (!question) {
    return null;
  }

  return { runtime: shuffleOptions(question, random), recycled: true };
}
