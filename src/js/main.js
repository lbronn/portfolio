import { clampIndex, contourPaths, navStep, sparkPoints, wrapIndex } from './lib.js';

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
  let reveal = null; // set once the WebGL boot succeeds

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
}

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

// --- boot (module scripts run after the DOM is parsed) ---
initReveal();
initContours();
initNav();
initSpark();
initHero();
initCarousels();
initLightbox();
