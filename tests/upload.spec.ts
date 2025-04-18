import { test, expect } from '@playwright/test';

test('JPEG upload renders in chat', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // sign‑in or sign‑up helper
  try {
    // Check if login form is present
    const emailInput = await page.getByRole('textbox', { name: /email/i });
    if (await emailInput.isVisible()) {
      await emailInput.fill('u@e.com');
      await page.getByRole('textbox', { name: /password/i }).fill('123456');
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