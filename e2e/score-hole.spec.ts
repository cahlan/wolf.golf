import { test, expect } from '@playwright/test';

test.describe('Score a hole', () => {
  test.beforeEach(async ({ page }) => {
    // Load the test game — 15 holes already completed, hole 16 is next
    await page.goto('/?test=1');
    await expect(page).toHaveURL(/\/game\/TEST1/);
  });

  test('shows current hole info with wolf badge and who pops', async ({ page }) => {
    // The test game has 15 completed holes, so we should be on hole 16
    await expect(page.getByText('NEXT UP')).toBeVisible();

    // Wolf badge visible (wolf rotation: position = (16-1) % 4 = 3 → Shane for hole 16)
    await expect(page.locator('text=🐺').first()).toBeVisible();

    // WHO POPS THIS HOLE section
    await expect(page.getByText('WHO POPS THIS HOLE')).toBeVisible();

    // Players visible in the strokes section
    for (const name of ['Lance', 'Cahlan', 'Brad', 'Shane']) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
  });

  test('scorekeeper can start scoring and pick a partner', async ({ page }) => {
    // Click the Score Hole button
    const scoreBtn = page.getByRole('button', { name: /Score Hole/i });
    await expect(scoreBtn).toBeVisible();
    await scoreBtn.click();

    // Should show wolf decision phase
    await expect(page.getByText(/call$/i)).toBeVisible();

    // Partner selection options
    await expect(page.getByText('PICK A PARTNER')).toBeVisible();

    // Lone wolf options
    await expect(page.getByText('Lone Before Drives')).toBeVisible();
    await expect(page.getByText('Lone After Drives')).toBeVisible();
    await expect(page.getByText('Default Lone')).toBeVisible();

    // Pick a partner (first non-wolf player listed)
    // Click the first partner button
    const partnerButtons = page.locator('button:has-text("2v2")');
    await partnerButtons.first().click();

    // Should now be in scores phase
    await expect(page.getByText('WOLF TEAM')).toBeVisible();
    await expect(page.getByText('VS')).toBeVisible();
    await expect(page.getByText('OPPONENTS')).toBeVisible();

    // Score inputs should be visible (placeholder = par value)
    const scoreInputs = page.locator('input[type="number"]');
    await expect(scoreInputs.first()).toBeVisible();

    // + and - buttons for adjusting scores
    await expect(page.getByRole('button', { name: '+' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '−' }).first()).toBeVisible();

    // Matchup breakdown section
    await expect(page.getByText('MATCHUP BREAKDOWN')).toBeVisible();

    // Confirm button
    await expect(page.getByRole('button', { name: /Confirm/i })).toBeVisible();
  });

  test('scorekeeper can enter scores and confirm', async ({ page }) => {
    // Start scoring
    await page.getByRole('button', { name: /Score Hole/i }).click();

    // Pick a partner
    const partnerButtons = page.locator('button:has-text("2v2")');
    await partnerButtons.first().click();

    // Should be on scores phase — enter a score by clicking +
    const plusButtons = page.getByRole('button', { name: '+' });
    await plusButtons.first().click();

    // Confirm the hole
    await page.getByRole('button', { name: /Confirm/i }).click();

    // Should advance to the next hole (17)
    // After confirming hole 16, we move to hole 17
    await expect(page.getByText('NEXT UP')).toBeVisible();
  });

  test('scorekeeper can choose lone wolf', async ({ page }) => {
    // Start scoring
    await page.getByRole('button', { name: /Score Hole/i }).click();

    // Choose early lone wolf
    await page.getByText('Lone Before Drives').click();

    // Should show lone wolf UI
    await expect(page.getByText('LONE WOLF')).toBeVisible();
    await expect(page.getByText('THE FIELD', { exact: true })).toBeVisible();

    // +4 indicator for early lone
    await expect(page.getByText('+4 to win')).toBeVisible();
  });

  test('can go back from scores phase to wolf decision', async ({ page }) => {
    // Start scoring
    await page.getByRole('button', { name: /Score Hole/i }).click();

    // Pick a partner
    const partnerButtons = page.locator('button:has-text("2v2")');
    await partnerButtons.first().click();

    // Should be on scores phase
    await expect(page.getByText('WOLF TEAM')).toBeVisible();

    // Go back (use the flow's back button, not the header one)
    await page.getByRole('button', { name: /Back/i }).nth(1).click();

    // Should be back at wolf decision
    await expect(page.getByText('PICK A PARTNER')).toBeVisible();
  });
});
