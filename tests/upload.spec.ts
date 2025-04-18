import { test, expect } from '@playwright/test';

test('JPEG upload renders in chat', async ({ page, baseURL }) => {
  await page.goto(baseURL || 'http://localhost:3000');
  
  // sign‑in or sign‑up helper
  try {
    // Check if login form is present
    const emailInput = await page.getByRole('textbox', { name: /email/i });
    if (await emailInput.isVisible()) {
      // Use environment variables for credentials if available
      const testEmail = process.env.TEST_EMAIL || 'u@e.com';
      const testPassword = process.env.TEST_PASSWORD || '123456';
      
      await emailInput.fill(testEmail);
      await page.getByRole('textbox', { name: /password/i }).fill(testPassword);
      await page.getByRole('button', { name: /sign in|sign up/i }).click();
    }
  } catch (error) {
    console.log('Authentication not required or already authenticated');
  }

  // upload the sample asset
  await page.setInputFiles('input[type=file]', 'tests/assets/test.jpg');
  await page.getByRole('button', { name: /send/i }).click();

  // image bubble should appear
  await expect(
    page.getByAltText(/test\.jpg/i)
  ).toBeVisible({ timeout: 6_000 });
}); 