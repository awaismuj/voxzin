import { expect, test } from '@playwright/test';

test('homepage renders (content or empty state) with security headers', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  const h = res!.headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  await expect(page.getByRole('link', { name: 'Voxzin home' })).toBeVisible();
});

test('admin area redirects anonymous visitors to sign-in', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('admin API rejects unauthenticated requests', async ({ request }) => {
  expect((await request.get('/api/v1/admin/articles')).status()).toBe(401);
  expect((await request.get('/api/v1/admin/users')).status()).toBe(401);
});

test('mutations without an allowed Origin are rejected (CSRF guard)', async ({ request }) => {
  const res = await request.post('/api/v1/auth/login', { headers: { origin: 'https://evil.example' }, data: { email: 'a@b.co', password: 'x' } });
  expect(res.status()).toBe(403);
});

test('search validates input', async ({ request }) => {
  expect((await request.get('/api/v1/search?q=a')).status()).toBe(400);
});

test('operator-shaped query values are rejected', async ({ request }) => {
  expect((await request.get('/api/v1/articles?category[$ne]=x')).status()).toBe(400);
});
