---
applyTo: "apps/web/src/**/*.{ts,tsx,css}"
---

# UI Design System Instructions

Always follow `docs/design-system.md` when creating or modifying UI.

The app is mobile-first and portrait-first.

Use shared UI components from:

- `apps/web/src/shared/components`
- `apps/web/src/shared/styles/tokens.css`

Do not create raw one-off button, card, page, or badge styles if a shared component exists.

Use semantic CSS variables for colors and spacing.

Do not hardcode random colors unless the design system is updated first.

All game screens must be optimized for portrait mobile layout.

Primary actions should be easy to tap and at least 48px high.

Touch targets must be at least 44px.

When creating a new screen:
1. Use `Page` as the outer layout.
2. Use `Card` for grouped content.
3. Use `Button` for actions.
4. Use `CoinBadge` for coin display.
5. Keep layout simple and vertical.