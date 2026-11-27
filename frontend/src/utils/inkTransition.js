import { flushSync } from 'react-dom';

let activeTransition = null;

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Generates an SVG clip-path string representing an organic liquid ink splash
 * with detached leading droplets and trailing negative-space splatters.
 */
function buildInkKeyframes(ox, oy, vw, vh) {
  const maxR = Math.hypot(Math.max(ox, vw - ox), Math.max(oy, vh - oy));
  const scale = Math.max(0.7, Math.min(1.6, Math.min(vw, vh) / 520));

  // Randomize seeds for organic variation on every toggle
  const s1 = Math.random() * Math.PI * 2;
  const s2 = Math.random() * Math.PI * 2;
  const s3 = Math.random() * Math.PI * 2;
  const s4 = Math.random() * Math.PI * 2;
  const s5 = Math.random() * Math.PI * 2;
  const s6 = Math.random() * Math.PI * 2;
  const s7 = Math.random() * Math.PI * 2;

  const MAIN_PTS = 128;
  const DROP_PTS = 8;
  const HOLE_PTS = 8;

  const shapeFactor = (theta) => {
    const macro =
      1.0 +
      0.34 * Math.sin(2 * theta + s1) +
      0.24 * Math.cos(3 * theta + s2) +
      0.16 * Math.sin(5 * theta + s3);
    const meso =
      0.13 * Math.sin(11 * theta + s4) +
      0.08 * Math.cos(19 * theta + s5);
    const micro =
      0.045 * Math.sin(33 * theta + s6) +
      0.025 * Math.cos(57 * theta + s7);
    return Math.max(0.46, macro + meso + micro);
  };

  // Precompute main contour shape factors
  const mainFactors = Array.from({ length: MAIN_PTS }, (_, i) => {
    const theta = (i / MAIN_PTS) * Math.PI * 2;
    return { theta, cos: Math.cos(theta), sin: Math.sin(theta), factor: shapeFactor(theta) };
  });

  // Bias droplets toward the leading ink tongues
  const droplets = Array.from({ length: 20 }, (_, i) => {
    const baseAngle = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    return {
      ang: baseAngle,
      cos: Math.cos(baseAngle),
      sin: Math.sin(baseAngle),
      factor: shapeFactor(baseAngle),
      boost: 1.06 + Math.random() * 0.32,
      maxR: (9 + Math.random() * 22) * scale,
      phase: Math.random() * Math.PI * 2,
      wobble: Array.from({ length: DROP_PTS }, () => 0.7 + Math.random() * 0.55),
    };
  });

  // Trailing negative-space cutouts (counter-clockwise winding for nonzero rule)
  const holes = Array.from({ length: 10 }, (_, i) => {
    const baseAngle = (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
    return {
      ang: baseAngle,
      cos: Math.cos(baseAngle),
      sin: Math.sin(baseAngle),
      factor: shapeFactor(baseAngle),
      lag: 0.66 + Math.random() * 0.18,
      maxR: (8 + Math.random() * 18) * scale,
      phase: Math.random() * Math.PI * 2,
      wobble: Array.from({ length: HOLE_PTS }, () => 0.68 + Math.random() * 0.58),
    };
  });

  const FRAMES = 16;
  const keyframes = [];

  for (let f = 0; f < FRAMES; f++) {
    const t = f / (FRAMES - 1);
    const prog = t < 0.45 ? easeInOutCubic(t / 0.45) * 0.48 : 0.48 + easeOutQuart((t - 0.45) / 0.55) * 0.52;
    const baseR = maxR * 2.45 * prog;

    // 1. Main ink wave contour (Clockwise)
    const parts = [];
    for (let i = 0; i < MAIN_PTS; i++) {
      const m = mainFactors[i];
      // Dynamic splatter fingers accentuate mid-flight then smooth out at 100%
      const r = baseR * (t === 1 ? 1.55 : m.factor);
      const px = (ox + m.cos * r).toFixed(1);
      const py = (oy + m.sin * r).toFixed(1);
      parts.push(i === 0 ? `M${px} ${py}` : `L${px} ${py}`);
    }
    parts.push('Z');

    // 2. Detached leading ink droplets (Clockwise)
    const dropEnvelope = t === 0 || t === 1 ? 0 : Math.sin(Math.pow(t, 0.75) * Math.PI);
    for (const d of droplets) {
      const dist = baseR * d.factor * d.boost;
      const cx = ox + d.cos * dist;
      const cy = oy + d.sin * dist;
      const dr = d.maxR * dropEnvelope;
      for (let j = 0; j < DROP_PTS; j++) {
        const a = (j / DROP_PTS) * Math.PI * 2 + d.phase;
        const rad = dr * d.wobble[j];
        const px = (cx + Math.cos(a) * rad).toFixed(1);
        const py = (cy + Math.sin(a) * rad).toFixed(1);
        parts.push(j === 0 ? `M${px} ${py}` : `L${px} ${py}`);
      }
      parts.push('Z');
    }

    // 3. Trailing negative ink holes behind wavefront (Counter-Clockwise for nonzero cutout)
    const holeEnvelope = t === 0 || t >= 0.92 ? 0 : Math.sin(Math.pow(t / 0.92, 0.85) * Math.PI);
    for (const h of holes) {
      const dist = baseR * h.factor * (h.lag + 0.22 * t);
      const cx = ox + h.cos * dist;
      const cy = oy + h.sin * dist;
      const hr = h.maxR * holeEnvelope;
      for (let j = HOLE_PTS - 1; j >= 0; j--) {
        const a = (j / HOLE_PTS) * Math.PI * 2 + h.phase;
        const rad = hr * h.wobble[j];
        const px = (cx + Math.cos(a) * rad).toFixed(1);
        const py = (cy + Math.sin(a) * rad).toFixed(1);
        parts.push(j === HOLE_PTS - 1 ? `M${px} ${py}` : `L${px} ${py}`);
      }
      parts.push('Z');
    }

    keyframes.push(`path("${parts.join(' ')}")`);
  }

  return keyframes;
}

/**
 * Fallback Canvas ink-wipe for browsers without View Transitions API support.
 */
function runCanvasFallbackWipe(ox, oy, newTheme) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483600;';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const inkColor = newTheme === 'dark' ? '#14141A' : '#FFFFFF';
  const maxR = Math.hypot(Math.max(ox, window.innerWidth - ox), Math.max(oy, window.innerHeight - oy));
  const start = performance.now();
  const duration = 650;

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const k = easeOutQuart(t);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.globalAlpha = t < 0.7 ? 0.92 : (1 - (t - 0.7) / 0.3) * 0.92;
    ctx.fillStyle = inkColor;
    ctx.beginPath();
    const pts = 72;
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const noise = 1 + 0.25 * Math.sin(a * 3) + 0.14 * Math.cos(a * 7) + 0.08 * Math.sin(a * 13);
      const r = maxR * 1.45 * k * noise;
      const x = ox + Math.cos(a) * r;
      const y = oy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(frame);
}

