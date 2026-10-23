import { describe, expect, it } from 'vitest';
import { selectQuestion, shuffleOptions } from '../../server/game/questions';
import { TEST_QUESTIONS } from '../fixtures/questions';

function sequence(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length] as number;
    index += 1;
    return value;
  };
}

describe('question selection', () => {
  it('shuffles options deterministically and remaps the correct index', () => {
    const question = TEST_QUESTIONS[0] as (typeof TEST_QUESTIONS)[number];
    const first = shuffleOptions(question, sequence([0.1, 0.4, 0.8]));
    const second = shuffleOptions(question, sequence([0.1, 0.4, 0.8]));

    expect(first).toEqual(second);
    expect(first.options).toHaveLength(4);
    expect(new Set(first.options).size).toBe(4);
    expect(first.options[first.correctIndex]).toBe(question.options[question.correctIndex]);
    expect([...first.optionOrder].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });

  it('draws without replacement inside a room', () => {
    const first = selectQuestion(TEST_QUESTIONS, 'Fauna', [], sequence([0.2, 0.5, 0.5, 0.5]));
    expect(first).not.toBeNull();
    const second = selectQuestion(
      TEST_QUESTIONS,
      'Fauna',
      [first?.runtime.question.id ?? ''],
      sequence([0.2, 0.5, 0.5, 0.5]),
    );

    expect(second).not.toBeNull();
    expect(second?.runtime.question.id).not.toBe(first?.runtime.question.id);
    expect(second?.recycled).toBe(false);
  });

  it('only selects the requested category', () => {
    const selected = selectQuestion(TEST_QUESTIONS, 'Flora', [], sequence([0.5, 0.5, 0.5, 0.5]));
    expect(selected?.runtime.question.category).toBe('Flora');
  });

  it('recycles the oldest used question when the eligible pool is exhausted', () => {
    const fauna = TEST_QUESTIONS.filter((question) => question.category === 'Fauna');
    const used = fauna.map((question) => question.id);
    const selected = selectQuestion(TEST_QUESTIONS, 'Fauna', used, sequence([0.5, 0.5, 0.5, 0.5]));

    expect(selected?.recycled).toBe(true);
    expect(selected?.runtime.question.id).toBe(used[0]);
  });

  it('returns null when a category has no questions', () => {
    expect(selectQuestion(TEST_QUESTIONS, 'Unknown', [], sequence([0.5]))).toBeNull();
    expect(selectQuestion([], null, [], sequence([0.5]))).toBeNull();
  });
});
