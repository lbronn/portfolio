# Portfolio Redesign (rinlayheang.me style) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Bronn's portfolio so its look, motion and interactions match https://rinlayheang.me/ (the "editorial HUD" design): condensed display type, paper/ink colour bands, HUD corner-bracket cards, chamfered buttons, topographic contour backgrounds, a WebGL "burn" portrait switch, scroll reveals, a morphing glass nav, and case-study subpages. The content stays Bronn's own.

**Architecture:** Static multi-page site: plain HTML, three CSS files (shared primitives, home, case study) and vanilla ES modules. No build step. The hero effect is a single fragment shader, so it runs on raw WebGL1 that is lazy-loaded on idle, with a static crossfade fallback. Pure logic (contour geometry, sparkline maths, nav state, index maths) lives in `src/js/lib.js` and is unit-tested with Node's built-in test runner.

**Tech Stack:** HTML5, CSS (custom properties, `color-mix()`, range media queries, scroll-driven animations behind `@supports`), vanilla JS ES modules, WebGL1, Google Fonts (Bricolage Grotesque, Onest), Devicon 2.18.0 and Simple Icons 16.36.0 SVGs (downloaded into the repo), `node --test` (Node 22.14.0), `python3 -m http.server` for local dev, `cwebp` for image export.

**Spec:** Appendix A of this document, "Reference spec". It was decoded on 2026-10-27 from rinlayheang.me's production bundle (`/assets/index-DJQkPPgL.js`, `/assets/index-DsfB4g9N.css`, `/assets/CaseStudy-CB32wqNJ.css`, `/assets/portraitReveal-BOXTv9i2.js`) plus its `og.jpg` and hero images.

---

## 0. Decision checkpoints: Bronn confirms these before Task 1

Each item has a recommended default. The tasks below already use the defaults, so only reply on the ones you want changed.

| # | Decision | Default (used by this plan) | Why | Alternative |
|---|---|---|---|---|
| D1 | Stack | **Static HTML + plain CSS + vanilla JS.** Delete Tailwind, PostCSS, Autoprefixer and `dist/`. | The reference CSS is plain custom-property CSS. Porting it rule-for-rule keeps exact values; translating it into Tailwind utilities is a fidelity risk with no visual gain. Your repo is already static HTML. | Port to Vite + React + TS to mirror the reference's component tree. That means more tooling but data-driven lists. |
| D2 | Hero WebGL | **Raw WebGL1 (~170 lines)** | The reference ships a 529 KB three.js chunk to draw **one fullscreen quad with one shader**. Same maths, same textures, same output, ~0.5 MB lighter. | Add `three` as a dependency and mirror it 1:1. |
| D3 | Features the reference doesn't have | **Remove** the dark-mode toggle, typewriter, scroll-to-top button and Phosphor Icons | The reference has no dark mode; it uses colour bands (`tone-ink`) instead. "Copy everything" means dropping what it doesn't have. | Keep dark mode. Every token would then need a dark variant, which is outside the reference. |
| D4 | Section mapping | Hero → About (ink band) → **Achievements** (Cum Laude + PhilNITS) → Skills → Projects → **Work** (reference "Business" layout: venture cards become your Smartsourcing and ChartNexus roles; the retail card + coverflow gallery becomes "Off the clock") → Contact (ink band) → Footer | Every reference element is kept, and every piece of your current content gets a home. The old Roadmap timeline folds into Work and Achievements. | Drop Achievements or Off the clock if you have no photos. |
| D5 | Hero alt portrait | You produce a **stylised render of yourself with identical framing** (the reference uses a chrome sculpture wrapped in a python snake for "data science") | The burn and cursor-trail effect only works when both layers align (eyes on the same pixels). | Use a duotone or edge-detected version of your photo (weaker effect). |
| D6 | Attribution | Footer line `Design inspired by rinlayheang.me` | No licence is shown on any of the author's GitHub repos (checked 2026-10-27). That means all rights reserved, so this plan re-implements from measured values and never copies their source, text or images. A credit is good form. | Omit the credit. |
| D7 | Case-study pages | One page per project: `/project/thrombolaize/`, `/project/boardprep/`, `/project/work-to-home/` | The reference links every project to a case study. | Skip subpages and link projects straight to GitHub. |

**Out of scope (YAGNI, with values recorded in Appendix A in case you need them later):** `tone-yellow` / `tone-teal` bands (defined but unused by the reference), and the case-study FAQ accordion, team grid, photo mosaic, stats row, split poster, embed and channel chips (no page of yours needs them yet).

---

## Global Constraints

- Colours, fonts, sizes, durations and easings come **only** from Appendix A. Never invent a new value. If you need one, add it to Appendix A first.
- Main easing everywhere: `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease`).
- Fonts: exactly `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,500..800&family=Onest:wght@400;500&display=swap`.
- Supported browsers: current Chrome, Edge, Safari and Firefox (needs `color-mix()`, `:has()`, range media queries and `<dialog>`). Scroll-driven coverflow and `interpolate-size` are progressive enhancements.
- All asset and script paths are **relative** (`./src/...` from the root, `../../src/...` from case pages), because the deploy host and base path are not confirmed.
- No new npm dependencies. `package.json` keeps zero dependencies.
- Never copy text, images or source files from rinlayheang.me. Re-implement from Appendix A values.
- Content placeholders use the exact token `[[BRONN: ...]]`. Task 13 blocks the merge until `grep -rn "\[\[BRONN" index.html project/` prints nothing.
- `prefers-reduced-motion: reduce` must disable reveal hiding, carousel autoplay and the portrait burn animation. Durations collapse to 0.01ms.
- Work on branch `redesign/editorial-hud`. Commit at the end of every task. End every commit message with the session's `Co-Authored-By` trailer.

## Review Focus

1. **WebGL unavailable, shader compile failure or context loss** (old iPhones, GPU resets when the tab is backgrounded): the portrait must stay visible through the static crossfade. It must never be a blank canvas over hidden images. Tested in Task 5, step 6.
2. **`main.js` fails to load** (404, blocked module, ancient browser) after the inline head script hid `[data-reveal]` content: all content must reappear within 3 s. Tested in Task 6, step 7.
3. **Reduced motion:** nothing starts hidden, the carousel doesn't autoplay, and the portrait switch is instant. Tested in Task 6 step 7, Task 7 step 5 and Task 5 step 6.
4. **Mobile (≤768px) nav overlay:** it opens and closes from the button, Esc, a link tap, a tap outside, and when scrolling hides the bar. It never stays open over the page. Tested in Task 3, step 5.
5. **Keyboard-only lightbox:** Enter opens it, focus lands on Close, the arrows step through photos (clamped, not wrapped), Esc closes it, and focus returns to the gallery button that opened it. Tested in Task 11, step 6.

---

## Asset & content inputs (Bronn supplies; tasks reference these exact paths)

All images go in `src/assets/images/`. Export with `cwebp` (`brew install webp`, which needs your OK) or squoosh.app using the same sizes.

| File(s) | Size | Source | Used in |
|---|---|---|---|
| `hero-photo-933.webp`, `hero-photo-600.webp` | 933×871, 600×560, **transparent background** | Cut-out of you (remove.bg / Photoshop), framed head-to-chest like the reference | Task 4 |
| `hero-alt-933.webp`, `hero-alt-600.webp` | Same sizes, **same framing, eyes on the same pixels** | Stylised render of the photo (D5) | Task 4 |
| `grad-1/2/3-1080.webp` + `-480.webp` | 1080 wide and 480 wide, any aspect (shown at 4:3 cover) | Graduation / PhilNITS photos (1 to 3) | Task 7 |
| `thrombolaize-1200/640.webp`, `boardprep-1200/640.webp`, `work-to-home-1200/640.webp` | 1200×630, 640×336 | From the existing PNGs (commands below) | Task 9, 12 |
| `avatar-160.webp` | 160×160 | From `profile.jpg` (command below) | Task 11 |
| `offclock-1..4-1080.webp` + `-480.webp` | 1080×1350, 480×600 (4:5) | Basketball / games / coffee / TV photos | Task 11 |
| `og.jpg` (repo root `src/assets/images/`) | 1200×675 | Social preview card | Task 2 |

Commands for the images that already exist (the crops convert 2:1 to 1200:630 ≈ 1.905:1, centred):

```bash
cd src/assets/images
cwebp -q 80 -crop 95 0 3810 2000 -resize 1200 630 thrombolaize.png -o thrombolaize-1200.webp
cwebp -q 80 -crop 95 0 3810 2000 -resize 640 336  thrombolaize.png -o thrombolaize-640.webp
cwebp -q 80 -crop 95 0 3810 2000 -resize 1200 630 boardprep.png    -o boardprep-1200.webp
cwebp -q 80 -crop 95 0 3810 2000 -resize 640 336  boardprep.png    -o boardprep-640.webp
cwebp -q 80 -crop 84 0 2743 1440 -resize 1200 630 work-to-home.png -o work-to-home-1200.webp
cwebp -q 80 -crop 84 0 2743 1440 -resize 640 336  work-to-home.png -o work-to-home-640.webp
cwebp -q 80 -crop 0 479 2736 2736 -resize 160 160 profile.jpg      -o avatar-160.webp
# hero cut-outs (alpha is preserved by default):
cwebp -q 82 -alpha_q 90 hero-photo.png -o hero-photo-933.webp && cwebp -q 82 -alpha_q 90 -resize 600 560 hero-photo.png -o hero-photo-600.webp
cwebp -q 82 -alpha_q 90 hero-alt.png   -o hero-alt-933.webp   && cwebp -q 82 -alpha_q 90 -resize 600 560 hero-alt.png   -o hero-alt-600.webp
```

Content facts nobody has stated yet. These appear as `[[BRONN: ...]]` in the markup:

- Project years (Thrombolaize, BoardPrep, Work-to-Home Forecast), and which project is the "Latest project".
- 12 real data points for the hero sparkline (for example, commute minutes logged by the Work-to-Home workflow).
- Alt text for each photo.
- Company domains for Smartsourcing and ChartNexus (shown in the mock browser bar).
- The deployed site URL (for `og:url` / `og:image`).
- Confirmation of the drafted case-study card copy (it is written from your one-line project descriptions).

---

## File structure

```
index.html                         REWRITE  home page
project/thrombolaize/index.html    CREATE   case study
project/boardprep/index.html       CREATE   case study
project/work-to-home/index.html    CREATE   case study
src/css/base.css                   CREATE   tokens, reset, type, primitives (.hud .cut-btn .tags .burn .contours), tones, reveal system, keyframes
src/css/home.css                   CREATE   nav, hero, home sections, lightbox, footer, home breakpoints
src/css/case.css                   CREATE   case-study layout
src/js/lib.js                      CREATE   pure helpers (no DOM): contourPaths, sparkPoints, navStep, wrapIndex, clampIndex
src/js/main.js                     REWRITE  DOM wiring, one init function per feature, each null-safe
src/js/portrait-reveal.js          CREATE   raw WebGL burn and trail reveal (lazy-imported)
src/assets/logos/*.svg             CREATE   downloaded Devicon / Simple Icons + one original fallback glyph
tests/lib.test.mjs                 CREATE   node:test suite for lib.js
package.json                       MODIFY   type: module, zero deps, dev/test scripts
README.md                          MODIFY   new stack + commands
DELETE: tailwind.config.js, postcss.config.js, src/css/input.css, dist/output.css, package-lock.json
```

---

### Task 1: Branch, remove the Tailwind toolchain, and test pure helpers

**Files:**
- Create: `tests/lib.test.mjs`, `src/js/lib.js`
- Modify: `package.json`
- Delete: `tailwind.config.js`, `postcss.config.js`, `src/css/input.css`, `dist/output.css`, `package-lock.json`

**Interfaces:**
- Produces:
  - `contourPaths(rings = 7, steps = 64): string[]` returns 21 SVG path strings in viewBox space `0 0 1440 900`.
  - `sparkPoints(values: number[]): string` returns a polyline `points` string in viewBox `0 0 100 30`. It throws on fewer than 2 values or any NaN.
  - `navStep(lastY: number, y: number, wasHidden: boolean): { scrolled: boolean, hidden: boolean }`.
  - `wrapIndex(i: number, delta: number, n: number): number` (cyclic).
  - `clampIndex(i: number, delta: number, n: number): number` (bounded).

- [ ] **Step 1: Create the branch and delete the toolchain**

```bash
git switch -c redesign/editorial-hud
git rm tailwind.config.js postcss.config.js src/css/input.css dist/output.css package-lock.json
rm -rf node_modules
```

- [ ] **Step 2: Replace `package.json`**

```json
{
  "name": "portfolio",
  "version": "5.0.0",
  "private": true,
  "description": "Le Bronn Samson's portfolio: static HTML, CSS and WebGL.",
  "type": "module",
  "scripts": {
    "dev": "python3 -m http.server 5173",
    "test": "node --test tests/*.test.mjs"
  },
  "repository": { "type": "git", "url": "git+https://github.com/lbronn/portfolio.git" },
  "license": "ISC"
}
```

- [ ] **Step 3: Write the failing tests in `tests/lib.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contourPaths, sparkPoints, navStep, wrapIndex, clampIndex } from '../src/js/lib.js';

test('contourPaths: 3 centres x 7 rings, closed paths, deterministic', () => {
  const paths = contourPaths();
  assert.equal(paths.length, 21);
  for (const d of paths) {
    assert.match(d, /^M[\d.-]+ [\d.-]+/);
    assert.ok(d.endsWith('Z'));
    assert.equal(d.split('L').length, 65); // 1 M + 64 L segments
  }
  // ring 1 of centre (260,250): r = 46 * (1 + .16 sin(.35) + .08) = 52.2037 -> x = 260 + r*1.25
  assert.ok(paths[0].startsWith('M325.3 250.0'));
  assert.deepEqual(contourPaths(), paths);
});

test('sparkPoints: maps min->y28, max->y4, spreads x over 0..100', () => {
  assert.equal(sparkPoints([0, 10]), '0,28 100,4');
  assert.equal(sparkPoints([3, 3, 3]), '0,28 50,28 100,28'); // flat series must not divide by zero
});

test('sparkPoints: rejects bad input instead of drawing garbage', () => {
  assert.throws(() => sparkPoints([1]), /at least 2/);
  assert.throws(() => sparkPoints([1, Number.NaN]), /numbers/);
});

test('navStep: scrolled past 40px, hides only when scrolling down past 120px', () => {
  assert.deepEqual(navStep(0, 30, false), { scrolled: false, hidden: false });
  assert.deepEqual(navStep(0, 50, false), { scrolled: true, hidden: false });
  assert.deepEqual(navStep(200, 260, false), { scrolled: true, hidden: true });
  assert.deepEqual(navStep(260, 262, true), { scrolled: true, hidden: true }); // <=4px jitter keeps state
  assert.deepEqual(navStep(262, 200, true), { scrolled: true, hidden: false }); // scrolling up reveals
});

test('wrapIndex cycles, clampIndex stops at the ends', () => {
  assert.equal(wrapIndex(2, 1, 3), 0);
  assert.equal(wrapIndex(0, -1, 3), 2);
  assert.equal(clampIndex(0, -1, 4), 0);
  assert.equal(clampIndex(3, 1, 4), 3);
  assert.equal(clampIndex(1, 1, 4), 2);
});
```

- [ ] **Step 4: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '.../src/js/lib.js'`.

- [ ] **Step 5: Write `src/js/lib.js`**

```js
// Pure helpers shared by main.js and the node tests. No DOM access in this file.

// [x, y, scale] of each contour cluster in a 1440x900 viewBox
const CONTOUR_CENTERS = [
  [260, 250, 1],
  [1180, 190, 0.8],
  [900, 760, 1.15],
];

