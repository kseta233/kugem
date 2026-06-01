---
name: Luminous Play
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#4a4455'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#7b7487'
  outline-variant: '#ccc3d8'
  surface-tint: '#732ee4'
  primary: '#630ed4'
  on-primary: '#ffffff'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#d2bbff'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed01b'
  on-secondary-container: '#6f5900'
  tertiary: '#9b005c'
  on-tertiary: '#ffffff'
  tertiary-container: '#bf2076'
  on-tertiary-container: '#ffdde7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#ffe083'
  secondary-fixed-dim: '#eec200'
  on-secondary-fixed: '#231b00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#ffd9e4'
  tertiary-fixed-dim: '#ffb0cd'
  on-tertiary-fixed: '#3e0022'
  on-tertiary-fixed-variant: '#8c0053'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Quicksand
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Quicksand
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Quicksand
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Quicksand
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
  body-md:
    fontFamily: Quicksand
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  label-lg:
    fontFamily: Quicksand
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Quicksand
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 20px
  gutter: 12px
---

## Brand & Style

The design system is engineered for a mobile-first mini-game platform that prioritizes joy, speed, and effortless interaction. The brand personality is **vibrant, energetic, and approachable**, aiming to evoke a sense of "instant fun" the moment the app opens.

The visual style is a fusion of **Modern Minimalism** and **Soft Playful Aesthetics**. By using generous whitespace and oversized interactive elements, the UI avoids the cluttered "casino" look often found in gaming apps, opting instead for a premium, clean experience that feels like a modern lifestyle product. The interface relies on physical metaphors—squishy-looking buttons and depth-inducing shadows—to make digital interactions feel tactile and rewarding.

## Colors

The palette is anchored by a high-energy **Vibrant Purple** which serves as the primary brand identifier for interactive states and primary branding. 

- **Primary (Purple):** Used for main actions, active states, and brand moments.
- **Secondary (Gold):** Specifically reserved for rewards, currency (coins), and achievement milestones to create high-contrast "win" moments.
- **Tertiary (Pink):** An accent for secondary promotions or seasonal mini-games to maintain a diverse, colorful ecosystem.
- **Surface & Background:** A very clean **Off-White (#F9FAFB)** background ensures that the white cards and colorful accents pop without creating harsh eye strain.
- **Success/Warning:** Standard green/red tones should be adjusted to match the saturation of the primary purple to maintain a cohesive "playful" intensity.

## Typography

This design system utilizes **Quicksand** across all levels. Its rounded terminals mirror the "bubbly" and friendly nature of the UI components. 

The hierarchy is intentionally bold. Large Display and Headline styles are used to announce game titles and scores, while Body text remains medium-weight (500) to ensure legibility against colorful backgrounds. All labels use a heavier weight (600-700) to remain distinct even at small sizes. Avoid using weights below 500 to keep the interface feeling sturdy and "thick."

## Layout & Spacing

This design system follows a **4px base scale**. Because this is a mobile-first platform, the layout relies on a **Fluid Grid** with a maximum container width of 600px for tablet compatibility.

- **Margins:** Screens should use a standard 20px side margin.
- **Gutters:** Cards and grid items should use a 12px gutter to allow for large shadows without overlap.
- **Stacking:** Vertical spacing between cards should be consistent at 16px (md) to maintain a rhythmic flow. 
- **Touch Targets:** No interactive element should be smaller than 48x48px.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and **Tonal Layering**. 

1. **The Canvas:** The background (#F9FAFB) is the lowest layer.
2. **The Card:** White surfaces (#FFFFFF) sit on the canvas with a soft, diffused shadow (Y: 4px, Blur: 20px, Opacity: 6% Black). This makes cards feel like they are floating just above the surface.
3. **The Interaction:** Primary buttons use a two-tone shadow or a "bottom-border" thickness (3px darker shade of the button color) to simulate a physical button that can be pressed down.
4. **The Modal:** High-level overlays use a backdrop blur (12px) on a dimmed background to keep the focus entirely on the game or reward at hand.

## Shapes

The shape language is extremely soft and **Pill-shaped**. 

- **Primary Cards:** Use a minimum radius of **24px**. For larger feature cards, this can scale up to 32px.
- **Buttons:** Always use a fully rounded (Pill) or 16px radius to ensure they look "soft" to the touch.
- **Icons:** Icons should feature rounded caps and corners to match the typography and container styles. 
- **Selection States:** Use thick 3px strokes with rounded corners for input focus and active game selection.

## Components

### Buttons
Primary CTAs are full-width, 56px in height, and use the Vibrant Purple. They should have a "bouncy" animation on press (scale 0.95). Secondary buttons use a light purple tint with purple text.

### Game Cards
Vertical cards with an aspect ratio of 3:4. The game thumbnail should have a 20px inner radius, nested within the 24px outer card radius. Titles are placed below the image on the white surface.

### Chips & Tags
Used for game categories (e.g., "Puzzle", "Action"). These are small pill-shapes with a subtle 1px border and 12px font size.

### Progress Bars
Thick, 12px height bars with fully rounded ends. The track is a light gray, and the fill is a gradient from Tertiary Pink to Primary Purple.

### Reward Modals
Center-aligned overlays with a "Sunburst" background effect behind the Secondary Gold reward icon. These should include a large "Claim" button at the bottom.

### Inputs
Search and text fields use a 16px radius, a light gray fill, and no border unless focused. When focused, they transition to a 2px Purple border.