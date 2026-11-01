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
  nav.addEventListener('focusin', () => { hidden = false; nav.classList.remove('is-hidden'); });
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
    title.textContent = layer === 'photo' ? 'Show 3D model' : 'Show photo';
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

/**
 * Sideways card sliders: a scroll-snap track, an "01 / 03" counter and prev/next arrows ([data-slider-nav]).
 * data-slider="loop" (Projects): cards centred, wraps around, opens on the middle card.
 * data-slider="straight" (Achievements): cards start-aligned, stops at either end, opens on the first card.
 */
function initSliders() {
  document.querySelectorAll('[data-slider]').forEach((track) => {
    const loop = track.dataset.slider === 'loop';
    const cards = [...track.children];
    const nav = document.querySelector(`[data-slider-nav="${track.id}"]`);
    const count = nav.querySelector('.slide-count');
    const [prev, next] = nav.querySelectorAll('[data-slide-step]');
    const pad = (n) => String(n).padStart(2, '0');
    let index = 0;
    const left = (card) => (loop
      ? card.offsetLeft + card.offsetWidth / 2 - track.clientWidth / 2
      : card.offsetLeft - (parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0));
    const go = (i, behavior) => track.scrollTo({ left: left(cards[i]), behavior });
    const show = (i) => {
      index = i;
      count.textContent = `${pad(i + 1)} / ${pad(cards.length)}`;
      if (loop) return;
      prev.setAttribute('aria-disabled', String(i === 0)); // aria-disabled, not disabled: keeps keyboard focus
      next.setAttribute('aria-disabled', String(i === cards.length - 1));
    };
    // the card over the middle of the track is the current one, however it got there (arrows, swipe, trackpad)
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) show(cards.indexOf(e.target)); }),
      { root: track, rootMargin: '0px -49% 0px -49%' });
    cards.forEach((c) => io.observe(c));
    let moved = false; // the visitor took over: never snap back to the start card
    nav.querySelectorAll('[data-slide-step]').forEach((btn) => btn.addEventListener('click', () => {
      moved = true;
      const step = Number(btn.dataset.slideStep);
      const to = loop ? wrapIndex(index, step, cards.length) : clampIndex(index, step, cards.length);
      if (to !== index) go(to, reducedMotion() ? 'instant' : 'smooth');
    }));
    ['pointerdown', 'wheel', 'keydown'].forEach((type) => track.addEventListener(type, () => { moved = true; }, { passive: true }));
    const start = loop ? Math.floor(cards.length / 2) : 0;
    show(0);
    go(start, 'instant');
    // web fonts resize the cards after first layout and the browser may re-snap to another card: put the start card back
    document.fonts.ready.then(() => { if (!moved) go(start, 'instant'); });
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
    // hiding the focused button would drop focus to <body>, outside the dialog
    if ((prev.hidden && document.activeElement === prev) || (next.hidden && document.activeElement === next)) dialog.querySelector('.lb-close').focus();
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

/**
 * Anchor jumps (nav, hero CTA, "Experience") stay native; this only sets each section's scroll-margin so the jump
 * puts the section's middle at the window's middle (taller sections included). The page ends just below the last
 * section, so it gets a min-height that leaves it room to centre. The hero (#top) is left alone: it means "the top".
 */
function initSectionCentering() {
  const sections = [...document.querySelectorAll('main section[id]:not(.hero)')];
  const last = sections.at(-1);
  if (!last) return; // case-study pages load this module but have no anchor sections
  const fit = () => {
    last.style.minHeight = '';
    const below = document.documentElement.scrollHeight - (last.getBoundingClientRect().bottom + scrollY); // the footer
    last.style.minHeight = `${innerHeight - 2 * below}px`; // centred at max scroll; min-height never shrinks it
    const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0; // html's scroll-padding (for the nav) still applies; cancel it
    sections.forEach((s) => { s.style.scrollMarginTop = `${(innerHeight - s.offsetHeight) / 2 - pad}px`; });
  };
  fit();
  document.fonts.ready.then(fit); // web fonts change section heights; images have fixed width/height
  window.addEventListener('resize', fit);
}

/**
 * Profession roadmap. The first time it's in view the figure hops stop 1 -> 2 -> 3 and the flags go up (CSS: .hop-ready, .is-hopping);
 * narrow screens scroll the road along with him. Reduced motion: no hops, the road just opens on the current stop.
 */
function initRoadmap() {
  const road = document.querySelector('.roadmap');
  if (!road) return;
  const stops = road.querySelectorAll('.stop');
  const scrollToStop = (i, behavior) => road.scrollTo({ left: stops[i].offsetLeft - stops[0].offsetLeft, behavior }); // no-op when the road fits
  if (reducedMotion() || !('IntersectionObserver' in window)) { scrollToStop(stops.length - 1, 'instant'); return; }
  road.classList.add('hop-ready');
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    road.classList.add('is-hopping');
    setTimeout(() => scrollToStop(1, 'smooth'), 700); // take-offs in hop-x (home.css): 0.4s delay + 14% / 57% of 2.1s
    setTimeout(() => scrollToStop(2, 'smooth'), 1600);
  }, { threshold: 0.4 });
  io.observe(road);
}

/** Click the figure: his free hand waves (CSS .is-waving) and "I Freelance Too!" shows in a live region for 2 s. */
function initWalker() {
  const btn = document.querySelector('.walker-btn');
  if (!btn) return;
  const bubble = btn.querySelector('.walker-bubble');
  let timer = 0;
  btn.addEventListener('click', () => {
    btn.classList.remove('is-waving');
    void btn.offsetWidth; // restart the wave on a repeat click
    btn.classList.add('is-waving');
    bubble.textContent = 'I Freelance Too!';
    clearTimeout(timer);
    timer = setTimeout(() => { btn.classList.remove('is-waving'); bubble.textContent = ''; }, 2000);
  });
}

/** The Off the clock avatar talks (CSS .is-talking) the first time it's on screen, then every 10 s. */
function initAvatarTalk() {
  const head = document.querySelector('.avatar-head');
  if (!head || reducedMotion() || !('IntersectionObserver' in window)) return;
  const talk = () => {
    head.classList.remove('is-talking');
    void head.offsetWidth; // restart the animation
    head.classList.add('is-talking');
  };
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    talk();
    setInterval(talk, 10000);
  }, { threshold: 0.6 });
  io.observe(head.parentElement);
}

// --- boot (module scripts run after the DOM is parsed) ---
initReveal();
initContours();
initNav();
initSpark();
initHero();
initCarousels();
initSliders();
initLightbox();
initSectionCentering();
initRoadmap();
initWalker();
initAvatarTalk();
