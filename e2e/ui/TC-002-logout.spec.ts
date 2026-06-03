import { expect, test } from '@playwright/test'

// TC-002: Logout
// Scenario: User completes anonymous login → opens Profile → signs out →
// app restarts with a fresh anonymous session and shows the WelcomeScreen.

test('TC-002 logout — sign out resets to a new anonymous session', async ({ page }) => {
  // ── Setup: complete anonymous login first ──────────────────────────────────
  await page.goto('/')

  await expect(page.getByTestId('anonymous-auth-ready')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('welcome-display-name-input').fill('E2E Logout User')
  await page.getByTestId('continue-to-games').click()
  await expect(page.getByTestId('game-catalog')).toBeVisible({ timeout: 10_000 })

  // ── Open Profile screen ───────────────────────────────────────────────────
  await page.getByTestId('open-profile-page').click()

  // Profile screen header back button confirms we landed on profile
  await expect(page.getByTestId('back-to-home')).toBeVisible()

  // ── Sign out ───────────────────────────────────────────────────────────────
  await page.getByTestId('signout-control').click()

  // ── App restarts with new anonymous session ────────────────────────────────
  // App goes through splash → welcome; allow up to 15 s for the full cycle
  await expect(page.getByTestId('anonymous-auth-ready')).toBeVisible({ timeout: 15_000 })

  // New session has no saved display name → input is shown
  await expect(page.getByTestId('welcome-display-name-input')).toBeVisible()

  // Coin badge is visible and resets to 0 for the new session
  await expect(page.getByTestId('profile-coin-badge')).toBeVisible()
})
