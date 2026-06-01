---
applyTo: "e2e/**,playwright.config.ts,.github/workflows/e2e-tests.yml"
---

# Playwright E2E Rules

Use Playwright with TypeScript.

Test target URL must come from `E2E_BASE_URL`.

Create tests under `e2e/`.

Focus only on MVP Phase 1-4:
- anonymous auth loads
- game catalog appears
- profile coin appears
- reaction time game detail opens
- start game session works
- game play screen appears
- submit score/result screen if implemented

Do not test:
- leaderboard
- share
- email/password login
- payment

Use stable `data-testid` attributes for selectors.

Configure mobile portrait viewport using Playwright Pixel 5 device.

Keep tests deterministic and avoid timing-based fragile assertions.
