import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { loadQuestionBank } from '../../shared/question-bank';

describe('question bank', () => {
  it('validates the approved bank', async () => {
    const { success, report } = await loadQuestionBank('data/questions.json');

    expect(report.errors).toEqual([]);
    expect(success).toBe(true);
    expect(report.total).toBe(244);
    expect(report.counts.Fauna).toBe(16);
    expect(report.counts.Trees).toBe(12);
    expect(report.counts.Science).toBe(13);
  });

  it('keeps the approved questions identical to the extraction', async () => {
    const approved = JSON.parse(await readFile('data/questions.json', 'utf8')) as {
      version: number;
      questions: unknown;
    };
    const extracted = JSON.parse(await readFile('data/questions.extracted.json', 'utf8')) as {
      version: number;
      questions: unknown;
    };

    expect(approved.version).toBe(extracted.version);
    expect(approved.questions).toEqual(extracted.questions);
  });
});
