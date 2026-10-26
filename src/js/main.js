import { contourPaths, navStep } from './lib.js';

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

// --- boot (module scripts run after the DOM is parsed) ---
initContours();
initNav();
