# TC-002 — Logout

## Description

An authenticated anonymous user (with a saved display name) opens the Profile screen and signs out. The app restarts with a brand-new anonymous Supabase session and lands on the Welcome screen ready for name input.

## Preconditions

- User has completed anonymous login and entered a display name (TC-001 precondition)
- App is on the game catalog screen (`[data-testid="game-catalog"]` visible)

## Steps

| # | Action | Selector / Input |
|---|--------|-----------------|
| 1 | Click the Profile button in the header | `[data-testid="open-profile-page"]` |
| 2 | Wait for Profile screen to be visible | `[data-testid="back-to-home"]` (page header back button) |
| 3 | Click the sign-out button | `[data-testid="signout-control"]` |
| 4 | Wait for WelcomeScreen to appear after re-auth | `[data-testid="anonymous-auth-ready"]` (timeout 15 s) |
| 5 | Verify display name input is shown (new session, no saved name) | `[data-testid="welcome-display-name-input"]` |
| 6 | Verify coin badge resets | `[data-testid="profile-coin-badge"]` shows `0` |

## Expected Results

- After sign out the app goes through splash and creates a new anonymous session
- WelcomeScreen is shown with an empty name form (no previously saved name)
- The old session data is gone; coin balance shows `0`

## Notes

- Sign-out triggers `signOutAndRestart()` → Supabase `signOut()` → new `signInAnonymously()` call
- The `appPhase` resets to `'splash'` which is why a full splash → welcome cycle occurs