/**
 * Transitions theme with an organic liquid ink-splatter sweep originating from the clicked button.
 */
export async function runInkThemeTransition(originEl, nextTheme, applyThemeFn) {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  let ox = window.innerWidth - 40;
  let oy = 40;
  if (originEl) {
    const rect = originEl.getBoundingClientRect();
    ox = rect.left + rect.width / 2;
    oy = rect.top + rect.height / 2;
  }

  if (reducedMotion || !document.startViewTransition) {
    document.documentElement.setAttribute('data-theme', nextTheme);
    applyThemeFn();
    if (!reducedMotion) {
      runCanvasFallbackWipe(ox, oy, nextTheme);
    }
    return;
  }

  if (activeTransition) {
    try {
      activeTransition.skipTransition();
    } catch {
      // ignore if already finished
    }
  }

  document.documentElement.classList.add('vt-active');

  const transition = document.startViewTransition(() => {
    document.documentElement.setAttribute('data-theme', nextTheme);
    flushSync(() => {
      applyThemeFn();
    });
  });

  activeTransition = transition;

  try {
    await transition.ready;

    const keyframes = buildInkKeyframes(ox, oy, window.innerWidth, window.innerHeight);

    const anim = document.documentElement.animate(
      { clipPath: keyframes },
      {
        duration: 820,
        easing: 'linear',
        pseudoElement: '::view-transition-new(root)',
      }
    );

    await anim.finished;
  } catch {
    // Transition skipped or unsupported
  } finally {
    if (activeTransition === transition) {
      activeTransition = null;
    }
    document.documentElement.classList.remove('vt-active');
  }
}
