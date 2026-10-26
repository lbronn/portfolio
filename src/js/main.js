import { contourPaths, navStep, sparkPoints } from './lib.js';

/** Fill every <svg data-contours> with the same topographic rings (generated once). */
function initContours() {
  const svgs = document.querySelectorAll('svg[data-contours]');
  if (!svgs.length) return;
  const markup = contourPaths().map((d) => `<path d="${d}"/>`).join('');
  svgs.forEach((svg) => { svg.innerHTML = markup; });
}

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

// --- boot (module scripts run after the DOM is parsed) ---
initContours();
initNav();
initSpark();
initHero();
