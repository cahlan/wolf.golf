import { test, expect } from '@playwright/test';

test.describe('Settlement screen', () => {
  test('completing all 18 holes leads to settlement', async ({ page }) => {
    // Load the test game (15 holes done)
    await page.goto('/?test=1');
    await expect(page).toHaveURL(/\/game\/TEST1/);

    // Score holes 16, 17, 18
    for (let hole = 16; hole <= 18; hole++) {
      const scoreBtn = page.getByRole('button', { name: new RegExp(`Score Hole ${hole}`) });
      await expect(scoreBtn).toBeVisible();
      await scoreBtn.click();

      // Wolf decision: pick first partner
      const partnerButtons = page.locator('button:has-text("2v2")');
      await partnerButtons.first().click();

      // Confirm with default scores (par)
      await page.getByRole('button', { name: /Confirm/i }).click();
    }

    // After hole 18, should automatically navigate to settlement
    await expect(page).toHaveURL(/\/settlement/, { timeout: 5000 });
  });

  test('settlement page shows final standings and settle up', async ({ page }) => {
    // Load test game and complete remaining holes
    await page.goto('/?test=1');
    await expect(page).toHaveURL(/\/game\/TEST1/);

    // Score the remaining 3 holes
    for (let hole = 16; hole <= 18; hole++) {
      await page.getByRole('button', { name: new RegExp(`Score Hole ${hole}`) }).click();
      await page.locator('button:has-text("2v2")').first().click();
      await page.getByRole('button', { name: /Confirm/i }).click();
    }

    await expect(page).toHaveURL(/\/settlement/, { timeout: 5000 });

    // Settlement page content
    await expect(page.getByText('ROUND COMPLETE')).toBeVisible();
    await expect(page.getByText('Settlement')).toBeVisible();

    // Final standings section
    await expect(page.getByText('FINAL STANDINGS')).toBeVisible();

    // All 4 players should appear
    for (const name of ['Lance', 'Cahlan', 'Brad', 'Shane']) {
      await expect(page.getByText(name).first()).toBeVisible();
    }

    // Points displayed
    await expect(page.getByText(/pts/).first()).toBeVisible();

    // Medals for top 2
    await expect(page.getByText('🥇')).toBeVisible();
    await expect(page.getByText('🥈')).toBeVisible();

    // Settle up section
    await expect(page.getByText('SETTLE UP')).toBeVisible();

    // Net total section
    await expect(page.getByText(/NET TOTAL/)).toBeVisible();
  });

  test('settlement shows transfer amounts with arrows', async ({ page }) => {
    // Load and complete game
    await page.goto('/?test=1');
    await expect(page).toHaveURL(/\/game\/TEST1/);

    for (let hole = 16; hole <= 18; hole++) {
      await page.getByRole('button', { name: new RegExp(`Score Hole ${hole}`) }).click();
      await page.locator('button:has-text("2v2")').first().click();
      await page.getByRole('button', { name: /Confirm/i }).click();
    }

    await expect(page).toHaveURL(/\/settlement/, { timeout: 5000 });

    // Transfers should show dollar amounts
    // The → arrow between from and to players
    await expect(page.getByText('→').first()).toBeVisible();

    // Dollar amounts should be visible (e.g. $50, $25, etc.)
    await expect(page.locator('text=/\\$\\d+/').first()).toBeVisible();
  });
});
