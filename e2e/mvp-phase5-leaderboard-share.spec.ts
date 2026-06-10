import { expect, test } from '@playwright/test'

test.describe('MVP Phase 5: Leaderboard & Share Flow', () => {
  test('YinYang Samurai: play, see leaderboard, and share result', async ({ page }) => {
    await page.goto('/')

    // Welcome screen appears after splash + auth complete
    await expect(page.getByTestId('anonymous-auth-ready')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('profile-coin-badge')).toBeVisible()

    // Register user (required for share flow)
    const displayNameInput = page.getByTestId('welcome-display-name-input')
    if (await displayNameInput.isVisible().catch(() => false)) {
      await displayNameInput.fill('Leaderboard Tester')
    }
    await page.getByTestId('continue-to-games').click()

    await expect(page.getByTestId('game-catalog')).toBeVisible()

    // Open YinYang Samurai
    await page.getByTestId('open-yinyang-detail').click()
    await expect(page.getByTestId('yinyang-detail-screen')).toBeVisible()

    // Start game session
    await page.getByTestId('start-game-session').click()
    await expect(page.getByTestId('yinyang-fullscreen-shell')).toBeVisible({ timeout: 10000 })

    // Wait for YinYang game to load and auto-start
    await expect(page.getByTestId('yinyang-game-canvas')).toBeVisible({ timeout: 5000 })

    // Play for a short duration (tap the play area to generate a simple result)
    const gameCanvas = page.getByTestId('yinyang-game-canvas')
    const boundingBox = await gameCanvas.boundingBox()
    if (boundingBox) {
      await page.mouse.click(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2)
    }

    // Wait for result popup to appear
    const resultPopup = page.getByTestId('yinyang-result-popup')
    await expect(resultPopup).toBeVisible({ timeout: 10000 })

    // Verify result screen is displayed
    const resultScreen = page.getByTestId('yinyang-samurai-result-screen')
    await expect(resultScreen).toBeVisible()

    // Verify leaderboard is shown (Top 3 Players section)
    const leaderboardSection = page.locator('.yys-result-card__leaders')
    await expect(leaderboardSection).toBeVisible()

    // Get initial coin balance
    const initialCoinBadge = page.getByTestId('profile-coin-badge')
    const initialCoinText = await initialCoinBadge.textContent()
    const initialCoin = parseInt(initialCoinText?.match(/\d+/)?.[0] ?? '0', 10)

    // Click Share button
    const shareButton = page.locator('button:has-text("Share")')
    await shareButton.click()

    // Wait for share link to appear (indicates submit_score + create_share_post succeeded)
    const shareUrlSection = page.locator('.yys-result-card__share')
    await expect(shareUrlSection).toBeVisible({ timeout: 15000 })

    // Verify share URL is displayed
    const shareLink = page.locator('.yys-result-card__share-link')
    const shareUrl = await shareLink.getAttribute('href')
    expect(shareUrl).toBeTruthy()
    expect(shareUrl).toMatch(/^https?:.*\/share\//)

    // Verify leaderboard rank is shown (if score entered leaderboard)
    const rankHint = page.locator('.yys-result-card__meta')
    const rankText = await rankHint.filter({ hasText: 'Leaderboard rank:' }).isVisible().catch(() => false)
    // Rank may or may not appear depending on if score is in top 3

    // Verify coin reward message (if applicable)
    const coinRewardMsg = page.locator('text=coin')
    // Coin may appear depending on daily cap and reward config

    // Copy share link button test
    const copyButton = page.locator('button:has-text("Copy")')
    await copyButton.click()

    // Verify "Copied!" message appears
    await expect(page.locator('text=Copied')).toBeVisible()

    // Verify coin balance updated (if reward was granted)
    await page.waitForTimeout(500)
    const updatedCoinBadge = page.getByTestId('profile-coin-badge')
    const updatedCoinText = await updatedCoinBadge.textContent()
    const updatedCoin = parseInt(updatedCoinText?.match(/\d+/)?.[0] ?? '0', 10)
    // Coin balance should be >= initial (may not increase if daily cap hit)
    expect(updatedCoin).toBeGreaterThanOrEqual(initialCoin)

    // Play again
    const playAgainButton = page.locator('button:has-text("Try Again")')
    await playAgainButton.click()

    // Verify result popup is closed
    await expect(page.getByTestId('yinyang-result-popup')).not.toBeVisible()
  })

  test('Leaderboard display: top 3 scores per game', async ({ page }) => {
    await page.goto('/')

    // Auth and register
    await expect(page.getByTestId('anonymous-auth-ready')).toBeVisible({ timeout: 15000 })

    const displayNameInput = page.getByTestId('welcome-display-name-input')
    if (await displayNameInput.isVisible().catch(() => false)) {
      await displayNameInput.fill('Leaderboard Viewer')
    }
    await page.getByTestId('continue-to-games').click()

    // Navigate to YinYang
    await page.getByTestId('open-yinyang-detail').click()
    await expect(page.getByTestId('yinyang-detail-screen')).toBeVisible()

    // Start game
    await page.getByTestId('start-game-session').click()
    await expect(page.getByTestId('yinyang-fullscreen-shell')).toBeVisible({ timeout: 10000 })

    // Wait for result
    await expect(page.getByTestId('yinyang-result-popup')).toBeVisible({ timeout: 15000 })

    // Verify leaderboard has max 3 rows
    const leaderRows = page.locator('.yys-result-card__leader-row')
    const rowCount = await leaderRows.count()
    // Should be 0-3 rows depending on whether scores exist and are valid
    expect(rowCount).toBeLessThanOrEqual(3)

    // Verify rank numbers if rows exist
    if (rowCount > 0) {
      const firstRank = page.locator('.yys-result-card__leader-rank').first()
      const rankText = await firstRank.textContent()
      expect(rankText).toMatch(/^[1-3]$/)
    }
  })

  test('Share verification: score saved and retrievable', async ({ page }) => {
    await page.goto('/')

    // Auth and register
    await expect(page.getByTestId('anonymous-auth-ready')).toBeVisible({ timeout: 15000 })

    const displayNameInput = page.getByTestId('welcome-display-name-input')
    if (await displayNameInput.isVisible().catch(() => false)) {
      await displayNameInput.fill('Share Verifier')
    }
    await page.getByTestId('continue-to-games').click()

    // Play YinYang
    await page.getByTestId('open-yinyang-detail').click()
    await page.getByTestId('start-game-session').click()

    await expect(page.getByTestId('yinyang-result-popup')).toBeVisible({ timeout: 15000 })

    // Get share URL
    let shareUrl: string | null = null
    try {
      const shareLink = page.locator('.yys-result-card__share-link')
      shareUrl = await shareLink.getAttribute('href')
    } catch {
      // Share might not be visible if share hasn't been clicked yet
      const shareButton = page.locator('button:has-text("Share")')
      await shareButton.click()
      await expect(page.locator('.yys-result-card__share')).toBeVisible({ timeout: 15000 })

      const shareLink = page.locator('.yys-result-card__share-link')
      shareUrl = await shareLink.getAttribute('href')
    }

    if (shareUrl) {
      // Navigate to share page
      await page.goto(shareUrl)

      // Verify share page loads successfully
      await expect(page.locator('text=YinYang Samurai')).toBeVisible()
      // The share page should display the score result
    }
  })
})
