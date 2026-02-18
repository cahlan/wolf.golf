# Testing — Wolf Tracker

End-to-end tests use [Playwright](https://playwright.dev/) to simulate real user flows in a browser.

## Setup

```bash
npm install                      # install deps (includes @playwright/test)
npx playwright install chromium  # download browser binary
```

### Missing system libraries (headless servers)

If Chromium fails to launch with `libasound.so.2: cannot open shared object file`, run:

```bash
# With sudo:
sudo apt-get install libasound2

# Without sudo (extracts to /tmp):
bash scripts/install-test-deps.sh
```

The `npm test` script already sets `LD_LIBRARY_PATH` to pick up the extracted library.

## Running Tests

```bash
npm test                 # run all tests headless
npm run test:headed      # run with visible browser
npm run test:ui          # interactive Playwright UI mode
```

Playwright auto-starts `next dev` on port 3000 when tests run. If you already have the dev server running, it will reuse it.

## Test Structure

Tests live in `e2e/` and are organized by user flow:

| File                  | What it covers                                       |
| --------------------- | ---------------------------------------------------- |
| `home.spec.ts`        | Home screen branding, navigation, `?test=1` shortcut |
| `create-game.spec.ts` | Full game creation wizard (players → course → order) |
| `score-hole.spec.ts`  | Wolf decision, partner picks, score entry, confirm   |
| `standings.spec.ts`   | Standings tab, hole-by-hole breakdown, quick view    |
| `join-game.spec.ts`   | Join page UI, code input validation                  |
| `settlement.spec.ts`  | Completing a round and viewing the settlement screen |

## Test Data

The app supports a `?test=1` query parameter on the home page that loads a pre-built game with:

- **Players:** Lance, Cahlan, Brad, Shane
- **Course:** RCC (18 holes with real stroke indexes)
- **15 completed holes** with realistic scores
- **Game ID:** `TEST1`

Tests that need a game in progress use this shortcut instead of manually creating one.

## Philosophy

Tests mimic real user behavior:

- **User-visible selectors:** `getByRole`, `getByText`, `getByPlaceholder` — no CSS selectors or `data-testid`
- **User stories:** Tests are named like user actions ("scorekeeper can enter scores and confirm")
- **Isolated:** Each test gets a fresh browser context — no shared state between tests
- **localStorage:** The app persists game state in localStorage. Playwright clears it per test automatically.

## Supabase

The app uses Supabase for multiplayer features (join game, spectator mode). The Playwright config provides dummy Supabase credentials so the app boots without a real connection. Supabase calls will fail gracefully (e.g., the "join invalid game code" test expects the `Game not found` error).

## CI

Set `CI=true` to enable stricter settings (no server reuse, retries enabled):

```bash
CI=true npm test
```
