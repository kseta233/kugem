import { expect, test } from '@playwright/test'

// TC-003: Register (Create Account with Email & Password)
// Scenario: Anonymous user taps "Sign in or create account" → fills Auth screen
// in Sign Up mode → submits → app returns to WelcomeScreen with saved name.

test('TC-003 register — create email account and return to welcome screen', async ({ page }) => {
  // Unique email avoids Supabase duplicate-account errors across test runs.
  // Avoid '+' in local-part — Supabase rejects it as invalid.
  const uniqueEmail = `e2e.${Date.now()}@example.com`

  // ── Load app and wait for WelcomeScreen ───────────────────────────────────
  await page.goto('/')
  await expect(page.getByTestId('anonymous-auth-ready')).toBeVisible({ timeout: 15_000 })

  // ── Open Auth screen ──────────────────────────────────────────────────────
  await page.getByTestId('welcome-open-auth-page').click()
  await expect(page.getByTestId('auth-screen')).toBeVisible()

  // ── Fill Sign Up form (default tab is Sign Up) ────────────────────────────
  await page.getByTestId('auth-display-name-input').fill('E2E Registered')
  await page.getByTestId('auth-email-input').fill(uniqueEmail)
  await page.getByTestId('auth-password-input').fill('TestPass123!')
  await page.locator('#auth-accept-terms').check()

  // ── Submit ────────────────────────────────────────────────────────────────
  await page.getByTestId('auth-submit').click()

  // ── App returns to WelcomeScreen ──────────────────────────────────────────
  // Allow 15 s for Supabase sign-up round trip
  await expect(page.getByTestId('anonymous-auth-ready')).toBeVisible({ timeout: 15_000 })

  // Display name was saved during sign-up → "Continue to Games" replaces the form
  await expect(page.getByTestId('continue-to-games')).toBeVisible()

  // No inline error should be present on the auth form
  await expect(page.getByTestId('auth-screen')).not.toBeVisible()

  // Coin badge is visible
  await expect(page.getByTestId('profile-coin-badge')).toBeVisible()
})
