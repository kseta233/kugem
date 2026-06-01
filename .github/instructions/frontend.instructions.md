---
applyTo: "apps/web/src/**"
---

# Frontend Rules

Build mobile-first responsive UI from the start.

## Mobile-First Requirements

- Default layout target: phone viewport first, then scale up for tablet/desktop.
- Touch targets must be comfortable for thumbs (minimum 44x44 logical pixels).
- Avoid hover-only interactions. Core actions must work with tap.
- Respect safe areas for wrapped apps (top/bottom insets).
- Keep above-the-fold content lightweight for low-end devices.

## First Game Orientation

For the first game module, use portrait-only layout constraints.

- Design gameplay UI for portrait orientation first.
- Keep critical controls reachable in portrait with one-hand use.
- Avoid fixed-width desktop assumptions.

## UX States

Every screen must handle:
- loading state
- empty state
- error state

## Architecture

- Keep components focused and small.
- Move data access into service functions/hooks.
- Do not place large data-fetch logic directly inside presentational components.
