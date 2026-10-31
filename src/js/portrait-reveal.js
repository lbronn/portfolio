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
uniform float uProgress;   // 0 = 3D model fully shown, 1 = photo fully shown
uniform vec3 uGlow;
uniform vec2 uPhotoOffset; // calibration knob so the photo's head sits on the 3D model's head
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
const BURN_SECONDS = 1.3;  // duration of a full photo <-> 3D model burn

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

export function mountPortraitReveal(canvas, photo, alt, { reducedMotion = false, glow = '#29a3ff', photoOffset = [0, 0], onLost } = {}) {
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
    if (reducedMotion) return;
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
