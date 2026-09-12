# Design Brief

## Direction

FitTrack — Premium fitness and nutrition tracker with black-white-pink aesthetic, clean grid hierarchy, dark and light modes.

## Tone

Refined minimalism with zero decorative excess; every surface is intentional and purposeful, emphasizing data clarity and action visibility through high-contrast pink.

## Differentiation

Consistent pink action system across all interactive elements (buttons, active nav, toggles) with strong tonal separation between information and interaction surfaces.

## Color Palette

| Token      | Light OKLCH  | Dark OKLCH     | Role   |
| ---------- | ------------ | -------------- | ------ |
| background | 0.99 0 0     | 0.12 0 0       | Page base |
| foreground | 0.12 0 0     | 0.92 0 0       | Text, default |
| card       | 0.97 0 0     | 0.16 0 0       | Surface container |
| primary    | 0.57 0.23 354| 0.70 0.24 354  | Pink action color |
| accent     | 0.57 0.23 354| 0.70 0.24 354  | Active indicators |
| muted      | 0.92 0.01 0  | 0.22 0.01 0    | Disabled, secondary |
| border     | 0.88 0.01 0  | 0.24 0.01 0    | Dividers, outlines |

## Typography

- Display: Space Grotesk — tech/SaaS aesthetic, headings and hero text
- Body: DM Sans — clean, readable, all UI labels and body copy
- Mono: Geist Mono — stats, data display, timestamps
- Scale: hero `text-5xl md:text-7xl font-bold tracking-tight`, h2 `text-3xl font-bold`, label `text-sm font-semibold tracking-widest uppercase`, body `text-base`

## Elevation & Depth

Two-tier shadow system: `shadow-subtle` for interactive elements (cards, buttons), `shadow-elevated` for modals/overlays; card backgrounds lift minimally off page base.

## Structural Zones

| Zone    | Background      | Border              | Notes |
| ------- | --------------- | ------------------- | ----- |
| Header  | card            | border-b, subtle    | White/dark grey header bar with logo + mode toggle |
| Sidebar | sidebar         | sidebar-border-r    | Persistent on desktop, collapsible on mobile; pink active indicator |
| Content | background      | —                   | Main content area with section alternation (background / card) |
| Footer  | muted/30 opacity| border-t, subtle    | Optional; footer with stats or app info |

## Spacing & Rhythm

16px base unit: sections use `gap-6` or `gap-8`, card internal padding `p-6`, tight label-to-input spacing `gap-2`. Breathing room between major sections (`mb-8 md:mb-12`).

## Component Patterns

- Buttons: Pink background, white text, `rounded-lg`, hover opacity +10%, `shadow-subtle` on rest
- Cards: White/dark background, thin grey border, `rounded-lg`, `shadow-subtle`
- Badges: Muted background, primary text, `rounded-full`, compact inline styling
- Checkboxes/toggles: Pink accent on checked state; smooth transition

## Motion

- Entrance: Fade-in + 50ms stagger on card groups; `transition-smooth` on all interactive elements
- Hover: Opacity shift (-5%), shadow increase; 200ms easing
- Decorative: None; motion serves interactivity only

## Constraints

- No gradients, blur, or glassmorphism
- Pink (#d4316e / 0.57 0.23 354) is the only saturated color; all others are neutral or muted
- All interactive surfaces must meet AA+ contrast (7:1+) in both light and dark modes
- Mobile-first responsive: sidebar collapses below `md` breakpoint

## Signature Detail

Pink active indicator in sidebar with smooth left-border animation; immediately signals current navigation state without additional visual noise.
