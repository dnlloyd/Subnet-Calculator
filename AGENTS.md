# AGENTS.md

````md
# AGENTS.md

## Project overview
This repository contains a React single-page application for teaching IPv4 subnetting.
The app is a dark-themed subnet calculator with these core features:
- IPv4 input with validation
- IP class detection (A/B/C/D/E and loopback/reserved)
- synchronized subnet mask controls:
  - slider from /1 to /32
  - CIDR prefix text input
- live network calculations:
  - network address
  - CIDR block notation
  - subnet mask
  - wildcard mask
  - broadcast address
  - usable IP range
  - total IP addresses
  - usable host addresses
- interactive subnet breakdown tree:
  - start from the current subnet
  - divide any subnet into 2 child subnets
  - reset a branch
  - visually show parent/child hierarchy

## Current stack
- React
- Vite
- Tailwind CSS v4 via `@tailwindcss/vite`
- Framer Motion
- lucide-react

## Primary goal
Keep the app instructionally useful for students learning subnetting.
When making changes, prefer clarity, correctness, and visual hierarchy over cleverness.

## Code expectations
- Preserve the existing dark theme and overall visual style.
- Keep the layout compact and professional.
- Do not introduce heavy abstractions unless they clearly improve maintainability.
- Prefer small helper functions for subnet math.
- Keep subnet math correct for:
  - standard subnets
  - `/31`
  - `/32`
- Validate all IPv4 logic carefully before changing UI behavior.
- Avoid unnecessary dependencies.
- Do not rewrite the app structure unless required.

## UX expectations
- This app is for teaching, not just calculation.
- Labels should be explicit and beginner-friendly.
- Tooltips and helper text should be short and useful.
- Important derived values should visually stand out.
- Child subnet rows in the breakdown must remain visually distinguishable from parents.

## Testing and validation
Before finishing work:
1. run the existing subnet self-tests
2. verify the app builds cleanly
3. manually sanity-check at least these examples:
   - `192.168.1.42 /24`
   - `10.5.6.7 /8`
   - `172.16.10.9 /31`
   - `8.8.8.8 /32`
4. verify subnet splitting works for:
   - `192.168.0.0/16 -> /17`
   - further split one child again
5. verify slider and CIDR input stay synchronized

## Preferred commands
Install dependencies:
```bash
npm install
````

Run dev server:

```bash
npm run dev
```

Build production bundle:

```bash
npm run build
```

## Tailwind setup assumptions

This project should use Tailwind v4 with the Vite plugin.
Prefer this setup pattern:

* dependency: `tailwindcss`
* dependency: `@tailwindcss/vite`
* Vite plugin enabled in `vite.config.*`
* stylesheet contains:

```css
@import "tailwindcss";
```

## File guidance

Unless the repo evolves, expect most implementation work in:

* `src/App.jsx` or `src/App.tsx`
* `src/main.jsx` or `src/main.tsx`
* `src/index.css`
* `vite.config.js` or `vite.config.ts`

## Change discipline

For non-trivial changes:

* explain the issue briefly
* make the smallest clean change that solves it
* avoid regressions in subnet math
* keep the existing teaching-oriented terminology unless explicitly asked to rename it

