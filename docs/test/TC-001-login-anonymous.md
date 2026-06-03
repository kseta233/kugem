# TC-001 — Anonymous Login with Display Name

## Description

A new visitor opens the app for the first time. Supabase creates an anonymous session automatically. The user enters a display name on the Welcome screen and proceeds to the game catalog.

## Preconditions

- Fresh browser context (no prior localStorage / Supabase session)
- App is running at `E2E_BASE_URL`

## Steps

| # | Action | Selector / Input |
|---|--------|-----------------|
| 1 | Navigate to `/` | — |
| 2 | Wait for splash to clear and WelcomeScreen to appear | `[data-testid="anonymous-auth-ready"]` |
| 3 | Verify coin badge is rendered | `[data-testid="profile-coin-badge"]` |
| 4 | Verify the session card is visible | `[data-testid="session-persistence-indicator"]` |
| 5 | Fill display name into the input | `[data-testid="welcome-display-name-input"]` → `"E2E Player"` |
| 6 | Click the submit / continue button | `[data-testid="continue-to-games"]` |
| 7 | Wait for game catalog screen | `[data-testid="game-catalog"]` |
| 8 | Verify game list section renders | `[data-testid="game-catalog-list"]` |

## Expected Results

- Welcome screen appears within 15 s of page load
- Coin badge shows `0` for new user
- After entering a name and clicking continue, the game catalog is visible
- No console errors related to auth or profile

## Notes

- `data-testid="anonymous-auth-ready"` exists on both WelcomeScreen root and the main catalog hero; the test targets the WelcomeScreen variant (visible before `continue-to-games` is clicked)
- Display name `"Guest"` is the default fallback — entering it skips the saved-name check in the app
