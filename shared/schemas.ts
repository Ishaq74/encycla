import { z } from 'zod';

export const CATEGORY_VALUES = [
  'Fauna',
  'Flora',
  'Flags',
  'Birds',
  'Trees',
  'Insects',
  'Mushrooms',
  'Architecture',
  'Inventions',
  'Arts & Literature',
  'Geography',
  'Space & Astronomy',
  'History',
  'Mythology',
  'Gastronomy',
  'Music',
  'Sports',
  'Science',
] as const;

export const ALLOWED_IMAGE_HOSTS = ['upload.wikimedia.org', 'commons.wikimedia.org'] as const;

export const categorySchema = z.enum(CATEGORY_VALUES);

const htmlPattern = /<[^>]*>/;

const safeText = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((value) => !htmlPattern.test(value), 'HTML is not allowed');

const httpsUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith('https://'), 'HTTPS is required');

export function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ALLOWED_IMAGE_HOSTS.some((host) => url.hostname === host);
  } catch {
    return false;
  }
}

export const questionImageSchema = z.object({
  url: httpsUrl.refine((value) => isAllowedImageUrl(value), 'Image host is not allowlisted'),
  alt: safeText(5, 200),
  credit: safeText(1, 200),
  license: safeText(1, 200),
  sourceUrl: httpsUrl,
});

export const questionSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id must be a lowercase dash-separated slug'),
    category: categorySchema,
    subject: safeText(1, 80),
    questionText: safeText(1, 300),
    options: z.array(safeText(1, 120)).length(4),
    correctIndex: z.number().int().min(0).max(3),
    explanation: safeText(1, 500),
    articleTitle: safeText(1, 120),
    articleBody: safeText(20, 5000),
    image: questionImageSchema.optional(),
  })
  .superRefine((question, context) => {
    const normalizedOptions = question.options.map((option) =>
      option.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' '),
    );

    if (new Set(normalizedOptions).size !== question.options.length) {
      context.addIssue({
        code: 'custom',
        message: 'options must be distinct after normalization',
        path: ['options'],
      });
    }
  });

export const questionBankSchema = z.object({
  version: z.literal(1),
  generatedAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'generatedAt must be an ISO date'),
  questions: z.array(questionSchema).min(1),
});

export type QuestionCategory = (typeof CATEGORY_VALUES)[number];
export type QuestionImage = z.infer<typeof questionImageSchema>;
export type QuestionRecord = z.infer<typeof questionSchema>;
export type QuestionBank = z.infer<typeof questionBankSchema>;
