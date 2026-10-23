import { expect, test } from '@playwright/test';

test('health endpoint responds through the client proxy', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { version: string };
  expect(body.version).toBe('1.0.0');
});