/** Topographic rings: each ring is a wobbly ellipse (x stretched 1.25) sampled at `steps` points. */
export function contourPaths(rings = 7, steps = 64) {
  const paths = [];
  CONTOUR_CENTERS.forEach(([cx, cy, scale], c) => {
    for (let ring = 1; ring <= rings; ring++) {
      const base = ring * 46 * scale;
      let d = '';
      for (let s = 0; s <= steps; s++) {
        const a = (s / steps) * Math.PI * 2;
        const r = base * (1 + 0.16 * Math.sin(a * 3 + c * 2 + ring * 0.35) + 0.08 * Math.cos(a * 5 - c));
        d += `${s ? 'L' : 'M'}${(cx + Math.cos(a) * r * 1.25).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
      }
      paths.push(`${d}Z`);
    }
  });
  return paths;
}

/** Series -> polyline points for a 100x30 viewBox (y range 4..28 leaves room for the stroke). */
export function sparkPoints(values) {
  if (values.length < 2) throw new Error('sparkPoints needs at least 2 values');
  if (values.some((v) => !Number.isFinite(v))) throw new Error('sparkPoints needs finite numbers');
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const last = values.length - 1;
  return values
    .map((v, i) => `${+((i / last) * 100).toFixed(2)},${+(28 - ((v - min) / span) * 24).toFixed(2)}`)
    .join(' ');
}

/** Nav state from consecutive scroll positions. Moves of 4px or less are treated as jitter. */
export function navStep(lastY, y, wasHidden) {
  const hidden = Math.abs(y - lastY) > 4 ? y > 120 && y > lastY : wasHidden;
  return { scrolled: y > 40, hidden };
}

export const wrapIndex = (i, delta, n) => (i + delta + n) % n;
export const clampIndex = (i, delta, n) => Math.min(n - 1, Math.max(0, i + delta));
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `npm test`
Expected: `# pass 5`, `# fail 0`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: drop Tailwind toolchain, add pure helpers with node:test"
```

---

### Task 2: Design tokens, primitives and the page skeleton

**Files:**
- Create: `src/css/base.css`, `src/css/home.css` (header comment only for now)
- Rewrite: `index.html` (skeleton with anchor comments), `src/js/main.js`

**Interfaces:**
- Consumes: `contourPaths()` from Task 1.
- Produces: CSS classes `.cond .hud .hud-label .cut-btn .is-solid .tags .burn .contours .hero-contours .paper .tone .tone-ink .skip-link .icon`; tokens `--paper --ink --ink-soft --teal --yellow --rule --display --body --gutter --max --ease --cut --cut-md --cut-lg`; keyframes `rise fade slide-in burn pop case-in`; reveal selectors `[data-reveal]`, `[data-reveal="wipe"]`, `[data-reveal-style="scan"]`; `main.js` function `initContours()`, which fills every `svg[data-contours]`. Anchor comments in `index.html`: `<!-- NAV -->`, `<!-- HERO -->`, `<!-- ABOUT -->`, `<!-- ACHIEVEMENTS -->`, `<!-- SKILLS -->`, `<!-- PROJECTS -->`, `<!-- WORK -->`, `<!-- CONTACT -->`, `<!-- LIGHTBOX -->`.

- [ ] **Step 1: Write `src/css/base.css`**

```css
/* Tokens + primitives shared by the home page and case studies.
   Values measured from the reference design (Appendix A of the plan); implementation is original. */
:root {
  --paper: #eef3f4;
  --ink: #0b1026;
  --ink-soft: #4b5575;
  --teal: #0a7a8c;
  --yellow: #ffd43b;
  --rule: #0b102624;
  --display: "Bricolage Grotesque", system-ui, sans-serif;
  --body: "Onest", system-ui, sans-serif;
  --gutter: clamp(16px, 5vw, 72px);
  --max: 1280px;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --cut: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  --cut-md: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);
  --cut-lg: polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px);
  color-scheme: light;
}

*, ::before, ::after { box-sizing: border-box; }
* { margin: 0; padding: 0; }
html { scroll-behavior: smooth; scroll-padding-top: 88px; }
body { background: var(--paper); color: var(--ink); font: 400 17px/1.6 var(--body); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
img { display: block; max-width: 100%; height: auto; }
ul { list-style: none; }
a { color: inherit; }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
:focus-visible { outline: 2px solid var(--teal); outline-offset: 3px; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, ::before, ::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
}

.icon { width: 1em; height: 1em; flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 2px; stroke-linecap: round; stroke-linejoin: round; }
.skip-link { position: absolute; top: -60px; left: 16px; z-index: 200; padding: 8px 14px; background: var(--ink); color: #fff; }
.skip-link:focus { top: 16px; }

/* Condensed display type: Bricolage Grotesque at wdth 75 / opsz 96 */
.cond { font-family: var(--display); font-variation-settings: "wdth" 75, "opsz" 96; font-weight: 800; line-height: 0.86; letter-spacing: -0.01em; text-transform: uppercase; }

/* Topographic rings; paths are injected by main.js initContours() */
.contours, .hero-contours { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.contours { z-index: -1; }
.contours path, .hero-contours path { fill: none; stroke: var(--ink); stroke-opacity: 0.06; stroke-width: 1px; vector-effect: non-scaling-stroke; }
.hero-contours path { stroke-opacity: 0.07; }

/* HUD card: eight 1px gradients draw corner brackets. --b = bracket length, --c = bracket colour */
.hud {
  --c: var(--ink);
  --b: 10px;
  --fill: #eef3f4b8;
  position: relative;
  display: block;
  padding: 14px 16px;
  color: inherit;
  text-decoration: none;
  background:
    linear-gradient(var(--c), var(--c)) left top / var(--b) 1px no-repeat,
    linear-gradient(var(--c), var(--c)) left top / 1px var(--b) no-repeat,
    linear-gradient(var(--c), var(--c)) right top / var(--b) 1px no-repeat,
    linear-gradient(var(--c), var(--c)) right top / 1px var(--b) no-repeat,
    linear-gradient(var(--c), var(--c)) left bottom / var(--b) 1px no-repeat,
    linear-gradient(var(--c), var(--c)) left bottom / 1px var(--b) no-repeat,
    linear-gradient(var(--c), var(--c)) right bottom / var(--b) 1px no-repeat,
    linear-gradient(var(--c), var(--c)) right bottom / 1px var(--b) no-repeat,
    var(--fill);
  animation: slide-in 0.9s var(--ease) both;
}
.hud:nth-child(2) { animation-delay: 0.1s; }
.hud:nth-child(3) { animation-delay: 0.2s; }
.hud-link:hover { --c: var(--teal); }
/* Cards on the paper flow: translucent fill, brackets grow + recolour on hover */
.paper .hud { --fill: color-mix(in srgb, var(--paper) 78%, transparent); padding: 20px 22px; animation: none; transition: background-size 0.35s var(--ease); }
.paper .hud:hover { --c: var(--accent, var(--teal)); --b: 22px; }
.hud-label { color: var(--teal); font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }

/* Chamfered button (top-left + bottom-right corners cut 10px) */
.cut-btn { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; padding: 11px 18px; border: 1px solid var(--teal); color: var(--teal); background: color-mix(in srgb, var(--paper) 85%, transparent); clip-path: var(--cut); font-size: 13px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; transition: background-color 0.2s, color 0.2s; }
.cut-btn:hover { background: var(--teal); color: var(--paper); }
.cut-btn .icon { width: 14px; height: 14px; }
.cut-btn.is-solid { background: var(--teal); color: var(--paper); }
.cut-btn.is-solid:hover { background: none; color: var(--teal); }

.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tags li { padding: 3px 10px; border: 1px solid var(--rule); color: var(--ink-soft); font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }

/* Yellow light sweep across media on hover */
.burn { position: relative; overflow: hidden; }
.burn::after { content: ""; position: absolute; top: -10%; bottom: -10%; left: -90px; width: 70px; pointer-events: none; mix-blend-mode: screen; transform: skew(-14deg); background: linear-gradient(90deg, #0000, #ffd43b00 20%, #ffd43be6 50%, #ffd43b00 80%, #0000); }
.burn:hover::after, .project:hover .burn::after { animation: burn 0.9s var(--ease) forwards; }

.paper { position: relative; background: var(--paper); border-top: 1px solid var(--rule); }

/* Full-bleed colour band from a max-width element: spread shadow paints the sides, clip-path keeps it horizontal */
.tone { color: var(--ink); background: var(--paper); box-shadow: 0 0 0 100vmax var(--paper); clip-path: inset(0 -100vmax); padding-bottom: clamp(80px, 10vw, 130px); }
.tone-ink { --paper: #0b1026; --ink: #eef3f4; --ink-soft: #aab3cf; --teal: #ffd43b; --accent: #ffd43b; --rule: #eef3f433; }
.tone-ink .contours path { stroke-opacity: 0.08; }
.tone .cut-btn:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.tone-ink .cut-btn:hover { background: var(--accent); color: #0b1026; border-color: var(--accent); }

/* ---------- Scroll reveal (html.reveal-ready is set by the inline head script) ---------- */
.reveal-ready [data-reveal] {
  --d: calc(var(--i, 0) * 90ms);
  transition: opacity 0.9s var(--ease) var(--d), translate 0.9s var(--ease) var(--d), background-size 0.35s var(--ease);
}
.reveal-ready [data-reveal]:not(.is-visible) { opacity: 0; translate: 0 36px; }
/* "scan" sections: a paper-coloured sheet with a teal leading edge slides down off each element */
.reveal-ready [data-reveal-style="scan"] [data-reveal]:not([data-reveal="wipe"]) { position: relative; overflow: clip; }
.reveal-ready [data-reveal-style="scan"] [data-reveal]:not(.is-visible) { opacity: 1; translate: none; }
.reveal-ready [data-reveal-style="scan"] [data-reveal]:not([data-reveal="wipe"])::after {
  content: ""; position: absolute; top: -60px; left: 0; right: 0; z-index: 3; height: calc(100% + 60px); pointer-events: none;
  background: linear-gradient(180deg, transparent 0, color-mix(in srgb, var(--teal) 25%, transparent) 56px, var(--teal) 58px, var(--paper) 60px);
  transition: translate 1.2s var(--ease) var(--d);
}
.reveal-ready [data-reveal-style="scan"] [data-reveal].is-visible::after { translate: 0 100%; }
/* "wipe": condensed headings rise out of a clip */
.reveal-ready [data-reveal="wipe"]:not(.is-visible) { opacity: 1; translate: none; }
.reveal-ready [data-reveal="wipe"] > .cond { transition: translate 1.1s var(--ease), clip-path 1.1s var(--ease); }
.reveal-ready [data-reveal="wipe"]:not(.is-visible) > .cond { clip-path: inset(-20% -5% 100%); translate: 0 0.35em; }
/* Project covers settle from 1.12x while fading in */
.reveal-ready .project[data-reveal] img { transition: scale 1.4s var(--ease) var(--d), transform 0.7s var(--ease); }
.reveal-ready .project[data-reveal]:not(.is-visible) img { scale: 1.12; }

@keyframes rise { from { opacity: 0; transform: translateY(28px); } }
@keyframes fade { from { opacity: 0; } }
@keyframes slide-in { from { opacity: 0; translate: 24px; } }
@keyframes burn { to { left: 110%; } }
@keyframes pop { from { opacity: 0; transform: scale(0.94); } }
@keyframes case-in { from { opacity: 0; translate: 0 24px; } }
```

- [ ] **Step 2: Create `src/css/home.css` with only its header (later tasks append to it)**

```css
/* Home page: nav, hero, sections, lightbox, footer. Breakpoints at the end of the file. */
```

- [ ] **Step 3: Rewrite `index.html` as the skeleton**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#eef3f4" />
    <title>Le Bronn Samson | AI Engineer Portfolio</title>
    <meta name="description" content="AI Engineer in Cebu City building AI agents, agentic RAG and full-stack applications." />
    <link rel="icon" type="image/png" sizes="32x32" href="./src/assets/images/favicon-32.png" />
    <link rel="icon" type="image/png" sizes="64x64" href="./src/assets/images/favicon-64.png" />
    <link rel="apple-touch-icon" href="./src/assets/images/favicon-180.png" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,500..800&family=Onest:wght@400;500&display=swap" />
    <!-- LCP image: the alt render shows first, then burns into the photo -->
    <link rel="preload" as="image" href="./src/assets/images/hero-alt-933.webp" imagesrcset="./src/assets/images/hero-alt-600.webp 600w, ./src/assets/images/hero-alt-933.webp 933w" imagesizes="(max-width: 1024px) 100vw, 90vh" fetchpriority="high" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content="[[BRONN: site URL]]" />
    <meta property="og:title" content="Le Bronn Samson | AI Engineer Portfolio" />
    <meta property="og:description" content="AI Engineer in Cebu City building AI agents, agentic RAG and full-stack applications." />
    <meta property="og:image" content="[[BRONN: site URL]]/src/assets/images/og.jpg" />
    <meta name="twitter:card" content="summary_large_image" />

    <link rel="stylesheet" href="./src/css/base.css" />
    <link rel="stylesheet" href="./src/css/home.css" />
    <script>
      // Hide [data-reveal] content before first paint so it can animate in.
      // Safety net: if main.js never boots (404, blocked module), show everything after 3 s.
      (function () {
        var root = document.documentElement;
        if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
        root.classList.add("reveal-ready");
        setTimeout(function () { if (!window.__revealBooted) root.classList.remove("reveal-ready"); }, 3000);
      })();
    </script>
    <script type="module" src="./src/js/main.js"></script>
  </head>
  <body style="background:#eef3f4">
    <a href="#about" class="skip-link">Skip to content</a>
    <!-- NAV -->
    <main>
      <!-- HERO -->
      <div class="paper">
        <!-- ABOUT -->
        <!-- ACHIEVEMENTS -->
        <!-- SKILLS -->
        <!-- PROJECTS -->
        <!-- WORK -->
        <!-- CONTACT -->
        <footer class="footer tone tone-ink">
          <span class="cond footer-name">Le Bronn Samson</span>
          <span>Built with HTML, CSS and WebGL in Cebu City · Design inspired by rinlayheang.me</span>
        </footer>
      </div>
    </main>
    <!-- LIGHTBOX -->
  </body>
</html>
```

- [ ] **Step 4: Rewrite `src/js/main.js`**

```js
import { contourPaths } from './lib.js';

/** Fill every <svg data-contours> with the same topographic rings (generated once). */
function initContours() {
  const svgs = document.querySelectorAll('svg[data-contours]');
  if (!svgs.length) return;
  const markup = contourPaths().map((d) => `<path d="${d}"/>`).join('');
  svgs.forEach((svg) => { svg.innerHTML = markup; });
}

// --- boot (module scripts run after the DOM is parsed) ---
initContours();
```

- [ ] **Step 5: Append footer styles to `src/css/home.css`**

```css
/* ---------- Footer ---------- */
.footer { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; max-width: var(--max); margin: 0 auto; padding: 24px var(--gutter); border-top: 1px solid var(--rule); color: var(--ink-soft); font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase; }
.footer-name { color: var(--ink); font-size: 22px; }
.footer.tone { padding-bottom: 24px; }
```

- [ ] **Step 6: Verify in the browser**

Run: `npm run dev`, open `http://localhost:5173`, then paste into the DevTools console:

```js
const cs = (s) => getComputedStyle(document.querySelector(s));
console.assert(cs('body').backgroundColor === 'rgb(238, 243, 244)', 'paper bg');
console.assert(cs('.footer').backgroundColor === 'rgb(11, 16, 38)', 'ink band');
console.assert(cs('.footer-name').fontFamily.includes('Bricolage'), 'display font');
console.assert(document.fonts.check('800 22px "Bricolage Grotesque"'), 'font loaded');
```

Expected: no assertion errors. The footer spans the full window width in navy, with the name in condensed uppercase on the left.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: design tokens, primitives and page skeleton"
```

---

### Task 3: Morphing glass nav and mobile overlay

**Files:**
- Modify: `index.html` (replace `<!-- NAV -->`), `src/css/home.css` (append), `src/js/main.js`

**Interfaces:**
- Consumes: `navStep()` (Task 1).
- Produces: `initNav()`; classes `.nav.is-scrolled .is-hidden .is-open`.

- [ ] **Step 1: Replace `<!-- NAV -->` in `index.html`**

```html
<header class="nav">
  <a href="#top" class="nav-brand">Le Bronn Samson</a>
  <nav aria-label="Sections">
    <ul class="nav-links">
      <li><a href="#about">About</a></li>
      <li><a href="#achievements">Achievements</a></li>
      <li><a href="#skills">Skills</a></li>
      <li><a href="#projects">Projects</a></li>
      <li><a href="#work">Work</a></li>
      <li class="nav-links-contact"><a href="#contact">Contact <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a></li>
    </ul>
  </nav>
  <div class="nav-end">
    <a href="#contact" class="nav-cta">Contact <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a>
    <button type="button" class="nav-menu-btn" aria-expanded="false" aria-label="Open menu">
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
    </button>
  </div>
</header>
```

- [ ] **Step 2: Append nav styles to `src/css/home.css`**

```css
/* ---------- Nav: one glass pill that splits into three pills after 40px of scroll ---------- */
.nav {
  --glass: linear-gradient(135deg, #ffffff80, #ffffff2e);
  --glass-border: #fff9;
  --glass-shadow: inset 0 1px 0 #fff, inset 0 -1px 0 #ffffff59, 0 12px 32px -14px #283c6e59;
  position: fixed; top: 16px; left: 50%; z-index: 100;
  display: grid; grid-template-columns: auto auto auto; align-items: stretch;
  width: fit-content; max-width: calc(100% - 32px);
  interpolate-size: allow-keywords; /* animates width from fit-content (Chromium 129+; elsewhere it snaps) */
  transform: translate(-50%);
  color: var(--ink);
  background: var(--glass);
  border: 1px solid var(--glass-border); border-radius: 999px;
  box-shadow: var(--glass-shadow);
  -webkit-backdrop-filter: blur(18px) saturate(170%); backdrop-filter: blur(18px) saturate(170%);
  transition: transform 0.45s var(--ease), width 0.6s var(--ease), gap 0.6s var(--ease), background-color 0.3s, border-color 0.3s, box-shadow 0.3s;
}
.nav.is-hidden { transform: translate(-50%, calc(-100% - 64px)); }
.nav-brand, .nav > nav, .nav-end { display: flex; align-items: center; border: 1px solid #0000; border-radius: 999px; transition: padding 0.6s var(--ease), background-color 0.3s, border-color 0.3s, box-shadow 0.3s; }
.nav > nav, .nav-end { padding: 5px; }
.nav-end { justify-content: flex-end; }
.nav.is-scrolled { width: calc(min(100%, var(--max)) - 2 * var(--gutter)); grid-template-columns: 1fr auto 1fr; gap: 12px; background: none; border-color: #0000; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; }
.nav.is-scrolled .nav-brand, .nav.is-scrolled > nav, .nav.is-scrolled .nav-end { background: var(--glass); border-color: var(--glass-border); box-shadow: var(--glass-shadow); -webkit-backdrop-filter: blur(18px) saturate(170%); backdrop-filter: blur(18px) saturate(170%); }
.nav.is-scrolled .nav-brand { justify-self: start; padding: 0 24px; }
.nav.is-scrolled .nav-end { justify-self: end; }
.nav-brand { padding: 0 8px 0 20px; font: 800 19px/1 var(--display); font-variation-settings: "wdth" 75, "opsz" 48; letter-spacing: 0.01em; text-transform: uppercase; white-space: nowrap; text-decoration: none; }
.nav-links { display: flex; align-items: center; gap: 2px; font-size: 14px; }
.nav-links a { display: block; padding: 8px 14px; border-radius: 999px; white-space: nowrap; text-decoration: none; transition: background-color 0.2s; }
.nav-links a:hover { background: #0b102612; }
.nav-links-contact { display: none; }
.nav-cta { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; background: var(--ink); color: #fff; font-size: 14px; font-weight: 500; white-space: nowrap; text-decoration: none; transition: background-color 0.2s; }
.nav-cta:hover { background: #222a4d; }
.nav-cta .icon { width: 14px; height: 14px; }
.nav-menu-btn { display: none; place-items: center; width: 42px; height: 42px; margin-left: 4px; border-radius: 999px; }
.nav-menu-btn .icon { width: 20px; height: 20px; }

@media (width <= 768px) {
  .nav { left: 50%; width: 100vw; max-width: none; margin-left: -50vw; padding: 0 max(14px, env(safe-area-inset-left)); grid-template-columns: 1fr auto; gap: 8px; transform: none; background: none; border-color: #0000; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; transition: top 0.4s var(--ease); }
  .nav.is-scrolled { width: 100vw; grid-template-columns: 1fr auto; }
  .nav.is-hidden { top: -70px; transform: none; }
  .nav-brand, .nav.is-scrolled .nav-brand, .nav-menu-btn { padding: 10px 18px; border: 1px solid var(--glass-border); border-radius: 999px; background: var(--glass); box-shadow: var(--glass-shadow); -webkit-backdrop-filter: blur(18px) saturate(170%); backdrop-filter: blur(18px) saturate(170%); }
  .nav-menu-btn { display: grid; padding: 0; }
  .nav.is-scrolled .nav-end { padding: 0; background: none; border-color: #0000; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; }
  .nav-end .nav-cta { display: none; }
  .nav-links-contact { display: block; }
  /* full-screen ink overlay */
  .nav > nav { position: fixed; inset: 0; align-items: start; width: 100%; max-width: none; padding: 96px 24px calc(32px + env(safe-area-inset-bottom)); border: 0; border-radius: 0; background: #0b1026; color: #eef3f4; opacity: 0; pointer-events: none; transition: opacity 0.3s var(--ease); }
  .nav.is-open > nav { opacity: 1; pointer-events: auto; }
  .nav-links { display: grid; align-content: start; gap: 6px; width: 100%; font-family: var(--display); font-variation-settings: "wdth" 75, "opsz" 96; font-size: clamp(34px, 11vw, 48px); font-weight: 800; line-height: 1; text-align: left; text-transform: uppercase; }
  .nav-links a { padding: 10px 0; border-radius: 0; }
  .nav-links a:hover, .nav-links a:active { background: none; color: #ffd43b; }
  .nav-links-contact a { display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding: 16px 22px; border-radius: 999px; background: #ffd43b; color: #0b1026; font-size: clamp(20px, 6vw, 26px); }
  .nav-links-contact .icon { width: 20px; height: 20px; }
  .nav.is-open .nav-brand, .nav.is-open .nav-menu-btn { position: relative; z-index: 2; color: #eef3f4; background: none; border-color: #eef3f459; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; }
}
```

- [ ] **Step 3: Add `initNav` to `src/js/main.js`**

Change the import line to `import { contourPaths, navStep } from './lib.js';`, then add this above the boot section:

```js
const ICON_PATH = { menu: 'M4 7h16M4 12h16M4 17h16', close: 'M6 6l12 12M18 6 6 18' };

/** Glass nav: splits into pills after 40px, hides on scroll-down past 120px, mobile overlay menu. */
function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const btn = nav.querySelector('.nav-menu-btn');
  const iconPath = btn.querySelector('path');
  let lastY = window.scrollY;
  let hidden = false;

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    iconPath.setAttribute('d', open ? ICON_PATH.close : ICON_PATH.menu);
  };

  const onScroll = () => {
    const y = window.scrollY;
    const state = navStep(lastY, y, hidden);
    hidden = state.hidden;
    nav.classList.toggle('is-scrolled', state.scrolled);
    nav.classList.toggle('is-hidden', state.hidden);
    if (state.hidden) setOpen(false);
    lastY = y;
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  btn.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  window.addEventListener('pointerdown', (e) => { if (!e.target.closest('.nav')) setOpen(false); });
}
```

Add `initNav();` below `initContours();` in the boot section.

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: still `# pass 5`.

- [ ] **Step 5: Verify in the browser** (temporarily add `<div style="height:300vh"></div>` before `</main>`; delete it after checking)

- 1440px wide, at the top: one centred glass pill (brand · links · black "Contact ↗").
- Scroll down 60px: the pill widens to the content width and splits into three glass pills (brand left, links centre, CTA right) over 0.6s.
- Keep scrolling down past 120px: the nav slides up out of view. Scroll up 10px: it slides back.
- At 390px wide: the brand pill sits left and a round menu button sits right. Tap it: a navy full-screen overlay appears with huge condensed links and a yellow "Contact ↗" pill, and the icon becomes ×. Check that each of these closes it: Esc, tapping a link, tapping the brand, and scrolling down.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: morphing glass nav with mobile overlay"
```

---

### Task 4: Hero layout, HUD panels, sparkline and portrait switch (static fallback)

**Files:**
- Modify: `index.html` (replace `<!-- HERO -->`), `src/css/home.css` (append), `src/js/main.js`

**Interfaces:**
- Consumes: `sparkPoints()` (Task 1), `initContours()` (Task 2).
- Produces: `initSpark()`. `initHero()` with mode classes `.hero-portrait.is-intro | .is-static | .is-webgl` and `data-layer="photo" | "alt"`. Task 5 plugs WebGL into `initHero()`.

- [ ] **Step 1: Replace `<!-- HERO -->` in `index.html`**

```html
<section id="top" class="hero">
  <svg class="hero-contours" data-contours viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>
  <div class="hero-intro">
    <h1 class="hero-name"><span>Le Bronn</span> <span>Samson</span></h1>
    <ul class="hero-meta hero-meta-top">
      <li><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /></svg>Cebu City, Philippines</li>
      <li><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5L2 9Zm4 2.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5M22 9v6" /></svg>BS Computer Science, Cum Laude</li>
      <li><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 8-4 4 4 4m8-8 4 4-4 4m-2-11-4 14" /></svg>AI agents, RAG and full-stack</li>
    </ul>
  </div>
  <div class="hero-stage">
    <div class="hero-portrait is-intro" data-layer="photo">
      <img class="layer-alt" src="./src/assets/images/hero-alt-933.webp" srcset="./src/assets/images/hero-alt-600.webp 600w, ./src/assets/images/hero-alt-933.webp 933w" sizes="(max-width: 1024px) 100vw, 90vh" width="933" height="871" alt="" fetchpriority="high" />
      <img class="layer-photo" src="./src/assets/images/hero-photo-933.webp" srcset="./src/assets/images/hero-photo-600.webp 600w, ./src/assets/images/hero-photo-933.webp 933w" sizes="(max-width: 1024px) 100vw, 90vh" width="933" height="871" alt="Portrait of Le Bronn Samson" />
      <canvas aria-hidden="true"></canvas>
    </div>
  </div>
  <aside class="hero-panels" aria-label="At a glance">
    <div class="hud">
      <p class="hud-label">Currently</p>
      <p class="hud-title">AI Engineer</p>
      <p class="hud-sub">Smartsourcing, Cebu City</p>
    </div>
    <!-- [[BRONN: confirm Work-to-Home Forecast is the latest project]] -->
    <a href="./project/work-to-home/" class="hud hud-link">
      <p class="hud-label">Latest project</p>
      <p class="hud-title">Work-to-Home Forecast</p>
      <p class="hud-sub">n8n, [[BRONN: year]]</p>
      <svg class="hud-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline data-spark="[[BRONN: 12 comma-separated numbers]]" /></svg>
    </a>
    <div class="hud">
      <p class="hud-label">At a glance</p>
      <dl class="hud-stats">
        <div><dt>Projects</dt><dd>3</dd></div>
        <div><dt>Skills</dt><dd>3</dd></div>
        <div><dt>Years</dt><dd>2+</dd></div>
      </dl>
    </div>
  </aside>
  <div class="hero-bar">
    <ul class="hero-meta hero-meta-bar">
      <li><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /></svg>Cebu City, Philippines</li>
      <li><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5L2 9Zm4 2.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5M22 9v6" /></svg>BS Computer Science, Cum Laude</li>
      <li><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 8-4 4 4 4m8-8 4 4-4 4m-2-11-4 14" /></svg>AI agents, RAG and full-stack</li>
    </ul>
    <button type="button" class="hero-switch" aria-pressed="false">
      <span class="switch-icon" aria-hidden="true"><svg class="icon" viewBox="0 0 24 24"><path d="M4 8h14l-4-4M18 8l-4 4M20 16H6l4-4M6 16l4 4" /></svg></span>
      <span><span class="hero-switch-title">Show render</span><span class="hero-switch-sub">Switch portrait</span></span>
    </button>
    <div class="hero-cta-wrap">
      <a href="#projects" class="hero-cta">View projects <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Append hero styles to `src/css/home.css`**

```css
/* ---------- Hero ---------- */
.hero { --paper: #eef3f4; --ink-soft: #4b5575; --teal: #0a7a8c; position: relative; height: 100svh; min-height: 680px; overflow: hidden; background: var(--paper); color: var(--ink); }
.hero-intro { position: absolute; top: 50%; left: var(--gutter); z-index: 3; transform: translateY(-42%); }
.hero-name { font-family: var(--display); font-variation-settings: "wdth" 75, "opsz" 96; font-size: clamp(64px, 8.4vw, 136px); font-weight: 800; line-height: 0.84; letter-spacing: -0.01em; text-transform: uppercase; }
.hero-name span { display: block; animation: rise 0.9s var(--ease) both; }
.hero-name span + span { animation-delay: 80ms; }
.hero-meta { letter-spacing: 0.05em; text-transform: uppercase; animation: rise 0.9s 0.2s var(--ease) both; }
.hero-meta li { display: flex; align-items: center; gap: 10px; }
.hero-meta .icon { width: 15px; height: 15px; color: var(--teal); }
.hero-meta-top { display: grid; gap: 8px; margin-top: 32px; font-size: 13px; }
.hero-meta-bar { display: none; grid-column: 1 / -1; flex-wrap: wrap; align-items: center; gap: 8px 28px; padding-bottom: 14px; border-bottom: 1px solid #0b102624; font-size: 12px; }
.hero-stage { position: absolute; inset: 0; z-index: 1; }
.hero-portrait { position: absolute; bottom: -40px; left: 50%; height: calc(100% - 64px); aspect-ratio: 946 / 883; transform: translate(-50%); animation: fade 1s both; }
.hero-portrait img, .hero-portrait canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.hero-portrait canvas { opacity: 0; transition: opacity 0.2s; }
/* Calibration knob: keep equal to photoOffset in portrait-reveal.js (0.008 = 0.8%) */
.hero-portrait .layer-photo { transform: translateY(0.8%); }
.hero-portrait.is-intro .layer-photo { opacity: 0; }
.hero-portrait.is-static img { transition: opacity 0.6s; }
.hero-portrait.is-static[data-layer="photo"] .layer-alt,
.hero-portrait.is-static[data-layer="alt"] .layer-photo { opacity: 0; }
.hero-portrait.is-webgl img { visibility: hidden; }
.hero-portrait.is-webgl canvas { opacity: 1; }
.hero-panels { position: absolute; top: 50%; right: var(--gutter); z-index: 3; display: grid; gap: 14px; width: 236px; transform: translateY(-50%); }
.hud-title { margin-top: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.02em; text-transform: uppercase; }
.hud-sub { color: var(--ink-soft); font-size: 12px; line-height: 1.4; letter-spacing: 0.03em; text-transform: uppercase; }
.hud-spark { display: block; width: 100%; height: 30px; margin-top: 10px; overflow: visible; }
.hud-spark polyline { fill: none; stroke: currentColor; stroke-width: 1.5px; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.hud-link:hover .hud-spark { color: var(--teal); }
.hud-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
.hud-stats dt { color: var(--ink-soft); font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; }
.hud-stats dd { margin-top: 4px; font: 800 34px/1 var(--display); font-variation-settings: "wdth" 75, "opsz" 48; }
.hero-bar { position: absolute; left: var(--gutter); right: var(--gutter); bottom: 28px; z-index: 3; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; animation: fade 1s 0.4s both; }
.hero-switch { justify-self: start; display: inline-flex; align-items: center; gap: 12px; padding: 4px 14px 4px 4px; border-radius: 999px; text-align: left; transition: background-color 0.2s; }
.hero-switch:hover { background: #0b10260f; }
.switch-icon { display: grid; place-items: center; width: 40px; height: 40px; border: 1.5px solid var(--ink); border-radius: 50%; transition: transform 0.5s var(--ease), background-color 0.2s, color 0.2s; }
.switch-icon .icon { width: 18px; height: 18px; stroke-width: 1.8px; }
.hero-switch:hover .switch-icon { background: var(--ink); color: var(--paper); }
.hero-switch[aria-pressed="true"] .switch-icon { transform: rotate(180deg); }
.hero-switch-title { display: block; font-size: 12px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; }
.hero-switch-sub { display: block; color: var(--ink-soft); font-size: 11px; }
.hero-cta-wrap { grid-column: 3; justify-self: end; }
.hero-cta { display: inline-flex; align-items: center; gap: 10px; padding: 12px 22px; border: 1px solid var(--teal); color: var(--teal); background: #eef3f4d9; clip-path: var(--cut); font-size: 13px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; transition: background-color 0.2s, color 0.2s; }
.hero-cta:hover { background: var(--teal); color: var(--paper); }

@media (width <= 1024px) {
  .hero { display: flex; flex-direction: column; height: auto; min-height: 0; padding: 104px 0 28px; }
  .hero-intro, .hero-panels, .hero-bar { position: relative; inset: auto; transform: none; }
  .hero-intro { padding: 0 var(--gutter); }
  .hero-stage { position: relative; margin-top: 12px; }
  .hero-portrait { position: relative; left: auto; width: min(100%, 720px); height: auto; margin: 0 auto; transform: none; }
  .hero-panels { width: auto; padding: 24px var(--gutter) 0; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
  .hero-bar { padding: 28px var(--gutter) 0; grid-template-columns: 1fr; justify-items: start; gap: 20px; }
  .hero-cta-wrap { grid-column: auto; justify-self: start; }
}
@media (width <= 768px) {
  .hero { padding: 88px 0 20px; }
  .hero-intro { text-align: center; }
  .hero-meta-top { display: none; }
  .hero-meta-bar { display: flex; gap: 6px 18px; padding-bottom: 12px; font-size: 11px; }
  .hero-name { font-size: 8.5vw; white-space: nowrap; }
  .hero-name span { display: inline; }
  .hero-portrait { width: min(100%, 420px, 44.9966svh); }
  .hero-stage { margin-top: 4px; }
  .hero-panels { grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 18px; }
  .hero-panels > :last-child { grid-column: 1 / -1; }
  .hero-bar { gap: 14px; padding-top: 20px; }
}
@media (width <= 400px) {
  .hero-portrait { width: min(100%, 40.7112svh); }
  .hero-panels { gap: 8px; }
}
```

- [ ] **Step 3: Add `initSpark` and `initHero` to `src/js/main.js`**

Change the import line to `import { contourPaths, navStep, sparkPoints } from './lib.js';`, then add:

```js
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** <polyline data-spark="1,2,3"> -> points. Bad data hides the sparkline instead of breaking the hero. */
function initSpark() {
  document.querySelectorAll('polyline[data-spark]').forEach((line) => {
    try {
      line.setAttribute('points', sparkPoints(line.dataset.spark.split(',').map(Number)));
    } catch (err) {
      console.warn('[hero] sparkline hidden, bad data-spark:', err.message);
      line.closest('svg').remove();
    }
  });
}

/** Portrait switch. Modes: intro (alt visible, waiting) -> webgl | static (CSS crossfade fallback). */
function initHero() {
  const portrait = document.querySelector('.hero-portrait');
  if (!portrait) return;
  const btn = document.querySelector('.hero-switch');
  const title = btn.querySelector('.hero-switch-title');
  let mode = 'intro';
  let layer = 'photo';
  let reveal = null; // set by Task 5

  const setMode = (next) => {
    portrait.classList.replace(`is-${mode}`, `is-${next}`);
    mode = next;
  };
  if (reducedMotion()) setMode('static');

  btn.addEventListener('click', () => {
    layer = layer === 'photo' ? 'alt' : 'photo';
    portrait.dataset.layer = layer;
    btn.setAttribute('aria-pressed', String(layer === 'alt'));
    title.textContent = layer === 'photo' ? 'Show render' : 'Show photo';
    reveal?.show(layer);
    if (mode === 'intro' && !reveal) setMode('static');
  });

  // Task 5 replaces this line with the WebGL boot; until then fall back after first paint.
  requestAnimationFrame(() => setMode('static'));
}
```

Add `initSpark();` and `initHero();` to the boot section.

- [ ] **Step 4: Verify in the browser** (use test numbers in `data-spark` for now, e.g. `5,7,6,9,8,11,10,12,9,8,7,6`, and restore the `[[BRONN:` token afterwards if the real data isn't ready)

- 1440×900: a huge condensed two-line name on the left, the portrait centred and bleeding off the bottom, three HUD cards on the right sliding in from the right with 0.1s stagger, faint contour rings behind everything, and the bottom bar with the switch on the left and the chamfered "View projects ↗" on the right.
- The name rises in (the second line 80ms later), then the meta list 0.2s after that. The bar fades in after 0.4s.
- Click "Show render": the portrait crossfades in 0.6s, the switch icon rotates 180°, and the label reads "Show photo".
- The sparkline draws as a thin polyline. Hover the card: the corner brackets and the line turn teal.
- 390px wide: the name is on one line (8.5vw) and centred, the meta becomes a wrapped bar, and the panels form a 2-column grid with the third card full width.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: hero layout, HUD panels, sparkline, static portrait switch"
```

---

### Task 5: WebGL burn reveal and cursor trail

**Files:**
- Create: `src/js/portrait-reveal.js`
- Modify: `src/js/main.js` (`initHero` boot)

**Interfaces:**
- Consumes: `.hero-portrait` markup and `setMode()`/`reveal` inside `initHero()` (Task 4).
- Produces: `mountPortraitReveal(canvas: HTMLCanvasElement, photo: HTMLImageElement, alt: HTMLImageElement, opts?: { reducedMotion?: boolean, glow?: string, photoOffset?: [number, number], onLost?: () => void }): { show(layer: 'photo' | 'alt'): void }`. It throws if WebGL is unavailable or the shaders fail to compile.

- [ ] **Step 1: Write `src/js/portrait-reveal.js`**

```js
// Hero portrait "burn" reveal: one fullscreen quad, two textures, an fbm-noise threshold and a cursor-trail mask.
// Raw WebGL1 on purpose: the whole effect is one fragment shader, so three.js (~530 KB) would buy nothing.

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENT = `
precision highp float; // mediump breaks the sin-hash on many mobile GPUs
uniform sampler2D uPhoto;
uniform sampler2D uAlt;
uniform sampler2D uTrail;
uniform float uProgress;   // 0 = render fully shown, 1 = photo fully shown
uniform vec3 uGlow;
uniform vec2 uPhotoOffset; // calibration knob so the photo's eyes sit on the render's eyes
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) { v += amp * noise(p); p *= 2.0; amp *= 0.5; }
  return v;
}

void main() {
  vec4 photo = texture2D(uPhoto, vUv + uPhotoOffset);
  vec4 alt = texture2D(uAlt, vUv);

  // burn front sweeping through the noise field
  float n = fbm(vUv * vec2(4.2, 4.0) + 1.7);
  const float EDGE = 0.07;
  float front = uProgress * (1.0 + EDGE * 2.0) - EDGE;
  float revealed = 1.0 - smoothstep(front - EDGE * 0.35, front + EDGE * 0.35, n);
  float burnGlow = 1.0 - smoothstep(0.0, EDGE, abs(n - front));

  // cursor trail flips to the other layer with a ragged edge (alpha channel: 2D canvas uploads un-premultiplied)
  float trail = texture2D(uTrail, vUv).a + (n - 0.5) * 0.35;
  float trailMask = smoothstep(0.28, 0.55, trail);
  float trailGlow = pow(4.0 * trailMask * (1.0 - trailMask), 4.0) * 0.8; // thin rim only

  // only flip where the other layer has pixels, so the trail never punches holes
  float coverage = mix(photo.a, alt.a, revealed);
  float showPhoto = mix(revealed, 1.0 - revealed, trailMask * coverage);
  vec4 color = mix(vec4(alt.rgb * alt.a, alt.a), vec4(photo.rgb * photo.a, photo.a), showPhoto);
  float glow = clamp(burnGlow + trailGlow, 0.0, 1.0) * max(photo.a, alt.a);
  color.rgb += uGlow * glow;
  color.a = max(color.a, glow);
  gl_FragColor = color; // premultiplied, matches the context's premultipliedAlpha
}`;

const TRAIL_WIDTH = 192;   // trail mask resolution; the noise hides the low res
const TRAIL_FADE = 0.045;  // alpha erased per frame (~1.5 s trail life at 60 fps)
const BRUSH_PX = 90;       // brush radius in CSS px
const IDLE_FRAMES = 150;   // keep rendering after the last pointer move so the trail can fade out
const BURN_SECONDS = 1.3;  // duration of a full photo <-> render burn

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'shader compile failed');
  return shader;
}

function createTexture(gl, unit, source) {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // NPOT-safe in WebGL1: clamp + linear, no mipmaps
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  return texture;
}

export function mountPortraitReveal(canvas, photo, alt, { reducedMotion = false, glow = '#ffd43b', photoOffset = [0, 0.008], onLost } = {}) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) throw new Error('WebGL unavailable');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'program link failed');
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const trail = document.createElement('canvas');
  trail.width = TRAIL_WIDTH;
  trail.height = Math.round((TRAIL_WIDTH * photo.naturalHeight) / photo.naturalWidth);
  const ctx = trail.getContext('2d');

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // image row 0 = top, GL v=0 = bottom
  createTexture(gl, 0, photo);
  createTexture(gl, 1, alt);
  const trailTexture = createTexture(gl, 2, trail);

  const uniform = (name) => gl.getUniformLocation(program, name);
  gl.uniform1i(uniform('uPhoto'), 0);
  gl.uniform1i(uniform('uAlt'), 1);
  gl.uniform1i(uniform('uTrail'), 2);
  gl.uniform3fv(uniform('uGlow'), hexToRgb(glow));
  gl.uniform2fv(uniform('uPhotoOffset'), photoOffset);
  const uProgress = uniform('uProgress');

  let progress = reducedMotion ? 1 : 0;
  let goal = 1;
  let rect = canvas.getBoundingClientRect();
  let pointer = null;
  let lastPointer = null;
  let idle = 0;
  let raf = 0;
  let running = false;
  let onScreen = true;
  let lastTime = performance.now();

  const draw = () => {
    gl.uniform1f(uProgress, progress);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const paintTrail = () => {
    const { width: w, height: h } = trail;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${TRAIL_FADE})`;
    ctx.fillRect(0, 0, w, h);
    if (!pointer) return;
    ctx.globalCompositeOperation = 'lighter';
    const radius = (BRUSH_PX / rect.width) * w;
    const from = lastPointer || pointer;
    // stamp along the segment so fast moves leave a continuous stroke
    const stamps = Math.max(1, Math.ceil(Math.hypot((pointer.x - from.x) * w, (pointer.y - from.y) * h) / (radius * 0.35)));
    for (let i = 1; i <= stamps; i++) {
      const x = (from.x + ((pointer.x - from.x) * i) / stamps) * w;
      const y = (from.y + ((pointer.y - from.y) * i) / stamps) * h;
      const brush = ctx.createRadialGradient(x, y, 0, x, y, radius);
      brush.addColorStop(0, 'rgba(255,255,255,0.35)');
      brush.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = brush;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    lastPointer = pointer;
    pointer = null;
  };

  const frame = (now) => {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const animating = progress !== goal;
    if (animating) {
      const step = dt / BURN_SECONDS;
      progress = goal > progress ? Math.min(goal, progress + step) : Math.max(goal, progress - step);
    }
    const moved = pointer !== null;
    paintTrail();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, trailTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trail);
    draw();
    idle = moved ? IDLE_FRAMES : idle - 1;
    if (animating || idle > 0) raf = requestAnimationFrame(frame);
    else { running = false; lastPointer = null; }
  };

  const wake = () => {
    if (running || !onScreen || document.hidden) return;
    running = true;
    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const sleep = () => { cancelAnimationFrame(raf); running = false; };

  const resize = () => {
    rect = canvas.getBoundingClientRect();
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    draw(); // resizing clears the drawing buffer
    wake();
  };

  window.addEventListener('pointermove', (e) => {
    rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < -0.1 || x > 1.1 || y < -0.1 || y > 1.1) { lastPointer = null; return; }
    pointer = { x, y };
    wake();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? sleep() : wake()));
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    onScreen ? wake() : sleep();
  }).observe(canvas);
  new ResizeObserver(resize).observe(canvas);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    sleep();
    onLost?.();
  });

  resize();
  return {
    show(layer) {
      goal = layer === 'alt' ? 0 : 1;
      if (reducedMotion) { progress = goal; draw(); }
      wake();
    },
  };
}
```

- [ ] **Step 2: Replace the fallback line in `initHero()` (`requestAnimationFrame(() => setMode('static'));`) with the WebGL boot**

```js
  const altImg = portrait.querySelector('.layer-alt');
  const photoImg = portrait.querySelector('.layer-photo');
  const decoded = async (img) => {
    const copy = new Image();
    copy.src = img.currentSrc || img.src;
    await copy.decode();
    return copy;
  };
  const boot = async () => {
    try {
      const [photo, alt, { mountPortraitReveal }] = await Promise.all([decoded(photoImg), decoded(altImg), import('./portrait-reveal.js')]);
      reveal = mountPortraitReveal(portrait.querySelector('canvas'), photo, alt, {
        reducedMotion: reducedMotion(),
        onLost: () => { reveal = null; setMode('static'); },
      });
      reveal.show(layer);
      setMode('webgl');
    } catch (err) {
      console.warn('[hero] WebGL portrait unavailable, using static crossfade:', err);
      setMode('static');
    }
  };
  if ('requestIdleCallback' in window) requestIdleCallback(boot, { timeout: 800 });
  else setTimeout(boot, 200);
```

- [ ] **Step 3: Run the tests**

Run: `npm test`
Expected: `# pass 5`.

- [ ] **Step 4: Verify the intro burn**

Hard-reload `http://localhost:5173`. The render shows first (the LCP image). Within about 1s a ragged burn front with a yellow (`#ffd43b`) glowing edge sweeps across the portrait over 1.3s and leaves the photo.
Console: `document.querySelector('.hero-portrait').className` should equal `'hero-portrait is-webgl'`.

- [ ] **Step 5: Verify the trail and the switch**

- Move the cursor over the portrait: a soft brush (~90px radius) flips pixels to the render, with a thin yellow rim, and fades out in about 1.5s. Outside the figure's silhouette nothing changes (no holes).
- Click the switch: the burn runs in reverse to the render (1.3s). Click again and it burns back.
- If the eyes don't line up between layers, tune `photoOffset` in `initHero` (passed to `mountPortraitReveal`) **and** the `translateY(0.8%)` in `home.css` together.

- [ ] **Step 6: Verify the failure paths (Review Focus 1 and 3)**

1. Simulated WebGL failure. Paste this into the console, then trigger a soft reload with `location.reload()`, having enabled "Preserve log" and overridden the page via DevTools → Sources → Overrides. Simpler: temporarily add `HTMLCanvasElement.prototype.getContext = () => null;` as the first line of `portrait-reveal.js`.
   Expected: console warning `[hero] WebGL portrait unavailable`, class `is-static`, photo visible, and the switch crossfades. Remove the line afterwards.
2. Context loss: `document.querySelector('.hero-portrait canvas').getContext('webgl').getExtension('WEBGL_lose_context').loseContext()`.
   Expected: class flips to `is-static` and the images become visible again (never blank).
3. Reduced motion (DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`, then reload): the photo shows immediately with no intro burn, and the switch flips instantly.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: raw WebGL burn reveal with cursor trail and static fallback"
```

---

### Task 6: Section system, reveal observer, About and Contact

**Files:**
- Modify: `index.html` (replace `<!-- ABOUT -->` and `<!-- CONTACT -->`), `src/css/home.css` (append), `src/js/main.js`

**Interfaces:**
- Consumes: reveal CSS (Task 2), inline head script (Task 2) that sets `html.reveal-ready` and reads `window.__revealBooted`.
- Produces: `initReveal()`; classes `.section .sec-head .sec-title .sec-meta .sec-sub .about .about-text .facts .contact .contact-title .contact-sub .contact-list .contact-value`. Reveal stagger contract: `style="--i:N"` → N × 90ms delay.

- [ ] **Step 1: Replace `<!-- ABOUT -->`**

```html
<section id="about" class="section tone tone-ink">
  <svg class="contours" data-contours viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>
  <div class="sec-head" data-reveal="wipe">
    <h2 class="cond sec-title">About</h2>
    <div class="sec-meta" data-reveal style="--i:1">
      <p class="hud-label">Who I am</p>
      <p class="sec-sub">Cebu City, Philippines</p>
    </div>
  </div>
  <div class="about">
    <div class="about-text">
      <p data-reveal>I'm an AI Engineer at Smartsourcing in Cebu City. I build hyperspecific AI agents, agentic multimodal RAG and the full-stack apps around them.</p>
      <p data-reveal style="--i:1">From vectors and embeddings to orchestration, evals and logging, I take AI from research to production, and I ship fast proofs of concept so teams can decide with evidence.</p>
    </div>
    <dl class="facts">
      <div class="hud" data-reveal style="--i:1"><dt class="hud-label">Role</dt><dd>AI Engineer, Smartsourcing</dd></div>
      <div class="hud" data-reveal style="--i:2"><dt class="hud-label">Based in</dt><dd>Cebu City, Philippines</dd></div>
      <div class="hud" data-reveal style="--i:3"><dt class="hud-label">Works across</dt><dd>AI agents, RAG and full-stack</dd></div>
      <div class="hud" data-reveal style="--i:4"><dt class="hud-label">Graduated</dt><dd>BS CS, Cum Laude, CIT-U</dd></div>
    </dl>
  </div>
</section>
```

- [ ] **Step 2: Replace `<!-- CONTACT -->`**

```html
<section id="contact" class="section contact tone tone-ink" data-reveal-style="scan">
  <svg class="contours" data-contours viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>
  <div data-reveal="wipe">
    <h2 class="cond contact-title">Let's<br />work.</h2>
    <p class="contact-sub" data-reveal style="--i:1">I'm open to projects, collaborations and new opportunities.</p>
  </div>
  <ul class="contact-list">
    <li data-reveal style="--i:0"><a class="hud" href="mailto:lebronnsamson@gmail.com?subject=Hi%20Le%20Bronn%20Samson"><span class="hud-label">Email</span><span class="contact-value">lebronnsamson@gmail.com</span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a></li>
    <li data-reveal style="--i:1"><a class="hud" href="https://github.com/lbronn" target="_blank" rel="noopener noreferrer"><span class="hud-label">GitHub</span><span class="contact-value">github.com/lbronn</span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a></li>
    <li data-reveal style="--i:2"><a class="hud" href="https://www.linkedin.com/in/lebronnsamson/" target="_blank" rel="noopener noreferrer"><span class="hud-label">LinkedIn</span><span class="contact-value">linkedin.com/in/lebronnsamson</span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a></li>
    <li data-reveal style="--i:3"><a class="hud" href="https://www.instagram.com/lbroooooonn/" target="_blank" rel="noopener noreferrer"><span class="hud-label">Instagram</span><span class="contact-value">instagram.com/lbroooooonn</span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a></li>
  </ul>
</section>
```

- [ ] **Step 3: Append section, About and Contact styles to `src/css/home.css`**

```css
/* ---------- Sections ---------- */
.section { position: relative; isolation: isolate; max-width: var(--max); margin: 0 auto; padding: clamp(80px, 10vw, 130px) var(--gutter) 0; }
.sec-head { display: flex; justify-content: space-between; align-items: end; gap: 24px; margin-bottom: clamp(32px, 4vw, 48px); }
.sec-title { font-size: clamp(56px, 8vw, 120px); }
.sec-meta { padding-bottom: 6px; text-align: right; }
.sec-sub { color: var(--ink-soft); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }

/* ---------- About ---------- */
.about { display: grid; grid-template-columns: 1.1fr 1fr; align-items: start; gap: clamp(32px, 6vw, 90px); }
.about-text p { max-width: 32em; font-size: 20px; line-height: 1.55; }
.about-text p + p { margin-top: 16px; color: var(--ink-soft); }
.facts { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.facts dd { margin-top: 6px; font-weight: 500; }

/* ---------- Contact ---------- */
.contact { display: grid; grid-template-columns: 1fr 1fr; align-items: end; gap: clamp(40px, 6vw, 96px); padding-bottom: clamp(80px, 10vw, 130px); }
.contact-title { font-size: clamp(80px, 11vw, 170px); }
.contact-sub { margin-top: 20px; color: var(--ink-soft); font-size: 18px; }
.contact-list { display: grid; gap: 18px; }
.paper .contact-list a { display: grid; grid-template-columns: 7em 1fr auto; align-items: center; gap: 16px; padding: 16px 20px; }
.contact-value { overflow-wrap: anywhere; }
.contact-list .icon { width: 18px; height: 18px; transition: transform 0.3s var(--ease), color 0.2s; }
.contact-list a:hover .icon { color: var(--teal); transform: translate(2px, -2px); }
```

- [ ] **Step 4: Add `initReveal` to `src/js/main.js` and call it first in the boot section**

```js
/** Adds .is-visible as [data-reveal] elements enter the viewport (CSS does the animation). */
function initReveal() {
  window.__revealBooted = true; // tells the head-script safety net that JS is alive
  if (!document.documentElement.classList.contains('reveal-ready')) return; // reduced motion / no IO / safety net fired
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  document.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((el) => io.observe(el));
}
```

Boot order becomes: `initReveal(); initContours(); initNav(); initSpark(); initHero();`

- [ ] **Step 5: Append the section breakpoints to the end of `src/css/home.css`** (later tasks append their rules inside these same blocks. Keep this group as the last thing in the file.)

```css
/* ---------- Home breakpoints (keep last) ---------- */
@media (width <= 1024px) {
  .about, .contact { grid-template-columns: 1fr; }
}
@media (width <= 768px) {
  .sec-head { flex-direction: column; align-items: start; gap: 8px; }
  .sec-meta { text-align: left; }
  .facts { grid-template-columns: 1fr; }
  .paper .contact-list a { grid-template-columns: 1fr auto; gap: 2px 12px; }
  .contact-list .hud-label, .contact-value { grid-column: 1; }
  .contact-list .icon { grid-area: 1 / 2 / span 2; }
}
@media (width <= 560px) {
  .section { padding-top: clamp(56px, 14vw, 80px); }
  .tone { padding-bottom: clamp(56px, 14vw, 80px); }
  .sec-head { margin-bottom: 24px; }
  .sec-title { font-size: clamp(44px, 14vw, 72px); }
  .about-text p { font-size: 17px; }
  .contact-title { font-size: clamp(64px, 20vw, 110px); }
  .contact-sub { font-size: 16px; }
  .footer { flex-direction: column; align-items: start; gap: 8px; }
}
```

- [ ] **Step 6: Verify the motion**

- Scroll to About: a full-width navy band. "ABOUT" rises out of a clip (1.1s) while "WHO I AM" fades up 90ms later. The paragraphs and the four HUD cards fade up 36px with 90ms stagger. Hovering a card grows its yellow corner brackets from 10px to 22px.
- Scroll to Contact: navy band. "LET'S / WORK." wipes up, and each contact row is revealed by a yellow scan line sweeping down (1.2s). Hovering a row nudges its arrow up-right.

- [ ] **Step 7: Verify the failure paths (Review Focus 2 and 3)**

1. Rename `src/js/main.js` → `main.js.bak` and reload. After about 3s all About and Contact content appears (the safety net removed `reveal-ready`). Rename it back.
2. Emulate `prefers-reduced-motion: reduce` and reload: `document.documentElement.classList.contains('reveal-ready')` is `false` and all content is visible immediately.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: section system, scroll reveal (fade/wipe/scan), About and Contact"
```

---

### Task 7: Achievements card and photo carousel

**Files:**
- Modify: `index.html` (replace `<!-- ACHIEVEMENTS -->`), `src/css/home.css` (append before the breakpoints group, plus rules inside it), `src/js/main.js`

**Interfaces:**
- Consumes: `wrapIndex()` (Task 1), `reducedMotion()` (Task 4).
- Produces: `initCarousels()`; markup contract `[data-carousel]` > `img` slides + `.carousel-ui` with `[data-step="-1|1"]` buttons and an empty `.carousel-dots`. The first slide carries `.is-current`.

- [ ] **Step 1: Replace `<!-- ACHIEVEMENTS -->`** (delete `grad-2`/`grad-3` lines if you have only one photo; the UI removes itself)

```html
<section id="achievements" class="section">
  <svg class="contours" data-contours viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>
  <div class="sec-head" data-reveal="wipe">
    <h2 class="cond sec-title">Achievements</h2>
    <div class="sec-meta" data-reveal style="--i:1">
      <p class="hud-label">Milestones</p>
      <p class="sec-sub">Academics &amp; certifications</p>
    </div>
  </div>
  <ul class="achievements">
    <li class="hud achievement" data-reveal>
      <div class="achievement-media">
        <div class="carousel" data-carousel>
          <img class="is-current" src="./src/assets/images/grad-1-1080.webp" srcset="./src/assets/images/grad-1-480.webp 480w, ./src/assets/images/grad-1-1080.webp 1080w" sizes="(max-width: 900px) 92vw, 46vw" alt="[[BRONN: alt text, photo 1]]" decoding="async" />
          <img src="./src/assets/images/grad-2-1080.webp" srcset="./src/assets/images/grad-2-480.webp 480w, ./src/assets/images/grad-2-1080.webp 1080w" sizes="(max-width: 900px) 92vw, 46vw" alt="[[BRONN: alt text, photo 2]]" aria-hidden="true" loading="lazy" decoding="async" />
          <img src="./src/assets/images/grad-3-1080.webp" srcset="./src/assets/images/grad-3-480.webp 480w, ./src/assets/images/grad-3-1080.webp 1080w" sizes="(max-width: 900px) 92vw, 46vw" alt="[[BRONN: alt text, photo 3]]" aria-hidden="true" loading="lazy" decoding="async" />
          <div class="carousel-ui">
            <button type="button" class="carousel-btn" data-step="-1" aria-label="Previous photo"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg></button>
            <div class="carousel-dots"></div>
            <button type="button" class="carousel-btn" data-step="1" aria-label="Next photo"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>
          </div>
        </div>
        <span class="achievement-badge"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2l2.5 7M16 2l-2.5 7M12 22a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" /></svg>Cum Laude</span>
      </div>
      <div class="achievement-body">
        <p class="hud-label">Graduated with honors</p>
        <h3 class="cond">Cum Laude<span>BS Computer Science</span></h3>
        <p class="achievement-desc">Graduated Cum Laude in Computer Science from Cebu Institute of Technology–University, and passed the PhilNITS FE exam (Level 2).</p>
        <dl class="achievement-facts">
          <div><dt>School</dt><dd>CIT-U, Cebu</dd></div>
          <div><dt>Years</dt><dd>2021 – 2025</dd></div>
          <div><dt>Certification</dt><dd>PhilNITS FE</dd></div>
        </dl>
        <ul class="tags"><li>Computer Science</li><li>Honors</li><li>PhilNITS</li></ul>
        <div class="achievement-actions">
          <a class="cut-btn is-solid" href="https://www.linkedin.com/in/lebronnsamson/" target="_blank" rel="noopener noreferrer">See on LinkedIn <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a>
          <a class="text-link" href="#work">Experience</a>
        </div>
      </div>
    </li>
  </ul>
</section>
```

- [ ] **Step 2: Append Achievements styles to `src/css/home.css`, above the `/* ---------- Home breakpoints (keep last) ---------- */` comment**

```css
/* ---------- Achievements ---------- */
.paper .achievement { --accent: var(--teal); display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); align-items: center; gap: clamp(24px, 4vw, 56px); padding: clamp(14px, 1.6vw, 20px); }
.achievement-media { position: relative; }
.carousel { position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: #0b102614; clip-path: var(--cut-lg); }
.carousel > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; scale: 1.06; transition: opacity 0.9s, scale 0s linear 0.9s; }
/* current slide fades in and slowly settles from 1.06x (Ken Burns) */
.carousel > img.is-current { opacity: 1; scale: 1; transition: opacity 0.9s, scale 6s ease-out; }
.carousel-ui { position: absolute; left: 14px; right: 14px; bottom: 14px; z-index: 2; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.carousel-btn { display: grid; place-items: center; width: 38px; height: 38px; color: #fff; font-size: 18px; background: #0b102673; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); clip-path: var(--cut); opacity: 0; transition: opacity 0.3s, background-color 0.2s, color 0.2s; }
.carousel:hover .carousel-btn, .carousel-btn:focus-visible { opacity: 1; }
.carousel-btn:hover { background: var(--yellow); color: var(--ink); }
.carousel-dots { display: flex; gap: 6px; margin: 0 auto; padding: 8px 10px; border-radius: 999px; background: #0b102666; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.carousel-dots button { width: 8px; height: 8px; border-radius: 999px; background: #ffffff80; transition: width 0.4s var(--ease), background-color 0.3s; }
.carousel-dots button.is-current { width: 26px; background: var(--yellow); }
.achievement-badge { position: absolute; top: -10px; right: 18px; z-index: 3; display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px 9px 12px; background: var(--yellow); color: var(--ink); clip-path: var(--cut); font: 800 18px/1 var(--display); font-variation-settings: "wdth" 75, "opsz" 96; text-transform: uppercase; box-shadow: 0 10px 24px -10px #0b102680; }
.achievement-badge .icon { width: 18px; height: 18px; }
.achievement-body { padding: clamp(8px, 1.5vw, 20px) clamp(8px, 1.5vw, 20px) clamp(8px, 1.5vw, 20px) 0; }
.achievement-body h3 { margin: 12px 0 18px; font-size: clamp(56px, 7vw, 96px); }
.achievement-body h3 span { display: block; margin-top: 8px; color: var(--teal); font-size: 0.42em; }
.achievement-desc { max-width: 34em; color: var(--ink-soft); line-height: 1.6; }
.achievement-facts { display: grid; grid-template-columns: repeat(3, auto); justify-content: start; gap: 12px 28px; margin: 22px 0 18px; padding: 16px 0; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
.achievement-facts dt { color: var(--ink-soft); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
.achievement-facts dd { margin-top: 4px; font-size: 15px; font-weight: 500; }
.achievement-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 22px; margin-top: 26px; }
.text-link { padding-bottom: 2px; border-bottom: 1px solid var(--rule); color: var(--ink-soft); font-size: 13px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; transition: color 0.2s, border-color 0.2s; }
.text-link:hover { color: var(--accent, var(--teal)); border-color: var(--accent, var(--teal)); }
```

Add inside the existing breakpoint blocks at the end of the file. The `900px` block is new: insert it between the 1024px and 768px blocks.

```css
@media (width <= 900px) {
  .paper .achievement { grid-template-columns: 1fr; }
  .achievement-body { padding: 8px; }
}
/* inside @media (width <= 560px): */
  .achievement-facts { grid-template-columns: 1fr 1fr; }
  .carousel-btn { opacity: 1; }
```

- [ ] **Step 3: Add `initCarousels` to `src/js/main.js`**

Extend the import with `wrapIndex`, then add:

```js
/** Crossfading photo carousel: 4.5 s autoplay, paused on hover/focus, off for reduced motion. */
function initCarousels() {
  document.querySelectorAll('[data-carousel]').forEach((root) => {
    const slides = [...root.querySelectorAll(':scope > img')];
    if (slides.length <= 1) { root.querySelector('.carousel-ui')?.remove(); return; }
    const dotsWrap = root.querySelector('.carousel-dots');
    let index = 0;
    let paused = false;
    let timer = 0;

    const schedule = () => {
      clearTimeout(timer);
      if (!paused && !reducedMotion()) timer = setTimeout(() => go(wrapIndex(index, 1, slides.length)), 4500);
    };
    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Photo ${i + 1} of ${slides.length}`);
      dot.addEventListener('click', () => go(i));
      dotsWrap.append(dot);
      return dot;
    });
    function go(i) {
      index = i;
      slides.forEach((s, n) => { s.classList.toggle('is-current', n === i); s.setAttribute('aria-hidden', String(n !== i)); });
      dots.forEach((d, n) => { d.classList.toggle('is-current', n === i); d.setAttribute('aria-current', String(n === i)); });
      schedule();
    }

    root.querySelectorAll('[data-step]').forEach((btn) => btn.addEventListener('click', () => go(wrapIndex(index, Number(btn.dataset.step), slides.length))));
    const pause = (value) => () => { paused = value; schedule(); };
    root.addEventListener('mouseenter', pause(true));
    root.addEventListener('mouseleave', pause(false));
    root.addEventListener('focusin', pause(true));
    root.addEventListener('focusout', pause(false));
    go(0);
  });
}
```

Add `initCarousels();` to the boot section.

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: `# pass 5`.

- [ ] **Step 5: Verify in the browser**

- The card shows brackets, with the photo on the left (chamfered 18px corners) and a yellow "CUM LAUDE" badge overlapping the top-right edge of the photo. The body has the condensed "CUM LAUDE" headline with a teal "BS COMPUTER SCIENCE" sub-line, a ruled facts row and tags.
- Every 4.5s the photo crossfades (0.9s) and the incoming one slowly settles from 1.06× over 6s. The active dot stretches to a 26px yellow pill.
- Hover the photo: the arrows fade in, autoplay pauses, and the arrows wrap (last → first).
- Reduced motion: no autoplay; the arrows still work.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: achievements card with crossfading carousel"
```

---

### Task 8: Skills grid with logos

**Files:**
- Create: `src/assets/logos/*.svg` (downloaded) and `src/assets/logos/spark.svg` (original fallback)
- Modify: `index.html` (replace `<!-- SKILLS -->`), `src/css/home.css`

**Interfaces:**
- Consumes: scan reveal (Task 2/6).
- Produces: `.skills-grid .skill .skill-desc .logos`.

- [ ] **Step 1: Download the logos** (curl `-f` fails loudly on any 404; all 23 URLs were verified as HTTP 200 on 2026-10-27)

```bash
mkdir -p src/assets/logos && cd src/assets/logos
for p in python/python-original typescript/typescript-original javascript/javascript-original react/react-original django/django-plain fastapi/fastapi-original kotlin/kotlin-original jetpackcompose/jetpackcompose-original postgresql/postgresql-original firebase/firebase-original docker/docker-original azure/azure-original git/git-original github/github-original postman/postman-original vscode/vscode-original; do
  curl -fsSL "https://cdn.jsdelivr.net/npm/devicon@2.18.0/icons/$p.svg" -o "$(basename $p).svg"
done
for s in claude googlegemini n8n linuxcontainers; do
  curl -fsSL "https://cdn.jsdelivr.net/npm/simple-icons@16.36.0/icons/$s.svg" -o "$s.svg"
done
ls | wc -l   # expect 20
cd -
```

(`openai`, `powerautomate` and `lxc` don't exist in Simple Icons 16.36.0, so they use `spark.svg`.)

- [ ] **Step 2: Create the fallback glyph `src/assets/logos/spark.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0a7a8c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8L12 3Z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8L19 15Z"/></svg>
```

- [ ] **Step 3: Replace `<!-- SKILLS -->`**

```html
<section id="skills" class="section" data-reveal-style="scan">
  <svg class="contours" data-contours viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>
  <div class="sec-head" data-reveal="wipe">
    <h2 class="cond sec-title">Skills</h2>
    <div class="sec-meta" data-reveal style="--i:1">
      <p class="hud-label">What I work with</p>
      <p class="sec-sub">3 areas</p>
    </div>
  </div>
  <div class="skills-grid">
    <article class="hud skill" data-reveal style="--i:0">
      <p class="hud-label">AI</p>
      <h3 class="cond">AI engineering</h3>
      <p class="skill-desc">Agents, retrieval and the plumbing that keeps them honest: prompt and context engineering, token optimization, orchestration, evals and logs.</p>
      <ul class="logos">
        <li><img src="./src/assets/logos/claude.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>Claude SDK</span></li>
        <li><img src="./src/assets/logos/spark.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>OpenAI SDK</span></li>
        <li><img src="./src/assets/logos/googlegemini.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>Gemini</span></li>
        <li><img src="./src/assets/logos/spark.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>Agentic RAG</span></li>
        <li><img src="./src/assets/logos/spark.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>Vectors &amp; embeddings</span></li>
        <li><img src="./src/assets/logos/spark.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>LLMOps &amp; evals</span></li>
        <li><img src="./src/assets/logos/n8n.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>n8n</span></li>
        <li><img src="./src/assets/logos/spark.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>Power Automate</span></li>
      </ul>
    </article>
    <article class="hud skill" data-reveal style="--i:1">
      <p class="hud-label">Build</p>
      <h3 class="cond">Full-stack development</h3>
      <p class="skill-desc">Web and mobile apps end to end, from the interface to the API and the database behind it.</p>
      <ul class="logos">
        <li><img src="./src/assets/logos/python-original.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>Python</span></li>
        <li><img src="./src/assets/logos/typescript-original.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>TypeScript</span></li>
        <li><img src="./src/assets/logos/javascript-original.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>JavaScript</span></li>
        <li><img src="./src/assets/logos/react-original.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>React</span></li>
        <li><img src="./src/assets/logos/django-plain.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>Django</span></li>
        <li><img src="./src/assets/logos/fastapi-original.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>FastAPI</span></li>
        <li><img src="./src/assets/logos/kotlin-original.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>Kotlin</span></li>
        <li><img src="./src/assets/logos/jetpackcompose-original.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>Jetpack Compose</span></li>
        <li><img src="./src/assets/logos/postgresql-original.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>PostgreSQL</span></li>
        <li><img src="./src/assets/logos/firebase-original.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>Firebase</span></li>
      </ul>
    </article>
    <article class="hud skill" data-reveal style="--i:2">
      <p class="hud-label">Tools</p>
      <h3 class="cond">Cloud &amp; tools</h3>
      <p class="skill-desc">The environments and tooling behind shipped work: containers, cloud, version control and API testing.</p>
      <ul class="logos">
        <li><img src="./src/assets/logos/docker-original.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>Docker</span></li>
        <li><img src="./src/assets/logos/linuxcontainers.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>LXC</span></li>
        <li><img src="./src/assets/logos/azure-original.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>Azure</span></li>
        <li><img src="./src/assets/logos/git-original.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>Git</span></li>
        <li><img src="./src/assets/logos/github-original.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>GitHub</span></li>
        <li><img src="./src/assets/logos/postman-original.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>Postman</span></li>
        <li><img src="./src/assets/logos/vscode-original.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>VS Code</span></li>
        <li><img src="./src/assets/logos/claude.svg" alt="" width="20" height="20" loading="lazy" decoding="async" /><span>Claude Code</span></li>
      </ul>
    </article>
  </div>
</section>
```

- [ ] **Step 4: Append Skills styles to `src/css/home.css`** (above the breakpoints group, with breakpoint rules inside the existing blocks)

```css
/* ---------- Skills ---------- */
.skills-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.skill h3 { margin: 10px 0; font-size: 36px; }
.skill-desc { margin-bottom: 16px; color: var(--ink-soft); font-size: 15px; }
.logos { display: flex; flex-wrap: wrap; gap: 8px; }
.logos li { display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px 7px 9px; border: 1px solid var(--rule); background: color-mix(in srgb, var(--paper) 60%, #fff 40%); font-size: 13px; font-weight: 500; line-height: 1; transition: translate 0.3s var(--ease), border-color 0.3s, box-shadow 0.3s; }
.logos img { width: 20px; height: 20px; object-fit: contain; transition: scale 0.3s var(--ease); }
.logos li:hover { translate: 0 -2px; border-color: var(--teal); box-shadow: 0 10px 20px -14px #0b102680; }
.logos li:hover img { scale: 1.15; }
```

```css
/* inside @media (width <= 1024px): */
  .skills-grid { grid-template-columns: 1fr 1fr; }
  .skills-grid > :last-child { grid-column: 1 / -1; }
/* inside @media (width <= 768px): add .skills-grid to the 1-column list */
  .skills-grid { grid-template-columns: 1fr; }
/* inside @media (width <= 560px): */
  .skill h3 { font-size: 30px; }
```

- [ ] **Step 5: Verify in the browser**

- Three bracketed cards are revealed by the teal scan line in turn (90ms stagger).
- Each chip lifts 2px on hover, gets a teal border and a soft shadow, and its logo scales to 1.15.
- At 1024px the grid is 2+1 (the last card spans full width). At 768px it is one column.
- DevTools Network: no 404s for `/src/assets/logos/`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: skills grid with logo chips"
```

---

### Task 9: Projects grid with burn sweep

**Files:**
- Modify: `index.html` (replace `<!-- PROJECTS -->`), `src/css/home.css`

**Interfaces:**
- Consumes: `.burn`, `.cut-btn`, reveal `.project[data-reveal] img` scale rules (Task 2).
- Produces: `.projects-grid .project .project-media .project-row .project-desc .project-actions .project-btn`; links to `./project/<slug>/` (pages created in Task 12).

- [ ] **Step 1: Replace `<!-- PROJECTS -->`**

```html
<section id="projects" class="section">
  <svg class="contours" data-contours viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>
  <div class="sec-head" data-reveal="wipe">
    <h2 class="cond sec-title">Projects</h2>
  </div>
  <ul class="projects-grid">
    <li class="project" data-reveal style="--i:0">
      <div class="project-media burn"><img src="./src/assets/images/thrombolaize-1200.webp" srcset="./src/assets/images/thrombolaize-640.webp 640w, ./src/assets/images/thrombolaize-1200.webp 1200w" sizes="(max-width: 900px) 92vw, 46vw" width="1200" height="630" alt="Thrombolaize mobile app" loading="lazy" decoding="async" /></div>
      <div class="project-row"><p class="hud-label">Mobile app · [[BRONN: year]]</p><h3 class="cond">Thrombolaize</h3></div>
      <p class="project-desc">A mobile app powered by an AI image classifier and segmentation model that identifies cerebral ischemic strokes, built to help save lives.</p>
      <div class="project-actions">
        <a class="cut-btn project-btn" href="./project/thrombolaize/">Details <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a>
        <a class="cut-btn" href="https://github.com/lbronn/Thrombolaize-Mobile-App" target="_blank" rel="noopener noreferrer">Code <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a>
      </div>
    </li>
    <li class="project" data-reveal style="--i:1">
      <div class="project-media burn"><img src="./src/assets/images/boardprep-1200.webp" srcset="./src/assets/images/boardprep-640.webp 640w, ./src/assets/images/boardprep-1200.webp 1200w" sizes="(max-width: 900px) 92vw, 46vw" width="1200" height="630" alt="BoardPrep web app" loading="lazy" decoding="async" /></div>
      <div class="project-row"><p class="hud-label">Web app · [[BRONN: year]]</p><h3 class="cond">BoardPrep</h3></div>
      <p class="project-desc">A full-stack web app that helps engineering students prepare with personalized learning content and assessments, powered by AI.</p>
      <div class="project-actions">
        <a class="cut-btn project-btn" href="./project/boardprep/">Details <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a>
        <a class="cut-btn" href="https://github.com/lbronn/BoardPrep-Final-Backend" target="_blank" rel="noopener noreferrer">Code <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a>
      </div>
    </li>
    <li class="project" data-reveal style="--i:0">
      <div class="project-media burn"><img src="./src/assets/images/work-to-home-1200.webp" srcset="./src/assets/images/work-to-home-640.webp 640w, ./src/assets/images/work-to-home-1200.webp 1200w" sizes="(max-width: 900px) 92vw, 46vw" width="1200" height="630" alt="Work-to-Home Forecast Discord notification" loading="lazy" decoding="async" /></div>
      <div class="project-row"><p class="hud-label">Automation · [[BRONN: year]]</p><h3 class="cond">Work-to-Home Forecast</h3></div>
      <p class="project-desc">An n8n automation that pulls Google Routes, Weather and Static Maps data and posts the commute forecast to Discord.</p>
      <div class="project-actions">
        <a class="cut-btn project-btn" href="./project/work-to-home/">Details <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a>
      </div>
    </li>
  </ul>
</section>
```

- [ ] **Step 2: Append Projects styles to `src/css/home.css`** (above the breakpoints group, with breakpoint rules inside the existing blocks)

```css
/* ---------- Projects ---------- */
.projects-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 48px 28px; }
.project-media { aspect-ratio: 1200 / 630; background: #0b10260f; clip-path: var(--cut-lg); }
.project-media img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s var(--ease); }
.project:hover .project-media img { transform: scale(1.04); }
.project-row { margin-top: 16px; }
.project h3 { margin-top: 6px; font-size: clamp(30px, 3vw, 40px); }
.project-desc { max-width: 36em; margin-top: 8px; color: var(--ink-soft); font-size: 15px; }
.project-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.project-btn { color: #fff; background-color: #0a7a8c; border-color: #0a7a8c; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.project-btn:hover, .project-btn:focus-visible { color: #fff; background-color: #0d96ab; border-color: #0d96ab; transform: translateY(-3px); box-shadow: 0 6px 16px #0a7a8c66; }
.project-btn:active { transform: translateY(0); box-shadow: 0 2px 4px #0a7a8c66; }
```

```css
/* inside @media (width <= 768px): */
  .projects-grid { grid-template-columns: 1fr; }
/* inside @media (width <= 560px): */
  .projects-grid { gap: 36px 0; }
  .project h3 { font-size: 28px; }
```

- [ ] **Step 3: Verify in the browser**

- A 2-column grid of chamfered (18px) covers. On reveal each cover fades up and its image settles from 1.12× over 1.4s, with the right column 90ms behind.
- Hover a project: a yellow skewed light bar sweeps left to right across the cover (0.9s), the image zooms to 1.04, and the teal "Details" button lifts 3px.
- 768px: one column.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: projects grid with burn sweep and cover settle"
```

---

### Task 10: Work section with role cards and browser mock

**Files:**
- Modify: `index.html` (replace `<!-- WORK -->`; Task 11 adds the Off-the-clock block inside this section), `src/css/home.css`

**Interfaces:**
- Consumes: `.hud` (paper variant), `.tags`, scan reveal.
- Produces: `.sub-head .sub-sub .roles .role .role-card(.is-reverse) .role-screen .browser .browser-bar .dot .browser-url .mock* .role-status .role-domain .role-body .role-tagline .role-desc .role-features .role-foot .role-stack .role-period`; an anchor comment `<!-- OFFCLOCK -->` inside `#work`.

- [ ] **Step 1: Replace `<!-- WORK -->`**

```html
<section id="work" class="section" data-reveal-style="scan">
  <svg class="contours" data-contours viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>
  <div class="sec-head" data-reveal="wipe">
    <h2 class="cond sec-title">Work</h2>
    <div class="sec-meta" data-reveal style="--i:1">
      <p class="hud-label">Where I've built</p>
      <p class="sec-sub">2 companies</p>
    </div>
  </div>

  <div class="sub-head" data-reveal>
    <p class="hud-label">Industry</p>
    <h3 class="cond">Experience</h3>
    <p class="sub-sub">Roles and what I shipped</p>
  </div>
  <ul class="roles">
    <li class="role" data-reveal style="--i:0; --accent:#0a7a8c">
      <article class="hud role-card">
        <div class="role-screen">
          <div class="browser">
            <div class="browser-bar" aria-hidden="true"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="browser-url">[[BRONN: Smartsourcing domain]]</span></div>
            <div class="mock" aria-hidden="true">
              <div class="mock-side"><span class="mock-logo">S</span><i></i><i></i><i></i><i></i></div>
              <div class="mock-main">
                <div class="mock-row"><span class="mock-pill"></span><span class="mock-pill wide"></span></div>
                <div class="mock-cards"><span></span><span></span><span></span></div>
                <div class="mock-chart"><i style="height:40%"></i><i style="height:62%"></i><i style="height:48%"></i><i style="height:80%"></i><i style="height:56%"></i><i style="height:92%"></i><i style="height:70%"></i></div>
              </div>
            </div>
          </div>
          <span class="role-status">Current</span>
          <span class="role-domain">Cebu City</span>
        </div>
        <div class="role-body">
          <p class="hud-label">Full-time · AI engineering</p>
          <h3 class="cond">Smartsourcing</h3>
          <p class="role-tagline">AI Engineer</p>
          <p class="role-desc">Building AI-powered automation and solutions with AI agents, RAG pipelines and LLMOps workflows.</p>
          <ul class="role-features">
            <li><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4 10-10" /></svg>AI Engineer, Feb 2026 – present</li>
            <li><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4 10-10" /></svg>Software Solutions Engineer, Oct 2025 – Feb 2026</li>
            <li><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4 10-10" /></svg>Software solutions and automation across the business</li>
          </ul>
          <div class="role-foot">
            <ul class="tags role-stack"><li>AI agents</li><li>RAG</li><li>LLMOps</li></ul>
            <p class="role-period">Oct 2025 – present</p>
          </div>
        </div>
      </article>
    </li>
    <li class="role" data-reveal style="--i:1; --accent:#2f5bea">
      <article class="hud role-card is-reverse">
        <div class="role-screen">
          <div class="browser">
            <div class="browser-bar" aria-hidden="true"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="browser-url">[[BRONN: ChartNexus domain]]</span></div>
            <div class="mock" aria-hidden="true">
              <div class="mock-side"><span class="mock-logo">C</span><i></i><i></i><i></i><i></i></div>
              <div class="mock-main">
                <div class="mock-row"><span class="mock-pill"></span><span class="mock-pill wide"></span></div>
                <div class="mock-cards"><span></span><span></span><span></span></div>
                <div class="mock-chart"><i style="height:70%"></i><i style="height:52%"></i><i style="height:84%"></i><i style="height:60%"></i><i style="height:76%"></i><i style="height:44%"></i><i style="height:88%"></i></div>
              </div>
            </div>
          </div>
          <span class="role-status">Past</span>
          <span class="role-domain">Fintech</span>
        </div>
        <div class="role-body">
          <p class="hud-label">Full-time · Fintech</p>
          <h3 class="cond">ChartNexus</h3>
          <p class="role-tagline">Software Systems Developer</p>
          <p class="role-desc">Developed financial charting systems and backend services.</p>
          <ul class="role-features">
            <li><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4 10-10" /></svg>Financial charting systems</li>
            <li><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4 10-10" /></svg>Backend services</li>
          </ul>
          <div class="role-foot">
            <ul class="tags role-stack"><li>Charting</li><li>Backend</li></ul>
            <p class="role-period">Jun 2025 – Oct 2025</p>
          </div>
        </div>
      </article>
    </li>
  </ul>
  <!-- OFFCLOCK -->
</section>
```

- [ ] **Step 2: Append Work styles to `src/css/home.css`** (above the breakpoints group, with breakpoint rules inside the existing blocks)

```css
/* ---------- Work: sub-heads + role cards ---------- */
.sub-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 14px; margin: 40px 0 16px; padding-bottom: 12px; border-bottom: 1px solid var(--rule); }
.sub-head h3 { font-size: clamp(26px, 3vw, 34px); }
.sub-head .hud-label { order: -1; width: 100%; }
.sub-sub { color: var(--ink-soft); font-size: 13px; }
.roles { display: grid; gap: 24px; margin-top: 20px; }
.role { display: flex; }
.paper .role-card { --c: var(--accent); --fill: color-mix(in srgb, var(--paper) 90%, transparent); display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr); width: 100%; padding: 0; overflow: hidden; transition: translate 0.4s var(--ease), background-size 0.35s var(--ease); }
.role:hover .role-card { --b: 22px; translate: 0 -4px; }
.role-screen { position: relative; display: grid; place-items: center; padding: 56px clamp(24px, 4vw, 56px); }
.role-card.is-reverse .role-screen { order: 2; }
.role-status { position: absolute; top: 18px; left: 18px; z-index: 2; padding: 5px 12px; border-radius: 999px; background: var(--ink); color: var(--paper); font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
.role-domain { position: absolute; right: 18px; bottom: 16px; color: var(--ink-soft); font-size: 12px; letter-spacing: 0.06em; }
.browser { width: 100%; overflow: hidden; border: 1px solid var(--rule); border-bottom: 0; border-radius: 10px 10px 0 0; background: var(--paper); box-shadow: inset 0 -1px #fff9, 0 18px 40px -26px #0b102699; }
.browser-bar { display: flex; align-items: center; gap: 6px; padding: 9px 12px; border-bottom: 1px solid var(--rule); background: color-mix(in srgb, var(--ink) 6%, transparent); }
.browser-bar .dot { width: 8px; height: 8px; border-radius: 50%; background: color-mix(in srgb, var(--ink) 22%, transparent); }
.browser-url { margin-left: 10px; padding: 3px 12px; border-radius: 999px; background: color-mix(in srgb, var(--paper) 80%, transparent); color: var(--ink-soft); font-size: 11px; letter-spacing: 0.04em; }
.mock { display: grid; grid-template-columns: 54px 1fr; gap: 10px; aspect-ratio: 1200 / 630; padding: 12px; background: color-mix(in srgb, var(--ink) 4%, transparent); }
.mock-side { display: grid; align-content: start; gap: 7px; padding: 8px 6px; border-radius: 8px; background: color-mix(in srgb, var(--accent) 12%, transparent); }
.mock-logo { display: grid; place-items: center; width: 22px; height: 22px; margin-bottom: 4px; border-radius: 6px; background: var(--accent); color: #fff; font: 800 12px/1 var(--display); font-variation-settings: "wdth" 75; }
.mock-side i { height: 6px; border-radius: 3px; background: color-mix(in srgb, var(--accent) 34%, transparent); }
.mock-side i:nth-child(3) { width: 70%; }
.mock-side i:nth-child(5) { width: 55%; }
.mock-main { display: grid; align-content: start; gap: 10px; }
.mock-row { display: flex; gap: 8px; }
.mock-pill { width: 64px; height: 12px; border-radius: 999px; background: color-mix(in srgb, var(--ink) 14%, transparent); }
.mock-pill.wide { width: 40%; background: color-mix(in srgb, var(--accent) 30%, transparent); }
.mock-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.mock-cards span { height: 34px; border-radius: 8px; border-top: 3px solid color-mix(in srgb, var(--accent) 45%, transparent); background: color-mix(in srgb, var(--ink) 9%, transparent); }
.mock-chart { display: flex; align-items: end; gap: 6px; height: 64px; padding-top: 4px; }
.mock-chart i { flex: 1; border-radius: 3px 3px 0 0; background: color-mix(in srgb, var(--accent) 55%, transparent); }
.role-body { display: flex; flex-direction: column; justify-content: center; padding: clamp(28px, 3.5vw, 48px); }
.role-body h3 { margin: 10px 0 6px; font-size: clamp(40px, 5vw, 64px); }
.role-tagline { color: var(--accent); font-size: 17px; font-weight: 500; }
.role-desc { margin-top: 10px; color: var(--ink-soft); font-size: 15px; }
.role-features { display: grid; gap: 8px; margin-top: 16px; font-size: 14px; }
.role-features li { display: flex; align-items: start; gap: 10px; }
.role-features .icon { width: 16px; height: 16px; margin-top: 3px; color: var(--accent); }
.role-foot { display: grid; gap: 16px; margin-top: auto; padding-top: 20px; }
.role-stack li { border-color: color-mix(in srgb, var(--accent) 40%, transparent); }
.role-period { padding-top: 16px; border-top: 1px solid var(--rule); color: var(--ink-soft); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
```

```css
/* inside @media (width <= 900px): */
  .paper .role-card { grid-template-columns: 1fr; }
  .role-card.is-reverse .role-screen { order: 0; }
  .role-screen { padding: 48px 24px 40px; }
```

- [ ] **Step 3: Verify in the browser**

- Two wide cards alternate sides (the second is reversed). Each has teal or blue corner brackets, a CSS-only browser mock tinted in its accent, a navy "CURRENT"/"PAST" pill top-left, accent-coloured checkmarks and a ruled period line.
- Hover a card: it lifts 4px and its brackets grow to 22px.
- 900px: the cards stack, with the screen on top for both.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: work section with role cards and browser mocks"
```

---

### Task 11: Off-the-clock card, coverflow gallery and lightbox

**Files:**
- Modify: `index.html` (replace `<!-- OFFCLOCK -->` and `<!-- LIGHTBOX -->`), `src/css/home.css`, `src/js/main.js`

**Interfaces:**
- Consumes: `clampIndex()` (Task 1), `.burn`, `.cut-btn`, `.tags`.
- Produces: `initLightbox()`; markup contract: any `[data-lightbox-src]` button opens `dialog.lightbox`, with `data-lightbox-alt` used as the image alt.

- [ ] **Step 1: Replace `<!-- OFFCLOCK -->`**

```html
<div class="sub-head" data-reveal>
  <p class="hud-label">Off the clock</p>
  <h3 class="cond">Beyond the code</h3>
  <p class="sub-sub">Basketball, games, coffee and TV</p>
</div>
<div class="hud offclock" data-reveal>
  <div class="offclock-head">
    <img class="offclock-avatar" src="./src/assets/images/avatar-160.webp" width="80" height="80" alt="" loading="lazy" />
    <div>
      <p class="hud-label">Personal</p>
      <h3 class="cond">Off the clock</h3>
      <p class="offclock-desc">When I'm not debugging or designing systems, I'm on the basketball court, deep in a video game or a TV series, or hopping between coffee shops around the city.</p>
      <ul class="tags"><li>Basketball</li><li>Video games</li><li>Coffee hopping</li><li>TV series</li></ul>
    </div>
    <ul class="offclock-links">
      <li><a class="cut-btn" href="https://www.instagram.com/lbroooooonn/" target="_blank" rel="noopener noreferrer">Instagram <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a></li>
    </ul>
  </div>
  <ul class="gallery" aria-label="Off-the-clock photos">
    <li class="gallery-item"><button type="button" class="burn" data-lightbox-src="./src/assets/images/offclock-1-1080.webp" data-lightbox-alt="[[BRONN: alt text, photo 1]]" aria-label="Open photo 1 of 4"><img src="./src/assets/images/offclock-1-480.webp" srcset="./src/assets/images/offclock-1-480.webp 480w, ./src/assets/images/offclock-1-1080.webp 1080w" sizes="320px" width="1080" height="1350" alt="" loading="lazy" decoding="async" /></button></li>
    <li class="gallery-item"><button type="button" class="burn" data-lightbox-src="./src/assets/images/offclock-2-1080.webp" data-lightbox-alt="[[BRONN: alt text, photo 2]]" aria-label="Open photo 2 of 4"><img src="./src/assets/images/offclock-2-480.webp" srcset="./src/assets/images/offclock-2-480.webp 480w, ./src/assets/images/offclock-2-1080.webp 1080w" sizes="320px" width="1080" height="1350" alt="" loading="lazy" decoding="async" /></button></li>
    <li class="gallery-item"><button type="button" class="burn" data-lightbox-src="./src/assets/images/offclock-3-1080.webp" data-lightbox-alt="[[BRONN: alt text, photo 3]]" aria-label="Open photo 3 of 4"><img src="./src/assets/images/offclock-3-480.webp" srcset="./src/assets/images/offclock-3-480.webp 480w, ./src/assets/images/offclock-3-1080.webp 1080w" sizes="320px" width="1080" height="1350" alt="" loading="lazy" decoding="async" /></button></li>
    <li class="gallery-item"><button type="button" class="burn" data-lightbox-src="./src/assets/images/offclock-4-1080.webp" data-lightbox-alt="[[BRONN: alt text, photo 4]]" aria-label="Open photo 4 of 4"><img src="./src/assets/images/offclock-4-480.webp" srcset="./src/assets/images/offclock-4-480.webp 480w, ./src/assets/images/offclock-4-1080.webp 1080w" sizes="320px" width="1080" height="1350" alt="" loading="lazy" decoding="async" /></button></li>
  </ul>
</div>
```

- [ ] **Step 2: Replace `<!-- LIGHTBOX -->`** (native `<dialog>` gives focus trapping, Esc and focus return for free)

```html
<dialog class="lightbox" aria-label="Photo viewer">
  <button type="button" class="lb-btn lb-close" aria-label="Close"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
  <button type="button" class="lb-btn lb-prev" aria-label="Previous photo"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg></button>
  <button type="button" class="lb-btn lb-next" aria-label="Next photo"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>
  <img alt="" />
</dialog>
```

- [ ] **Step 3: Append the styles to `src/css/home.css`** (above the breakpoints group, with breakpoint rules inside the existing blocks)

```css
/* ---------- Off the clock + coverflow gallery ---------- */
.paper .offclock { padding: clamp(22px, 3vw, 34px) 0; }
.offclock-head { display: grid; grid-template-columns: auto 1fr auto; align-items: start; gap: 24px; padding: 0 clamp(20px, 3vw, 34px); }
.offclock-avatar { width: 80px; height: 80px; border: 1px solid var(--rule); border-radius: 50%; }
.offclock-head h3 { margin: 6px 0 8px; font-size: 48px; }
.offclock-desc { margin-bottom: 14px; color: var(--ink-soft); }
.offclock-links { display: flex; gap: 8px; }
.gallery { display: flex; gap: 20px; margin-top: 28px; padding: 16px clamp(20px, 3vw, 34px); overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; perspective: 1200px; }
.gallery::-webkit-scrollbar { display: none; }
.gallery-item { flex: 0 0 clamp(220px, 26vw, 320px); scroll-snap-align: center; }
.gallery-item button { display: block; width: 100%; aspect-ratio: 4 / 5; background: #0b10260f; clip-path: var(--cut-md); }
.gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s var(--ease); }
.gallery-item button:hover img { transform: scale(1.04); }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    /* cards rotate in 3D as they cross the horizontal scrollport */
    .gallery-item { animation: coverflow linear both; animation-timeline: view(inline); }
    @keyframes coverflow {
      0% { opacity: 0.6; transform: rotateY(38deg) scale(0.88); }
      50% { opacity: 1; transform: rotateY(0) scale(1); }
      100% { opacity: 0.6; transform: rotateY(-38deg) scale(0.88); }
    }
  }
}

/* ---------- Lightbox (native <dialog>) ---------- */
.lightbox { width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: 64px 16px; border: 0; background: #0b1026eb; color: inherit; }
.lightbox[open] { display: grid; place-items: center; animation: fade 0.25s; }
.lightbox::backdrop { background: transparent; }
body:has(.lightbox[open]) { overflow: hidden; }
.lightbox img { width: auto; height: auto; max-width: min(92vw, 900px); max-height: 86svh; animation: pop 0.35s var(--ease); }
.lb-btn { position: absolute; display: grid; place-items: center; width: 48px; height: 48px; border: 1px solid #eef3f480; color: var(--paper); font-size: 22px; clip-path: var(--cut); transition: background-color 0.2s, color 0.2s; }
.lb-btn[hidden] { display: none; }
.lb-btn:hover { background: var(--yellow); color: var(--ink); border-color: var(--yellow); }
.lb-close { top: 16px; right: 16px; }
.lb-prev { top: 50%; left: 16px; translate: 0 -50%; }
.lb-next { top: 50%; right: 16px; translate: 0 -50%; }
```

```css
/* inside @media (width <= 1024px): */
  .offclock-head { grid-template-columns: auto 1fr; }
  .offclock-links { grid-column: 2; }
/* inside @media (width <= 768px): */
  .offclock-head { grid-template-columns: 1fr; }
  .offclock-links { grid-column: auto; }
/* inside @media (width <= 560px): */
  .offclock-head h3 { font-size: 36px; }
  .gallery { gap: 14px; }
  .gallery-item { flex-basis: 74vw; }
```

- [ ] **Step 4: Add `initLightbox` to `src/js/main.js`**

Extend the import with `clampIndex`, then add:

```js
/** Gallery lightbox on a native <dialog>: Esc, focus trap and focus return come from the platform. */
function initLightbox() {
  const dialog = document.querySelector('dialog.lightbox');
  const items = [...document.querySelectorAll('[data-lightbox-src]')];
  if (!dialog || !items.length) return;
  const img = dialog.querySelector('img');
  const prev = dialog.querySelector('.lb-prev');
  const next = dialog.querySelector('.lb-next');
  let index = 0;

  const show = (i) => {
    index = i;
    img.src = items[i].dataset.lightboxSrc;
    img.alt = items[i].dataset.lightboxAlt || '';
    img.style.animation = 'none';
    void img.offsetWidth; // restart the pop animation for each photo
    img.style.animation = '';
    prev.hidden = i === 0;
    next.hidden = i === items.length - 1;
  };
  const step = (delta) => show(clampIndex(index, delta, items.length));

  items.forEach((item, i) => item.addEventListener('click', () => { show(i); dialog.showModal(); }));
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  dialog.querySelector('.lb-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }); // click on the dark area
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
}
```

Add `initLightbox();` to the boot section.

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: `# pass 5`.

- [ ] **Step 6: Verify in the browser (including Review Focus 5)**

- The card has a round avatar, a condensed title, tags and a chamfered "Instagram ↗" on the right, with a horizontal snap-scrolling strip of 4:5 photos below. In Chrome, cards rotate ±38° and scale to 0.88 at the edges of the strip (coverflow). Hovering a photo runs the yellow burn sweep.
- Click a photo: navy overlay (fades in 0.25s), the photo pops from 0.94×, and Prev is hidden on the first photo while Next is hidden on the last.
- Keyboard only: Tab to photo 2 and press Enter. Focus is on "Close". ArrowRight goes to photo 3, then 4, then stays at 4 (no wrap). Esc closes, and focus is back on the photo 2 button. The page doesn't scroll while the dialog is open.
- Clicking the dark area closes it. Clicking the image does not.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: off-the-clock card, coverflow gallery, dialog lightbox"
```

---

### Task 12: Case-study pages

**Files:**
- Create: `src/css/case.css`, `project/thrombolaize/index.html`, `project/boardprep/index.html`, `project/work-to-home/index.html`

**Interfaces:**
- Consumes: `base.css` primitives, `main.js` (only `initReveal`/`initContours` act here; every other init returns early because its root element is missing).
- Produces: classes `.case .case-bar .case-wrap .case-back .case-brand .case-crumb .case-hero .case-in .case-eyebrow .case-title .case-lede .case-actions .case-media .case-frame .case-sec .case-sec-head .case-grid .case-card .case-card-icon .case-steps .case-step .case-step-num .case-pill .case-stack .case-end`.

- [ ] **Step 1: Write `src/css/case.css`**

```css
/* Case-study pages. Uses base.css tokens; --accent is set per page on .case */
.case { --accent: var(--teal); position: relative; isolation: isolate; min-height: 100svh; overflow-x: clip; }
.case .contours { position: fixed; }
.case-wrap { max-width: var(--max); margin: 0 auto; padding: 0 var(--gutter); }
.case-bar { position: sticky; top: 0; z-index: 50; border-bottom: 1px solid var(--rule); background: color-mix(in srgb, var(--paper) 82%, transparent); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.case-bar .case-wrap { display: flex; justify-content: space-between; align-items: center; gap: 16px; height: 64px; }
.case-back { display: inline-flex; align-items: center; gap: 10px; color: var(--ink-soft); font-size: 13px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; transition: color 0.2s; }
.case-back .icon { width: 16px; height: 16px; transition: translate 0.3s var(--ease); }
.case-back:hover { color: var(--ink); }
.case-back:hover .icon { translate: -3px; }
.case-brand { font-size: 20px; text-decoration: none; }
.case-crumb { color: var(--ink-soft); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }

.case-hero { display: grid; grid-template-columns: 1.05fr 1fr; align-items: center; gap: clamp(32px, 5vw, 80px); padding: clamp(48px, 7vw, 96px) 0 clamp(40px, 5vw, 64px); }
.case-in > * { animation: case-in 0.9s var(--ease) both; animation-delay: calc(var(--i, 0) * 80ms); }
.case-eyebrow { display: inline-flex; align-items: center; gap: 10px; color: var(--accent); }
.case-eyebrow::before { content: ""; width: 28px; height: 1px; background: currentColor; }
.case-title { margin: 18px 0 20px; font-size: clamp(64px, 9.5vw, 136px); }
.case-title em { color: var(--accent); font-style: normal; }
.case-lede { max-width: 32em; font-size: clamp(18px, 1.6vw, 21px); line-height: 1.55; }
.case-hero .tags { margin-top: 22px; }
.case-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
.case .cut-btn { --t: var(--accent); border-color: var(--t); color: var(--t); }
.case .cut-btn:hover { background: var(--t); color: var(--paper); }
.case .cut-btn.is-solid { background: var(--t); color: #fff; }
.case .cut-btn.is-solid:hover { background: none; color: var(--t); }

.case-media { position: relative; }
.case-frame { overflow: hidden; background: #fff; clip-path: var(--cut-lg); box-shadow: 0 30px 60px -30px #0b102673; }
.case-frame img { width: 100%; transition: scale 0.8s var(--ease); }
.case-media:hover .case-frame img { scale: 1.03; }
.case-media figcaption { margin-top: 12px; color: var(--ink-soft); font-size: 13px; }

.case-sec { padding-top: clamp(64px, 8vw, 112px); }
.case-sec-head { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); align-items: end; gap: 24px 48px; margin-bottom: clamp(28px, 3.5vw, 44px); padding-bottom: 18px; border-bottom: 1px solid var(--rule); }
.case-sec-head h2 { margin-top: 10px; font-size: clamp(44px, 6vw, 84px); }
.case-sec-head p:last-child { max-width: 34em; color: var(--ink-soft); }

.case-grid { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 14px; }
.case-card { padding: 24px 24px 26px; }
.case-card-icon { display: grid; place-items: center; width: 42px; height: 42px; margin-bottom: 18px; color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); clip-path: var(--cut); }
.case-card-icon .icon { width: 20px; height: 20px; }
.case-card h3 { font-size: 26px; }
.case-card p { margin-top: 8px; color: var(--ink-soft); font-size: 15px; line-height: 1.55; }

.case-steps { display: grid; }
.case-step { display: grid; grid-template-columns: 88px minmax(0, 1fr) auto; align-items: start; gap: 20px; padding: 26px 0; border-bottom: 1px solid var(--rule); transition: background-color 0.3s; }
.case-step-num { color: color-mix(in srgb, var(--ink) 18%, transparent); font-size: 56px; transition: color 0.3s; }
.case-step:hover .case-step-num { color: var(--accent); }
.case-step h3 { font-size: 30px; }
.case-step p { max-width: 40em; margin-top: 6px; color: var(--ink-soft); }
.case-pill { padding: 5px 12px; border: 1px solid var(--rule); border-radius: 999px; color: var(--ink-soft); font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }

.case-stack { display: flex; flex-wrap: wrap; gap: 8px; }
.case-stack li { padding: 8px 14px; border: 1px solid var(--rule); background: color-mix(in srgb, var(--paper) 80%, transparent); font-size: 14px; font-weight: 500; }

.case-end { margin-top: clamp(72px, 9vw, 128px); }
.case-end .case-wrap { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 32px; padding-top: clamp(56px, 7vw, 96px); padding-bottom: clamp(56px, 7vw, 96px); }
.case-end h2 { font-size: clamp(56px, 8vw, 112px); }
.case-end p { max-width: 30em; margin-top: 14px; color: var(--ink-soft); }
.case-end .cut-btn.is-solid { color: #0b1026; }

@media (width <= 960px) {
  .case-hero, .case-sec-head { grid-template-columns: 1fr; }
  .case-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (width <= 600px) {
  .case-crumb { display: none; }
  .case-grid { grid-template-columns: 1fr; }
  .case-step { grid-template-columns: 52px minmax(0, 1fr); gap: 4px 14px; }
  .case-step-num { font-size: 40px; }
  .case-step .case-pill { grid-column: 2; justify-self: start; margin-top: 10px; }
  .case-step h3 { font-size: 26px; }
}
```

- [ ] **Step 2: Create `project/thrombolaize/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#eef3f4" />
    <title>Thrombolaize | Le Bronn Samson</title>
    <meta name="description" content="Thrombolaize: a mobile app that uses AI classification and segmentation to identify cerebral ischemic strokes." />
    <link rel="icon" type="image/png" sizes="32x32" href="../../src/assets/images/favicon-32.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,500..800&family=Onest:wght@400;500&display=swap" />
    <link rel="stylesheet" href="../../src/css/base.css" />
    <link rel="stylesheet" href="../../src/css/case.css" />
    <script type="module" src="../../src/js/main.js"></script>
  </head>
  <body style="background:#eef3f4">
    <div class="case" style="--accent:#0a7a8c">
      <svg class="contours" data-contours viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>
      <header class="case-bar">
        <div class="case-wrap">
          <a href="../../" class="case-back"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>Portfolio</a>
          <a href="../../" class="cond case-brand">Le Bronn Samson</a>
          <span class="case-crumb">Project · Thrombolaize</span>
        </div>
      </header>
      <main class="case-wrap">
        <section class="case-hero">
          <div class="case-in">
            <p class="hud-label case-eyebrow" style="--i:0">Mobile · AI · [[BRONN: year]]</p>
            <h1 class="cond case-title" style="--i:1">Thrombolaize<br /><em>stroke AI</em></h1>
            <p class="case-lede" style="--i:2">A mobile app powered by an AI image classifier and segmentation model that identifies cerebral ischemic strokes, built to help save lives.</p>
            <ul class="tags" style="--i:3"><li>Kotlin</li><li>FastAPI</li><li>Firebase</li><li>Computer vision</li></ul>
            <div class="case-actions" style="--i:4"><a class="cut-btn is-solid" href="https://github.com/lbronn/Thrombolaize-Mobile-App" target="_blank" rel="noopener noreferrer">Code on GitHub <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a></div>
          </div>
          <div class="case-in">
            <figure class="case-media" style="--i:2">
              <div class="case-frame"><img src="../../src/assets/images/thrombolaize-1200.webp" width="1200" height="630" alt="Thrombolaize app screens" /></div>
              <figcaption>Thrombolaize app screens</figcaption>
            </figure>
          </div>
        </section>
        <!-- [[BRONN: confirm the card copy below; it is drafted from the one-line project description]] -->
        <section class="case-sec">
          <div class="case-sec-head">
            <div><p class="hud-label">What it does</p><h2 class="cond">Inside the app</h2></div>
            <p>Two models behind one mobile workflow.</p>
          </div>
          <div class="case-grid">
            <article class="hud case-card"><span class="case-card-icon"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-5a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /></svg></span><h3 class="cond">Classification</h3><p>An image classifier flags whether a scan shows signs of a cerebral ischemic stroke.</p></article>
            <article class="hud case-card"><span class="case-card-icon"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 8l10 5 10-5-10-5ZM2 13l10 5 10-5" /></svg></span><h3 class="cond">Segmentation</h3><p>A segmentation model outlines the affected region so the result can be checked visually.</p></article>
            <article class="hud case-card"><span class="case-card-icon"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10v20H7zM11 18h2" /></svg></span><h3 class="cond">Mobile first</h3><p>A Kotlin app on the phone, a FastAPI service and Firebase behind it.</p></article>
          </div>
        </section>
        <section class="case-sec">
          <div class="case-sec-head">
            <div><p class="hud-label">Built with</p><h2 class="cond">Stack</h2></div>
            <p>The tools behind the app.</p>
          </div>
          <ul class="case-stack"><li>Kotlin</li><li>FastAPI</li><li>Firebase</li><li>CNN models</li></ul>
        </section>
      </main>
      <section class="case-end tone tone-ink" style="--accent:#ffd43b">
        <div class="case-wrap">
          <div><h2 class="cond">Next project</h2><p>BoardPrep, an AI-assisted study platform for engineering students.</p></div>
          <div class="case-actions">
            <a class="cut-btn is-solid" href="../boardprep/">BoardPrep <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a>
            <a class="cut-btn" href="../../#contact">Get in touch</a>
          </div>
        </div>
      </section>
    </div>
  </body>
</html>
```

- [ ] **Step 3: Create `project/boardprep/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#eef3f4" />
    <title>BoardPrep | Le Bronn Samson</title>
    <meta name="description" content="BoardPrep: a full-stack, AI-assisted study platform for engineering students." />
    <link rel="icon" type="image/png" sizes="32x32" href="../../src/assets/images/favicon-32.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,500..800&family=Onest:wght@400;500&display=swap" />
    <link rel="stylesheet" href="../../src/css/base.css" />
    <link rel="stylesheet" href="../../src/css/case.css" />
    <script type="module" src="../../src/js/main.js"></script>
  </head>
  <body style="background:#eef3f4">
    <div class="case" style="--accent:#2f5bea">
      <svg class="contours" data-contours viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>
      <header class="case-bar">
        <div class="case-wrap">
          <a href="../../" class="case-back"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>Portfolio</a>
          <a href="../../" class="cond case-brand">Le Bronn Samson</a>
          <span class="case-crumb">Project · BoardPrep</span>
        </div>
      </header>
      <main class="case-wrap">
        <section class="case-hero">
          <div class="case-in">
            <p class="hud-label case-eyebrow" style="--i:0">Web app · AI · [[BRONN: year]]</p>
            <h1 class="cond case-title" style="--i:1">BoardPrep<br /><em>for engineers</em></h1>
            <p class="case-lede" style="--i:2">A full-stack web app that helps engineering students prepare with personalized learning content and assessments, with AI tailoring the experience to each learner.</p>
            <ul class="tags" style="--i:3"><li>React TS</li><li>Django</li><li>PostgreSQL</li><li>AI</li></ul>
            <div class="case-actions" style="--i:4"><a class="cut-btn is-solid" href="https://github.com/lbronn/BoardPrep-Final-Backend" target="_blank" rel="noopener noreferrer">Code on GitHub <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a></div>
          </div>
          <div class="case-in">
            <figure class="case-media" style="--i:2">
              <div class="case-frame"><img src="../../src/assets/images/boardprep-1200.webp" width="1200" height="630" alt="BoardPrep interface" /></div>
              <figcaption>BoardPrep interface</figcaption>
            </figure>
          </div>
        </section>
        <!-- [[BRONN: confirm the card copy below; it is drafted from the one-line project description]] -->
        <section class="case-sec">
          <div class="case-sec-head">
            <div><p class="hud-label">What it does</p><h2 class="cond">Study, tailored</h2></div>
            <p>Content and assessments that adapt to the student.</p>
          </div>
          <div class="case-grid">
            <article class="hud case-card"><span class="case-card-icon"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm0 14a2 2 0 0 1 2-2h13" /></svg></span><h3 class="cond">Personalized content</h3><p>Learning material organised around what each student needs to cover.</p></article>
            <article class="hud case-card"><span class="case-card-icon"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6v18h12V7l-4-4Zm0 0v4h4M9 13h6M9 17h4" /></svg></span><h3 class="cond">Assessments</h3><p>Practice assessments that show where a student stands before the board exam.</p></article>
            <article class="hud case-card"><span class="case-card-icon"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8L12 3Z" /></svg></span><h3 class="cond">AI-assisted</h3><p>AI shapes the experience around each learner instead of one fixed path.</p></article>
          </div>
        </section>
        <section class="case-sec">
          <div class="case-sec-head">
            <div><p class="hud-label">Built with</p><h2 class="cond">Stack</h2></div>
            <p>The tools behind the platform.</p>
          </div>
          <ul class="case-stack"><li>React</li><li>TypeScript</li><li>Django</li><li>PostgreSQL</li></ul>
        </section>
      </main>
      <section class="case-end tone tone-ink" style="--accent:#ffd43b">
        <div class="case-wrap">
          <div><h2 class="cond">Next project</h2><p>Work-to-Home Forecast, a commute briefing automated with n8n.</p></div>
          <div class="case-actions">
            <a class="cut-btn is-solid" href="../work-to-home/">Work-to-Home <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a>
            <a class="cut-btn" href="../../#contact">Get in touch</a>
          </div>
        </div>
      </section>
    </div>
  </body>
</html>
```

- [ ] **Step 4: Create `project/work-to-home/index.html`** (the steps come straight from the documented flow: Routes → Weather → Static Maps → Discord)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#eef3f4" />
    <title>Work-to-Home Forecast | Le Bronn Samson</title>
    <meta name="description" content="Work-to-Home Forecast: an n8n automation that posts traffic, weather and a map of the commute to Discord." />
    <link rel="icon" type="image/png" sizes="32x32" href="../../src/assets/images/favicon-32.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,500..800&family=Onest:wght@400;500&display=swap" />
    <link rel="stylesheet" href="../../src/css/base.css" />
    <link rel="stylesheet" href="../../src/css/case.css" />
    <script type="module" src="../../src/js/main.js"></script>
  </head>
  <body style="background:#eef3f4">
    <div class="case" style="--accent:#0a7a8c">
      <svg class="contours" data-contours viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>
      <header class="case-bar">
        <div class="case-wrap">
          <a href="../../" class="case-back"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>Portfolio</a>
          <a href="../../" class="cond case-brand">Le Bronn Samson</a>
          <span class="case-crumb">Project · Work-to-Home Forecast</span>
        </div>
      </header>
      <main class="case-wrap">
        <section class="case-hero">
          <div class="case-in">
            <p class="hud-label case-eyebrow" style="--i:0">Automation · n8n · [[BRONN: year]]</p>
            <h1 class="cond case-title" style="--i:1">Work-to-Home<br /><em>Forecast</em></h1>
            <p class="case-lede" style="--i:2">An n8n automation that pulls data from Google's Routes, Weather and Static Maps APIs and posts a commute briefing (traffic, weather and a map) to Discord.</p>
            <ul class="tags" style="--i:3"><li>n8n</li><li>Google APIs</li><li>Discord</li></ul>
          </div>
          <div class="case-in">
            <figure class="case-media" style="--i:2">
              <div class="case-frame"><img src="../../src/assets/images/work-to-home-1200.webp" width="1200" height="630" alt="Work-to-Home Forecast workflow" /></div>
              <figcaption>The workflow and its Discord briefing</figcaption>
            </figure>
          </div>
        </section>
        <section class="case-sec">
          <div class="case-sec-head">
            <div><p class="hud-label">How it works</p><h2 class="cond">The flow</h2></div>
            <p>Four steps from raw APIs to one Discord message.</p>
          </div>
          <ol class="case-steps">
            <li class="case-step"><span class="cond case-step-num">01</span><div><h3 class="cond">Check the route</h3><p>Google Routes returns the drive home with current traffic.</p></div><span class="case-pill">Routes API</span></li>
            <li class="case-step"><span class="cond case-step-num">02</span><div><h3 class="cond">Check the weather</h3><p>The Weather API adds conditions for the trip.</p></div><span class="case-pill">Weather API</span></li>
            <li class="case-step"><span class="cond case-step-num">03</span><div><h3 class="cond">Draw the map</h3><p>Static Maps renders the route as an image.</p></div><span class="case-pill">Static Maps</span></li>
            <li class="case-step"><span class="cond case-step-num">04</span><div><h3 class="cond">Notify</h3><p>Everything lands in one Discord message.</p></div><span class="case-pill">Discord</span></li>
          </ol>
        </section>
        <section class="case-sec">
          <div class="case-sec-head">
            <div><p class="hud-label">Built with</p><h2 class="cond">Stack</h2></div>
            <p>The services behind the automation.</p>
          </div>
          <ul class="case-stack"><li>n8n</li><li>Google Routes</li><li>Google Weather</li><li>Google Static Maps</li><li>Discord</li></ul>
        </section>
      </main>
      <section class="case-end tone tone-ink" style="--accent:#ffd43b">
        <div class="case-wrap">
          <div><h2 class="cond">Next project</h2><p>Thrombolaize, stroke detection with AI on mobile.</p></div>
          <div class="case-actions">
            <a class="cut-btn is-solid" href="../thrombolaize/">Thrombolaize <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a>
            <a class="cut-btn" href="../../#contact">Get in touch</a>
          </div>
        </div>
      </section>
    </div>
  </body>
</html>
```

- [ ] **Step 5: Verify in the browser**

- `http://localhost:5173/project/thrombolaize/`: a sticky frosted bar (back arrow nudges left on hover), then the hero eyebrow (with a 28px rule), title, lede, tags and button rising in with 80ms stagger. The framed image zooms to 1.03 on hover. HUD cards slide in from the right. The navy "Next project" band spans full width.
- Work-to-Home: step numbers are faint at 18% and turn teal on row hover.
- Click through every "Next project" link (it loops all three) and every "Portfolio" link (back to the home page).
- 600px: the crumb is hidden, cards are in one column, and the step pills drop under the text.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: case-study pages for all three projects"
```

---

### Task 13: Content gate, full QA pass and docs

**Files:**
- Modify: `README.md`, any file still containing `[[BRONN:`

**Interfaces:**
- Consumes: everything above.
- Produces: a mergeable branch.

- [ ] **Step 1: Run the content gate (must print nothing)**

Run: `grep -rn "\[\[BRONN" index.html project/`
Expected: no output. Every remaining hit is a content input from the "Asset & content inputs" section. Fill it in or remove the element.

- [ ] **Step 2: Check assets (must print nothing)**

Run (with `npm run dev` running in another terminal):

```bash
for f in $(grep -rhoE '\./src/assets/[^" ]+|\.\./\.\./src/assets/[^" ]+' index.html project | sed -E 's#^(\.\./\.\./|\./)##' | sort -u); do [ -f "$f" ] || echo "MISSING $f"; done
```

Expected: no `MISSING` lines.

- [ ] **Step 3: Run the tests**

Run: `npm test`
Expected: `# pass 5`, `# fail 0`.

- [ ] **Step 4: Responsive pass** (DevTools device toolbar): 1440×900, 1280×800, 1024×768, 768×1024, 390×844, 360×740. At each size check:

- No horizontal scrollbar (`document.documentElement.scrollWidth === innerWidth` in the console).
- The hero name never overlaps the HUD panels.
- The nav never covers a section heading after clicking a nav link (`scroll-padding-top: 88px`).

- [ ] **Step 5: Re-run the Review Focus checks** listed at the top: Task 5 step 6, Task 6 step 7, Task 3 step 5 and Task 11 step 6.

- [ ] **Step 6: Run Lighthouse** (Chrome DevTools, mobile, on `npm run dev`)

Expected: Accessibility ≥ 95, Best Practices ≥ 95, no "image elements do not have explicit width and height" warnings. Record the Performance score in the PR description.

- [ ] **Step 7: Rewrite `README.md`**

```markdown
# Le Bronn Samson: Portfolio

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

If the photo and render don't line up, change `photoOffset` in `initHero()` (`src/js/main.js`)
and `.hero-portrait .layer-photo { transform: translateY(...) }` in `home.css` together
(0.008 = 0.8%).

Design inspired by rinlayheang.me.
```

- [ ] **Step 8: Commit and hand off**

```bash
git add -A
git commit -m "docs: README for the static redesign; content gate passed"
```

Then ask Bronn to review the branch in the browser before any merge or deploy. Deploy target and URL are still unconfirmed (D-items and `og:url`).

---

## Appendix A: Reference spec (measured from rinlayheang.me, 2026-10-27)

Everything here was read from the production CSS/JS, not estimated from screenshots.

### A.1 Colour tokens

| Token | Paper (default) | `tone-ink` | `tone-yellow` (unused) | `tone-teal` (unused) |
|---|---|---|---|---|
| `--paper` | `#eef3f4` | `#0b1026` | `#ffd43b` | `#0a7a8c` |
| `--ink` | `#0b1026` | `#eef3f4` | `#0b1026` | `#fff` |
| `--ink-soft` | `#4b5575` | `#aab3cf` | `#4a4220` | `#d3eef2` |
| `--teal` (accent role) | `#0a7a8c` | `#ffd43b` | `#0a5f6d` | `#fff` |
| `--accent` | – | `#ffd43b` | `#0a5f6d` | `#ffd43b` |
| `--rule` | `#0b102624` | `#eef3f433` | `#0b102640` | `#ffffff47` |
| contour stroke opacity | 0.06 (hero 0.07) | 0.08 | 0.10 | 0.08 |

Other fixed colours: `--yellow #ffd43b`; nav CTA hover `#222a4d`; project button `#0a7a8c` → hover `#0d96ab` + shadow `0 6px 16px #0a7a8c66`; second venture accent `#2f5bea`; lightbox scrim `#0b1026eb`; carousel controls `#0b102673` / dots bg `#0b102666`; burn sweep gradient `#ffd43b` peaking at 0.9 alpha; WebGL glow `#ffd43b`.

### A.2 Type

- Display: Bricolage Grotesque, variable axes `opsz 12..96, wdth 75..100, wght 500..800`. "Cond" style: `wdth 75`, `opsz 96`, weight 800, uppercase, letter-spacing −0.01em, line-height 0.86 (hero 0.84). Nav brand and stat numbers use `opsz 48`.
- Body: Onest 400/500, `17px/1.6`.
- Scale: hero name `clamp(64px, 8.4vw, 136px)` (≤768: `8.5vw`, one line); section title `clamp(56px, 8vw, 120px)` (≤560: `clamp(44px, 14vw, 72px)`); contact title `clamp(80px, 11vw, 170px)`; achievement h3 `clamp(56px, 7vw, 96px)`; venture h3 `clamp(40px, 5vw, 64px)`; project h3 `clamp(30px, 3vw, 40px)`; skill h3 36px; business h3 48px; case title `clamp(64px, 9.5vw, 136px)`; labels 11px, 0.08em, uppercase.

### A.3 Layout

`--max 1280px`; `--gutter clamp(16px, 5vw, 72px)`; section padding-top `clamp(80px, 10vw, 130px)`; tone padding-bottom the same; `scroll-padding-top 88px`; hero `100svh`, min 680px; HUD panel column 236px; chamfer cuts 10px (buttons), 14px (gallery/poster), 18px (media).
Breakpoints: 1024, 960 (case), 900, 768, 600 (case), 560, 400.

### A.4 Motion

| Thing | Spec |
|---|---|
| Main easing | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Hero name | `rise` 0.9s (translateY 28px → 0, fade), line 2 +80ms; meta +0.2s |
| HUD panels | `slide-in` 0.9s (translate 24px → 0), nth-child +0.1s / +0.2s |
| Portrait | `fade` 1s; bar `fade` 1s delay 0.4s |
| Scroll reveal | IO `rootMargin 0 0 -8% 0`, threshold 0.12; fade + translateY 36px, 0.9s, stagger `--i × 90ms` |
| Wipe headings | clip-path `inset(-20% -5% 100%)` + translateY 0.35em → none, 1.1s |
| Scan reveal | paper sheet with teal edge (25% teal at 56px, solid at 58px, paper from 60px) translates 100% down, 1.2s |
| Project cover | scale 1.12 → 1, 1.4s; hover scale 1.04 0.7s; burn sweep 0.9s (70px bar, skew −14°, screen blend) |
| HUD hover | bracket length 10px → 22px, 0.35s; colour → accent |
| Nav | split at scrollY > 40; hide when scrolling down past 120 (jitter ≤ 4px ignored); width/gap 0.6s, transform 0.45s; glass `blur(18px) saturate(170%)` |
| Carousel | autoplay 4500ms; crossfade 0.9s; Ken Burns scale 1.06 → 1 over 6s ease-out; dot 8px → 26px 0.4s |
| Coverflow | scroll-driven `view(inline)`: rotateY 38° → 0 → −38°, scale 0.88 ↔ 1, opacity 0.6 ↔ 1 |
| Lightbox | scrim fade 0.25s; image pop scale 0.94 → 1, 0.35s |
| Venture card | hover lift 4px 0.4s; poster rotate ±2.5° → 0 + scale 1.02, 0.6s |
| Case pages | `case-in` 0.9s translateY 24px, stagger `--i × 80ms` |
| WebGL burn | fbm (4 octaves) at `uv·(4.2, 4.0) + 1.7`; edge 0.07; burn 1.3s; trail canvas 192px wide, fade 0.045/frame, brush 90px CSS radius, stamp spacing 0.35·r; trail mask smoothstep(0.28, 0.55) with ±0.175 noise jitter; rim glow `pow(4m(1−m), 4)·0.8`; renders 150 frames after the last pointer move; pauses offscreen / hidden tab; DPR capped at 2; photo UV offset (0, 0.008) |
| Reduced motion | all durations 0.01ms; reveal disabled; carousel autoplay off; burn jumps instantly |

### A.5 Skipped reference blocks (values, in case they're needed later)

- Venture poster: `width min(100%, 340px)`, rotate −2.5° (reverse +2.5°), cut 14px, shadow `0 30px 50px -24px #0b10268c`.
- Case FAQ: `<details>` rows, summary 19px/500, "+" rotates 45° (0.3s) when open; answer padded 42px left.
- Case stats: grid of HUD cards, number `clamp(44px, 5vw, 64px)` in accent, label 14px.
- Case gallery mosaic: `3fr 4fr` columns, first figure spans 2 rows, caption on a `#0b1026bf` gradient.
- Case team: 3-column grid, 48px round avatar (initial in accent; "me" filled with accent).
- Live pill: accent at 14% bg with a 6px dot and 3px halo.

---

## Confidence

- **High:** colours, type, spacing, breakpoints, timings and behaviours. All were read directly from the production CSS/JS bundles.
- **High:** the raw WebGL port reproduces the reference effect. It uses the same shader maths and handles texture flip-Y, premultiplied output, highp precision, NPOT clamp, idle and visibility pausing.
- **Medium:** pixel-identical rendering on every GPU. Confirm side by side in Task 5.
- **Medium:** the exact mobile placement of the hero bar. The reference's ≤1024px rules point to a stacked column, which is what this plan implements, but it couldn't be screenshotted: the Chrome extension timed out, and headless Chrome is blocked by the shell allowlist.
- **Content:** every `[[BRONN: ...]]` value is intentionally unfilled rather than guessed.
