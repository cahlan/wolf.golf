import { test, expect } from '@playwright/test';

test.describe('Join a game as spectator', () => {
  test('shows join page with code input', async ({ page }) => {
    await page.goto('/join');

    await expect(page.getByText('Join Round')).toBeVisible();
    await expect(page.getByText('Enter the 5-letter code from the scorekeeper.')).toBeVisible();

    // Code input field
    const codeInput = page.getByPlaceholder('ABCDE');
    await expect(codeInput).toBeVisible();

    // Join button should be disabled until 5 chars entered
    const joinBtn = page.getByRole('button', { name: /Join as Spectator/i });
    await expect(joinBtn).toBeVisible();
    await expect(joinBtn).toBeDisabled();
  });

  test('code input auto-uppercases and limits to 5 chars', async ({ page }) => {
    await page.goto('/join');

    const codeInput = page.getByPlaceholder('ABCDE');
    await codeInput.fill('abcde');
    await expect(codeInput).toHaveValue('ABCDE');

    // Typing more than 5 chars should be limited
    await codeInput.fill('abcdefgh');
    await expect(codeInput).toHaveValue('ABCDE');
  });

  test('join button enables when 5-char code is entered', async ({ page }) => {
    await page.goto('/join');

    const codeInput = page.getByPlaceholder('ABCDE');
    const joinBtn = page.getByRole('button', { name: /Join as Spectator/i });

    // Initially disabled
    await expect(joinBtn).toBeDisabled();

    // Type 4 chars — still disabled
    await codeInput.fill('ABCD');
    await expect(joinBtn).toBeDisabled();

    // Type 5 chars — enabled
    await codeInput.fill('ABCDE');
    await expect(joinBtn).toBeEnabled();
  });

  test('shows error for invalid game code', async ({ page }) => {
    await page.goto('/join');

    const codeInput = page.getByPlaceholder('ABCDE');
    await codeInput.fill('ZZZZZ');

    await page.getByRole('button', { name: /Join as Spectator/i }).click();

    // Should show error message (Supabase call will fail without a real connection)
    await expect(page.getByText(/Game not found|error/i)).toBeVisible({ timeout: 10000 });
  });

  test('back button navigates to home', async ({ page }) => {
    await page.goto('/join');

    // Click the back button
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page).toHaveURL('/');
  });
});
