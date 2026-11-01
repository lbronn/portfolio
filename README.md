# Bronn Samson: Portfolio

Static portfolio: HTML, CSS and vanilla JS ES modules with a raw WebGL hero. No build step.

## Run locally

    npm run dev      # python3 -m http.server 5173 → http://localhost:5173
    npm test         # node:test suite for src/js/lib.js

## Structure

- `index.html`: home page; `project/<slug>/index.html`: case studies
- `src/css/base.css`: tokens + shared primitives; `home.css`: home page; `case.css`: case studies
- `src/js/main.js`: DOM wiring (one null-safe init per feature)
- `src/js/lib.js`: pure helpers (tested)
- `src/js/portrait-reveal.js`: WebGL burn/trail portrait (lazy-loaded)

## Responsive layout

- `width <= 1024px` (phones in both orientations, tablets in portrait) is the stacked layout: menu-button nav
  (always compact), icon-only portrait switch / "View projects" beside the portrait, and every slider
  (Projects, Achievements, Off-the-clock gallery, Profession roadmap) stacked vertically. Keep `STACKED` in
  `src/js/main.js` equal to it.
- On the stacked roadmap the figure teleports down a stop each time the next stop scrolls into view.
- `(orientation: landscape) and (height <= 600px)` adds phone-landscape tweaks (two-column hero and menu).

## Calibrating the hero portrait

The second layer (`hero-alt-*.webp`) is a still render of the 3D figure in the photo's pose (arms crossed),
framed like `hero-photo-*.webp` in the same 933x871 frame. Measured on both: silhouette top y=43, bottom y=871,
turtleneck starts at y=402 (hair-to-collar height 359px), head centred at x=469, crossed arms around y=640-760.

If the photo and 3D model layers don't line up, change the `photoOffset` default of `mountPortraitReveal()`
in `src/js/portrait-reveal.js` and keep it equal to
`.hero-portrait .layer-photo { transform: translateY(...) }` in `src/css/home.css`
(0.008 = 0.8%). Both are currently 0 because the two layers share a frame.

Design inspired by rinlayheang.me.
