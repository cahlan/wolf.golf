import { test, expect } from '@playwright/test';

test.describe('View standings', () => {
  test.beforeEach(async ({ page }) => {
    // Load test game with 15 completed holes
    await page.goto('/?test=1');
    await expect(page).toHaveURL(/\/game\/TEST1/);
  });

  test('standings tab shows all players ranked by points', async ({ page }) => {
    // Click the standings tab (it's a button in the tab bar)
    await page.getByRole('button', { name: 'STANDINGS' }).click();

    // Should show standings title
    await expect(page.getByText('Wolf Standings')).toBeVisible();

    // All 4 player names should be visible
    for (const name of ['Lance', 'Cahlan', 'Brad', 'Shane']) {
      await expect(page.getByText(name).first()).toBeVisible();
    }

    // Rank numbers visible (1-4)
    await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('2', { exact: true }).first()).toBeVisible();
  });

  test('standings tab shows hole-by-hole breakdown table', async ({ page }) => {
    await page.getByRole('button', { name: 'STANDINGS' }).click();

    // Hole-by-hole section
    await expect(page.getByText('HOLE-BY-HOLE')).toBeVisible();

    // Table headers should show player name abbreviations
    await expect(page.getByRole('columnheader', { name: 'Lanc' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Cahl' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Brad' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Shan' })).toBeVisible();

    // Hole numbers should be in the table (the # column header)
    await expect(page.getByText('#')).toBeVisible();
  });

  test('quick standings are shown on the play tab', async ({ page }) => {
    // On the play tab, there's a quick standings section
    await expect(page.getByText(/STANDINGS/).first()).toBeVisible();

    // Should show "STANDINGS — 15 HOLES" since test data has 15 holes
    await expect(page.getByText(/15 HOLES/)).toBeVisible();

    // Leader should have a crown
    await expect(page.getByText('👑').first()).toBeVisible();
  });

  test('can switch between play and standings tabs', async ({ page }) => {
    // Start on play tab
    await expect(page.getByText('NEXT UP')).toBeVisible();

    // Switch to standings
    await page.getByRole('button', { name: 'STANDINGS' }).click();
    await expect(page.getByText('Wolf Standings')).toBeVisible();

    // Switch back to play
    await page.getByRole('button', { name: 'PLAY' }).click();
    await expect(page.getByText('NEXT UP')).toBeVisible();
  });
});
