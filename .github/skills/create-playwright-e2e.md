# Skill: Create Playwright MVP E2E Test

Use this skill when creating or updating end-to-end tests for the mini-game MVP.

## Scope

Only cover MVP Phase 1-4 flow:
1. anonymous auth loads
2. game catalog appears
3. profile coin appears
4. reaction time game detail opens
5. start game session works
6. game play screen appears
7. score/result screen if implemented

Never include leaderboard/share/payment/email-password login assertions.

## Workflow

1. Ensure Playwright config reads base URL from `E2E_BASE_URL`.
2. Use TypeScript tests under `e2e/`.
3. Use Pixel 5 mobile portrait project in Playwright config.
4. Add/verify stable `data-testid` selectors in the app.
5. Write one deterministic happy-path test first.
6. Add GitHub Actions workflow for CI execution and report upload.

## Selector Strategy

Use `page.getByTestId()` for primary selectors.
Avoid styling-text selectors for critical interactions.

## Done Checklist

- [ ] `playwright.config.ts` exists and uses `E2E_BASE_URL`
- [ ] tests are in `e2e/`
- [ ] Pixel 5 project configured
- [ ] happy-path MVP Phase 1-4 test exists
- [ ] workflow file runs Playwright on push/PR
- [ ] app exposes required `data-testid`
