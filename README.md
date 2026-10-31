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

## Calibrating the hero portrait

The second layer (`hero-alt-*.webp`) is a still render of the 3D figure in the photo's pose (arms crossed),
framed like `hero-photo-*.webp`: hair top at y=48 and the head about as wide, in the same 933x871 frame.

If the photo and 3D model layers don't line up, change the `photoOffset` default of `mountPortraitReveal()`
in `src/js/portrait-reveal.js` and keep it equal to
`.hero-portrait .layer-photo { transform: translateY(...) }` in `src/css/home.css`
(0.008 = 0.8%). Both are currently 0 because the two layers share a frame.

Design inspired by rinlayheang.me.
