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
