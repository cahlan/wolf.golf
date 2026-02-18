import { test, expect } from '@playwright/test';

test.describe('Create a new game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/create');
  });

  test('shows the Players step with 4 player inputs and handicap fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Players' })).toBeVisible();
    await expect(page.getByText('Enter all four players and their handicaps.')).toBeVisible();

    // Four player placeholders
    for (let i = 1; i <= 4; i++) {
      await expect(page.getByPlaceholder(`Player ${i}`)).toBeVisible();
    }

    // HC placeholder fields (4 of them)
    const hcFields = page.getByPlaceholder('HC');
    await expect(hcFields).toHaveCount(4);

    // Buy-in field
    await expect(page.getByText('BUY-IN ($)')).toBeVisible();

    // Skins toggle
    await expect(page.getByText('Skins Game')).toBeVisible();

    // Next button disabled when no players entered
    const nextBtn = page.getByRole('button', { name: /Next: Course Setup/i });
    await expect(nextBtn).toBeVisible();
    await expect(nextBtn).toBeDisabled();
  });

  test('enables Next button when all 4 players are filled', async ({ page }) => {
    const names = ['Alice', 'Bob', 'Charlie', 'Diana'];
    for (let i = 0; i < 4; i++) {
      await page.getByPlaceholder(`Player ${i + 1}`).fill(names[i]);
    }

    const nextBtn = page.getByRole('button', { name: /Next: Course Setup/i });
    await expect(nextBtn).toBeEnabled();
  });

  test('full game creation flow: players → course → wolf order → start', async ({ page }) => {
    // STEP 1: Fill in players
    const names = ['Alice', 'Bob', 'Charlie', 'Diana'];
    for (let i = 0; i < 4; i++) {
      await page.getByPlaceholder(`Player ${i + 1}`).fill(names[i]);
    }

    // Set handicaps
    const hcFields = page.getByPlaceholder('HC');
    await hcFields.nth(0).fill('10');
    await hcFields.nth(1).fill('5');
    await hcFields.nth(2).fill('15');
    await hcFields.nth(3).fill('8');

    // Advance to course step
    await page.getByRole('button', { name: /Next: Course Setup/i }).click();

    // STEP 2: Course setup
    await expect(page.getByRole('heading', { name: 'Course' })).toBeVisible();

    // Click "+ Add new course" if saved courses are shown, otherwise course name input is already visible
    const addNewCourseBtn = page.getByRole('button', { name: /Add new course/i });
    if (await addNewCourseBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await addNewCourseBtn.click();
    }

    const courseNameInput = page.getByPlaceholder('Course name');
    await expect(courseNameInput).toBeVisible();
    await courseNameInput.fill('Test Golf Club');

    // Fill in stroke indexes (1-18) for each hole
    // The SI inputs are number inputs inside the course hole setup grid
    const siInputs = page.locator('input[type="number"][min="1"][max="18"]');
    for (let i = 0; i < 18; i++) {
      await siInputs.nth(i).fill(String(i + 1));
    }

    // Next button to wolf order
    await page.getByRole('button', { name: /Next: Wolf Order/i }).click();

    // STEP 3: Wolf Order
    await expect(page.getByRole('heading', { name: 'Wolf Order' })).toBeVisible();
    await expect(page.getByText(/wolf rotation for holes 1–16/i)).toBeVisible();

    // All 4 player names should appear in the wolf order
    for (const name of names) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }

    // Randomize button
    await expect(page.getByRole('button', { name: /Randomize/i })).toBeVisible();

    // Stroke preview section
    await expect(page.getByText('STROKE PREVIEW')).toBeVisible();

    // Start the round
    await page.getByRole('button', { name: /Start Round/i }).click();

    // Should navigate to the game page
    await expect(page).toHaveURL(/\/game\//);

    // Should see the play tab with hole 1
    await expect(page.getByText('NEXT UP')).toBeVisible();
    // The wolf name for hole 1 should be visible (Alice is first in wolf order)
    await expect(page.getByText('Alice').first()).toBeVisible();
  });

  test('can navigate back from Course step to Players step', async ({ page }) => {
    // Fill players
    for (let i = 0; i < 4; i++) {
      await page.getByPlaceholder(`Player ${i + 1}`).fill(`Player${i + 1}`);
    }
    await page.getByRole('button', { name: /Next: Course Setup/i }).click();
    await expect(page.getByRole('heading', { name: 'Course' })).toBeVisible();

    // Go back — click the step's back button (second "← Back" on the page; first is the top nav)
    await page.getByRole('button', { name: '← Back' }).nth(1).click();
    await expect(page.getByRole('heading', { name: 'Players' })).toBeVisible({ timeout: 10000 });
    // Players should still be filled
    await expect(page.getByPlaceholder('Player 1')).toHaveValue('Player1');
  });
});
