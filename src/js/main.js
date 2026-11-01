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
/** Phones (both orientations) and portrait screens under 1200px (tablets upright, up to the iPad Pro 13"): sliders and
 * the roadmap are stacked. Keep equal to the stacked query in home.css. */
const STACKED = '(width <= 1024px), (orientation: portrait) and (width < 1200px)';

/**
 * Adds `cls` to `el` (restarting its animation if the class was already there) and resolves when that animation ends.
 * The timeout is a safety net for an animation that never runs (e.g. the element is display: none).
 */
function playClass(el, cls, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const done = () => { clearTimeout(timer); el.removeEventListener('animationend', onEnd); resolve(); };
    const onEnd = (e) => { if (e.target === el && !e.pseudoElement) done(); };
    const timer = setTimeout(done, timeoutMs);
    el.addEventListener('animationend', onEnd);
    el.classList.remove(cls);
    void el.offsetWidth; // restart
    el.classList.add(cls);
  });
}

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
    // stacked on small screens (no scrolling there): back on a wide screen, open on the start card again
    window.matchMedia(STACKED).addEventListener('change', (e) => { if (!e.matches && !moved) go(start, 'instant'); });
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
 * section, so it gets a min-height that leaves it room to centre, but never more than 10% of the window on top of its
 * own height: on tall screens (a portrait iPad Pro) full centring meant a near-empty screen of padding, so there the
 * jump simply stops at the bottom of the page. The hero (#top) is left alone: it means "the top".
 */
function initSectionCentering() {
  const sections = [...document.querySelectorAll('main section[id]:not(.hero)')];
  const last = sections.at(-1);
  if (!last) return; // case-study pages load this module but have no anchor sections
  const fit = () => {
    last.style.minHeight = '';
    const below = document.documentElement.scrollHeight - (last.getBoundingClientRect().bottom + scrollY); // the footer
    const natural = last.offsetHeight;
    // centred at max scroll (min-height never shrinks it), capped so it never adds more than 10% of the window
    last.style.minHeight = `${Math.min(innerHeight - 2 * below, natural + 0.1 * innerHeight)}px`;
    const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0; // html's scroll-padding (for the nav) still applies; cancel it
    sections.forEach((s) => { s.style.scrollMarginTop = `${(innerHeight - s.offsetHeight) / 2 - pad}px`; });
  };
  fit();
  document.fonts.ready.then(fit); // web fonts change section heights; images have fixed width/height
  window.addEventListener('resize', fit);
  document.addEventListener('sections:resized', fit); // a section changed height without a resize (initShowAll)
}

/**
 * "Show all" on stacked screens ([data-show-all] -> its [data-collapsible] list): only the [data-featured] cards show
 * until it's pressed. The CSS for .is-collapsed lives in the stacked breakpoint, so wide screens always show every card.
 * Without JS nothing is collapsed (the button's markup starts as aria-expanded="true").
 */
function initShowAll() {
  document.querySelectorAll('[data-show-all]').forEach((btn) => {
    const list = document.getElementById(btn.dataset.showAll);
    const label = btn.querySelector('.show-all-label');
    if (!list || !label) return;
    const set = (open) => {
      list.classList.toggle('is-collapsed', !open);
      list.classList.toggle('is-expanded', open);
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Show less' : 'Show all';
      document.dispatchEvent(new Event('sections:resized'));
    };
    list.classList.add('is-collapsed');
    btn.setAttribute('aria-expanded', 'false');
    label.textContent = 'Show all';
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      set(open);
      // collapsing from far down the list: bring the heading back instead of leaving the visitor in the next section
      const head = btn.closest('.sec-head');
      if (!open && head && head.getBoundingClientRect().top < 0) head.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'instant' : 'smooth' });
    });
  });
}

