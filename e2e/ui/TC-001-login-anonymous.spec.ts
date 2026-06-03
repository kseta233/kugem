import { expect, test } from '@playwright/test'

// TC-001: Anonymous Login with Display Name
// Scenario: New visitor → app creates anonymous Supabase session → user enters
// display name on WelcomeScreen → proceeds to game catalog.

test('TC-001 anonymous login — enter display name and reach game catalog', async ({ page }) => {
  await page.goto('/')

  // Splash clears and WelcomeScreen mounts (up to 15 s for slow CI / cold Supabase)
  await expect(page.getByTestId('anonymous-auth-ready')).toBeVisible({ timeout: 15_000 })

  // Coin badge is shown for new user
  await expect(page.getByTestId('profile-coin-badge')).toBeVisible()

  // Session card is present
  await expect(page.getByTestId('session-persistence-indicator')).toBeVisible()

  // Enter a display name (anything other than "Guest" to satisfy hasSavedName)
  await page.getByTestId('welcome-display-name-input').fill('E2E Player')

  // Submit / continue
  await page.getByTestId('continue-to-games').click()

  // Game catalog screen appears
  await expect(page.getByTestId('game-catalog')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('game-catalog-list')).toBeVisible()
})
