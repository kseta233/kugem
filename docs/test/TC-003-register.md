# TC-003 — Register (Create Account with Email & Password)

## Description

An anonymous user decides to create a permanent account. They tap "Sign in or create account" on the Welcome screen, land on the Auth screen in Sign Up mode, fill in their details, and complete registration. The app returns them to the Welcome screen with their display name saved.

## Preconditions

- Fresh browser context (anonymous session in progress)
- App is on the WelcomeScreen (`[data-testid="anonymous-auth-ready"]` visible)
- A unique email is used to avoid Supabase duplicate-account errors

## Steps

| # | Action | Selector / Input |
|---|--------|-----------------|
| 1 | Navigate to `/` and wait for WelcomeScreen | `[data-testid="anonymous-auth-ready"]` (timeout 15 s) |
| 2 | Click "Sign in or create account" | `[data-testid="welcome-open-auth-page"]` |
| 3 | Verify Auth screen opens in Sign Up mode | `[data-testid="auth-screen"]` |
| 4 | Fill display name | `[data-testid="auth-display-name-input"]` → `"E2E Registered"` |
| 5 | Fill email | `[data-testid="auth-email-input"]` → unique email e.g. `e2e.<timestamp>@example.com` |
| 6 | Fill password | `[data-testid="auth-password-input"]` → `"TestPass123!"` |
| 7 | Tick terms & conditions checkbox | `#auth-accept-terms` |
| 8 | Click Sign Up button | `[data-testid="auth-submit"]` |
| 9 | Wait for WelcomeScreen to re-appear | `[data-testid="anonymous-auth-ready"]` (timeout 15 s) |
| 10 | Verify "Continue to Games" is shown (saved display name) | `[data-testid="continue-to-games"]` |

## Expected Results

- Auth screen closes and WelcomeScreen appears
- Because display name was provided during sign-up, the name form is hidden and "Continue to Games" button is shown
- No inline error is visible after sign-up
- `[data-testid="profile-coin-badge"]` is visible

## Notes

- Default tab on AuthScreen is Sign Up — no tab switch needed
- Email must be unique per test run; use `Date.now()` in the address local-part
- The Supabase project must have email sign-up enabled (without email confirmation for CI) or the test must handle the confirmation flow
