import { test, expect } from '@playwright/test';

test.describe('Home screen', () => {
  test('shows the Wolf Tracker branding and main actions', async ({ page }) => {
    await page.goto('/');

    // App branding
    await expect(page.getByText('WOLF TRACKER')).toBeVisible();
    await expect(page.getByText('Settle the')).toBeVisible();
    await expect(page.getByText('score.')).toBeVisible();
    await expect(page.getByText('No more napkin math.')).toBeVisible();

    // Main action buttons
    await expect(page.getByRole('button', { name: /New Round/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Join Round/i })).toBeVisible();
  });

  test('navigates to create page when clicking New Round', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /New Round/i }).click();
    await expect(page).toHaveURL('/create');
    await expect(page.getByRole('heading', { name: 'Players' })).toBeVisible();
  });

  test('navigates to join page when clicking Join Round', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Join Round/i }).click();
    await expect(page).toHaveURL('/join');
    await expect(page.getByText('Join Round')).toBeVisible();
  });

  test('loads a test game via ?test=1 and redirects to game view', async ({ page }) => {
    await page.goto('/?test=1');

    // Should redirect to game page with test game ID
    await expect(page).toHaveURL(/\/game\/TEST1/);

    // Should see the game header with course name
    await expect(page.getByText('RCC')).toBeVisible();
  });
});
