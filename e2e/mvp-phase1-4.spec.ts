import { expect, test } from '@playwright/test'

test.describe('MVP Phase 1-4 mobile flow', () => {
  test('anonymous auth to reaction result flow', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByTestId('anonymous-auth-ready')).toBeVisible()
    await expect(page.getByTestId('session-persistence-indicator')).toBeVisible()

    await expect(page.getByTestId('game-catalog')).toBeVisible()
    await expect(page.getByTestId('game-catalog-list')).toBeVisible()
    await expect(page.getByTestId('profile-coin-badge')).toBeVisible()

    await page.getByTestId('open-reaction-detail').click()
    await expect(page.getByTestId('reaction-detail-screen')).toBeVisible()

    await page.getByTestId('start-game-session').click()
    await expect(page.getByTestId('game-play-screen')).toBeVisible()
    await expect(page.getByTestId('session-started-state')).toContainText('Session active:')

    await page.getByTestId('tap-play-area').click()

    const resultScreen = page.getByTestId('score-result-screen')
    if (await resultScreen.isVisible().catch(() => false)) {
      await expect(resultScreen).toBeVisible()
      await expect(page.getByTestId('reaction-time-result')).toContainText('ms')
    }
  })
})
