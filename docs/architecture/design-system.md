# UI Design System

## Product Feel

Mobile-first, playful, fast, casual, vertical mini game experience.

The UI should feel:
- fun
- simple
- bright
- touch-friendly
- suitable for portrait mobile screens

## Layout

- Primary target: mobile portrait.
- Use max width container for desktop preview.
- Main content should be centered.
- Avoid dense desktop-style layout.
- Bottom spacing must be safe for mobile gesture area.

## Spacing

Use 4px-based spacing scale:

- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

## Border Radius

- Small UI: 12px
- Cards: 20px
- Main game/result panels: 24px
- Buttons: 999px pill shape when appropriate

## Components

Use shared components first:

- `Button`
- `Card`
- `Page`
- `CoinBadge`

Do not create one-off button/card styles unless the shared component cannot support the use case.

## Button Rules

Primary button:
- Used for main action only.
- Full width on mobile.
- Minimum height: 48px.

Secondary button:
- Used for non-primary actions.

Danger button:
- Only for destructive actions.

## Game Screen

Game screen must be portrait-first.

Structure:

1. Top profile/coin area
2. Game title or status
3. Main game canvas
4. Primary action/result area

Do not implement landscape layout in MVP.

## Color Usage

Use semantic tokens, not raw colors directly.

Preferred token names:

- `--color-bg`
- `--color-surface`
- `--color-primary`
- `--color-primary-text`
- `--color-muted`
- `--color-border`
- `--color-danger`
- `--color-coin`

## Typography

- Page title: large and bold
- Section title: medium and bold
- Body: readable, not too small
- Minimum body font size: 14px
- Main CTA font weight: 700

## Accessibility

- Buttons must have accessible text.
- Touch target minimum: 44px.
- Do not rely on color only.
- Interactive elements must show disabled/loading state.