/** Off the clock on stacked screens: one photo at a time; dots under the gallery show which one and jump to any. */
function initGalleryDots() {
  const gallery = document.querySelector('.gallery');
  if (!gallery) return;
  const items = [...gallery.children];
  if (items.length < 2) return;
  const dots = document.createElement('div');
  dots.className = 'gallery-dots';
  const buttons = items.map((item, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Show photo ${i + 1} of ${items.length}`);
    b.addEventListener('click', () => {
      const g = gallery.getBoundingClientRect();
      const r = item.getBoundingClientRect();
      gallery.scrollBy({ left: r.left + r.width / 2 - (g.left + g.width / 2), behavior: reducedMotion() ? 'instant' : 'smooth' });
    });
    dots.append(b);
    return b;
  });
  const mark = (i) => buttons.forEach((b, n) => { b.classList.toggle('is-current', n === i); b.setAttribute('aria-current', String(n === i)); });
  mark(0);
  gallery.after(dots);
  // the photo over the middle of the gallery is the current one, however it got there
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) mark(items.indexOf(e.target)); }),
    { root: gallery, rootMargin: '0px -49% 0px -49%' });
  items.forEach((item) => io.observe(item));
}

/** Overscroll colour: paper while in the top half of the page, ink in the bottom half (see html.is-past-middle in base.css). */
function initOverscrollTint() {
  const root = document.documentElement;
  const update = () => root.classList.toggle('is-past-middle', window.scrollY > (root.scrollHeight - window.innerHeight) / 2);
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

/**
 * Profession roadmap: the figure travels stop 1 -> 2 -> 3 once, and each stop's flag goes up when he has left it.
 * - Desktop (three columns): he hops sideways the first time the road is in view (CSS .hop-ready, .is-hopping).
 * - Stacked (STACKED): he teleports down, one stop each time the next stop's sky has scrolled fully into view
 *   (CSS .tp-ready + the .stop-pad teleport circles); --tp-y lifts him from the current stop's sky to the one he is on.
 * Reduced motion, no IntersectionObserver, or the layout switching mid-way (a rotated tablet): he is simply on the current stop.
 */
function initRoadmap() {
  const road = document.querySelector('.roadmap');
  if (!road || reducedMotion() || !('IntersectionObserver' in window)) return;
  const stops = [...road.querySelectorAll('.stop')];
  const track = road.querySelector('.walker-track');
  const btn = road.querySelector('.walker-btn');
  if (!track || !btn || stops.length < 2) return;
  const stacked = window.matchMedia(STACKED);
  const observers = [];
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    observers.forEach((o) => o.disconnect());
    road.classList.remove('hop-ready', 'is-hopping', 'tp-ready');
    stops.forEach((stop) => stop.classList.remove('is-left'));
    road.querySelectorAll('.stop-pad').forEach((pad) => pad.classList.remove('is-on', 'is-departing', 'is-arriving'));
    btn.classList.remove('is-tp-out', 'is-tp-in');
    track.style.removeProperty('--tp-y');
  };
  stacked.addEventListener('change', finish, { once: true });

  if (!stacked.matches) {
    road.classList.add('hop-ready');
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      road.classList.add('is-hopping');
    }, { threshold: 0.4 });
    io.observe(road);
    observers.push(io);
    return;
  }

  const skies = stops.map((stop) => stop.querySelector('.stop-sky'));
  const pads = stops.map((stop) => stop.querySelector('.stop-pad'));
  if (skies.includes(null) || pads.includes(null)) return; // markup changed: leave him on the current stop
  const last = stops.length - 1;
  let at = 0; // the stop he is on
  let target = 0; // the furthest stop the visitor has reached
  let running = false;
  const place = () => {
    if (!finished) track.style.setProperty('--tp-y', `${skies[at].getBoundingClientRect().top - skies[last].getBoundingClientRect().top}px`);
  };
  road.classList.add('tp-ready');
  pads[0].classList.add('is-on');
  place();
  const ro = new ResizeObserver(place); // card heights change with width, fonts and rotation
  ro.observe(road);
  observers.push(ro);

  const run = async () => {
    if (running) return;
    running = true;
    while (at < target && !finished) {
      pads[at].classList.remove('is-on');
      playClass(pads[at], 'is-departing');
      await playClass(btn, 'is-tp-out');
      if (finished) return;
      stops[at].classList.add('is-left'); // its flag goes up
      at += 1;
      place();
      btn.classList.remove('is-tp-out');
      await Promise.all([playClass(btn, 'is-tp-in'), playClass(pads[at], 'is-arriving')]);
      if (finished) return;
      btn.classList.remove('is-tp-in');
      pads[at].classList.add('is-on');
    }
    running = false;
    if (at === last) finish(); // the end state is the plain layout: him on the current stop, every flag up
  };
  // a stop counts as reached once its whole sky is on screen, or once it has been scrolled past (a fast fling)
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.intersectionRatio >= 0.99 || (!e.isIntersecting && e.boundingClientRect.top < 0)) target = Math.max(target, skies.indexOf(e.target));
    });
    run();
  }, { threshold: [0, 1], rootMargin: '0px 0px -10% 0px' });
  skies.slice(1).forEach((sky) => io.observe(sky));
  observers.push(io);
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
initShowAll();
initGalleryDots();
initOverscrollTint();
initSectionCentering();
initRoadmap();
initWalker();
initAvatarTalk();
