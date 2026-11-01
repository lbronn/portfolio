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
