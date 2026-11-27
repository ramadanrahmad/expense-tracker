import { useEffect, useRef } from 'react';
import SakugaFX from '../utils/sakugaCore';

let measureCtx = null;
function getMeasureCtx() {
  if (!measureCtx && typeof document !== 'undefined') {
    measureCtx = document.createElement('canvas').getContext('2d');
  }
  return measureCtx;
}

export function triggerThemeFx(el) {
  if (!el || !SakugaFX) return;
  const c = SakugaFX.at(el);
  SakugaFX.ticks(c.x, c.y - c.h / 2 - 4, { dir: -Math.PI / 2, n: 3, r: 4, len: 14, fan: 0.6, life: 0.45 });
  SakugaFX.kira(c.x + c.w / 2, c.y - c.h / 2, { r: 13, life: 0.65 });
  SakugaFX.sfx('kachi', c.x - 16, c.y - 38, { size: 62, rot: -0.1, life: 0.6 });
}

export function triggerDeleteFx(el) {
  if (!el || !SakugaFX) return;
  const c = SakugaFX.at(el);
  SakugaFX.puff(c.x, c.y, { size: 10, n: 4, vx: -14, vy: -18, life: 0.55 });
  SakugaFX.shards(c.x, c.y, { n: 6, speed: 170, size: 5, life: 0.6, arc: Math.PI * 2, grav: 320 });
  SakugaFX.sfx('zuza', c.x - 24, c.y - 34, { size: 78, rot: -0.1, life: 0.7 });
}

export function triggerProgressFx(el, reachedFull = false) {
  if (!el || !SakugaFX) return;
  const c = SakugaFX.at(el);
  if (reachedFull) {
    SakugaFX.burst(c.x, c.y, { r: 78, spikes: 15, life: 0.48 });
    SakugaFX.shards(c.x, c.y, { n: 10, speed: 240, size: 7, life: 0.85, arc: 6.28 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + SakugaFX.rnd(0.4);
      SakugaFX.puff(c.x + Math.cos(a) * 60, c.y + Math.sin(a) * 20, {
        size: SakugaFX.rnd(7, 11),
        n: 4,
        vx: Math.cos(a) * 40,
        vy: Math.sin(a) * 26 - 8,
        life: SakugaFX.rnd(0.55, 0.9)
      });
    }
    SakugaFX.sfx('don', c.x, c.y - 54, { size: 140, rot: -0.1, life: 1.0 });
    SakugaFX.kira(c.x + c.w / 2 - 14, c.y - 16, { r: 15, life: 0.85 });
  } else {
    SakugaFX.ticks(c.x, c.y - 14, { dir: -Math.PI / 2, n: 3, r: 4, len: 12, life: 0.4 });
    SakugaFX.puff(c.x, c.y - 6, { size: 6, n: 3, vx: 18, vy: -14, life: 0.5 });
  }
}

export function SakugaButton({
  variant = 'pill', // 'primary' | 'pill' | 'icon' | 'subtle'
  sfxWord,
  fullWidth = false,
  children,
  className = '',
  style = {},
  onClick,
  onPointerDown,
  disabled = false,
  ...props
}) {
  const btnRef = useRef(null);
  const canvasRef = useRef(null);
  const backLayerRef = useRef(null);
  const sqRef = useRef(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn || !SakugaFX) return;

    const opts =
      variant === 'primary'
        ? { low: 0.62, k: 520, d: 15, wide: 0.14 }
        : variant === 'icon'
        ? { low: 0.72, k: 540, d: 15, wide: 0.22 }
        : { low: 0.78, k: 560, d: 16, wide: 0.12 };

    const sq = SakugaFX.squashy(btn, opts);
    sqRef.current = sq;

    if (variant === 'primary' && canvasRef.current) {
      backLayerRef.current = SakugaFX.backLayer(canvasRef.current);
    }

    const tickFn = (dt) => sq.step(dt);
    SakugaFX.frames.add(tickFn);
    SakugaFX.start();

    return () => {
      SakugaFX.frames.delete(tickFn);
      if (backLayerRef.current) {
        SakugaFX.removeLayer(backLayerRef.current);
        backLayerRef.current = null;
      }
    };
  }, [variant]);

  const handlePointerDown = (e) => {
    const btn = btnRef.current;
    if (!disabled && btn && SakugaFX) {
      const c = SakugaFX.at(btn);
      if (variant === 'primary') {
        SakugaFX.ticks(c.x, c.y - c.h / 2 - 6, { dir: -Math.PI / 2, n: 3, r: 4, len: 14, fan: 0.5 });
        SakugaFX.wob(c.x - c.w / 2 - 6, c.y, { dir: -1, r: 10, life: 0.3 });
        SakugaFX.wob(c.x + c.w / 2 + 6, c.y, { dir: 1, r: 10, life: 0.3 });
        SakugaFX.lines(c.x, c.y + c.h / 2 + 10, { n: 3, dir: 0, len: 16, spread: 0.1, life: 0.25 });
      }
    }
    onPointerDown?.(e);
  };

  const handleClick = (e) => {
    const btn = btnRef.current;
    const sq = sqRef.current;
    if (!disabled && btn && sq && SakugaFX) {
      const c = SakugaFX.at(btn);
      const n = ++seqRef.current;

      if (variant === 'primary') {
        sq.s.x = Math.min(sq.s.x, 0.68);
        sq.pop.x = 1.12;
        sq.tilt.x = -3.2;
        btn.classList.add('sakuga-inv');
        SakugaFX.later(170, () => btn.classList.remove('sakuga-inv'));

        SakugaFX.burst(c.x, c.y, { r: 94, spikes: 17, life: 0.48, layer: backLayerRef.current });
        SakugaFX.shards(c.x, c.y, { n: 11, speed: 240, size: 8, life: 0.9, arc: 6.28, grav: 300 });
        for (const [dx, dy] of [[-1, -0.5], [1, -1], [-1, 0.9], [1, 1]]) {
          SakugaFX.puff(c.x + dx * (c.w / 2 - 4), c.y + dy * 22, {
            size: SakugaFX.rnd(11, 15),
            n: 5,
            vx: dx * 44,
            vy: dy * 28 - 6,
            life: SakugaFX.rnd(0.7, 1.0)
          });
        }
        const word = sfxWord === undefined ? 'don' : sfxWord;
        if (word) {
          SakugaFX.sfx(word, c.x + 6, c.y - 66, { size: 148, rot: -0.12, life: 1.0 });
          SakugaFX.ticks(c.x - 86, c.y - 54, { dir: -2.4, n: 2, r: 4, len: 20, life: 0.45 });
          SakugaFX.ticks(c.x + 96, c.y - 48, { dir: -0.7, n: 2, r: 4, len: 20, life: 0.45 });
        }

        SakugaFX.later(190, () => {
          if (n !== seqRef.current) return;
          sq.s.x = 1.14;
          SakugaFX.wob(c.x - c.w / 2 - 6, c.y, { dir: -1 });
          SakugaFX.wob(c.x + c.w / 2 + 6, c.y, { dir: 1 });
          SakugaFX.donut(c.x + 6, c.y - 40, { r: 26, vx: 20, vy: -48, life: 1.15 });
          SakugaFX.later(90, () => SakugaFX.donut(c.x + 48, c.y - 46, { r: 16, vx: 32, vy: -38, life: 1.0 }));
          SakugaFX.later(170, () => SakugaFX.donut(c.x + 78, c.y - 42, { r: 10, vx: 36, vy: -28, life: 0.9 }));
          SakugaFX.shards(c.x - 28, c.y + 24, { n: 2, speed: 20, size: 5, dir: Math.PI / 2, arc: 1, grav: 360 });
          SakugaFX.shards(c.x + 30, c.y + 24, { n: 2, speed: 20, size: 5, dir: Math.PI / 2, arc: 1, grav: 360 });
        });
      } else if (variant === 'icon') {
        sq.s.x = Math.min(sq.s.x, 0.78);
        sq.pop.x = 1.18;
        sq.tilt.x = -6;
        SakugaFX.ticks(c.x, c.y - c.h / 2 - 4, { dir: -Math.PI / 2, n: 3, r: 4, len: 13, fan: 0.6, life: 0.45 });
        SakugaFX.kira(c.x + c.w / 2, c.y - c.h / 2, { r: 12, life: 0.6 });
        if (sfxWord) {
          SakugaFX.sfx(sfxWord, c.x - 10, c.y - 36, { size: 64, rot: -0.1, life: 0.6 });
        }
      } else {
        sq.s.x = Math.min(sq.s.x, 0.8);
        sq.s.v += 3.5;
        sq.pop.x = 1.07;
        SakugaFX.ticks(c.x, c.y - c.h / 2 - 6, { dir: -Math.PI / 2, n: 3, r: 4, len: 13, fan: 0.5, life: 0.42 });
        SakugaFX.puff(c.x - 12, c.y, { size: 6.5, n: 3, vx: -16, vy: -10, life: 0.5 });
        SakugaFX.lines(c.x, c.y, { n: 4, dir: Math.PI, len: 24, spread: 9, life: 0.25 });
        if (sfxWord) {
          SakugaFX.sfx(sfxWord, c.x, c.y - 36, { size: 68, rot: -0.1, life: 0.6 });
        }
      }
    }
    onClick?.(e);
  };

  if (variant === 'primary') {
    return (
      <div
        className="sakuga-btn-wrap"
        style={{
          position: 'relative',
          isolation: 'isolate',
          display: fullWidth ? 'block' : 'inline-block',
          width: fullWidth ? '100%' : 'auto'
        }}
      >
        <canvas ref={canvasRef} className="sakuga-back" aria-hidden="true" />
        <button
          ref={btnRef}
          className={className}
          style={style}
          disabled={disabled}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          {...props}
        >
          {children}
        </button>
      </div>
    );
  }

  return (
    <button
      ref={btnRef}
      className={className}
      style={style}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

export function SakugaInput({
  className = 'minimal-input',
  style = {},
  onFocus,
  onChange,
  type = 'text',
  ...props
}) {
  const inpRef = useRef(null);
  const springRef = useRef(null);

  useEffect(() => {
    const inp = inpRef.current;
    if (!inp || !SakugaFX) return;

    const s = new SakugaFX.Spring(1, 700, 16);
    springRef.current = s;

    const tickFn = (dt) => {
      const y = s.step(dt);
      inp.style.transform = Math.abs(y - 1) < 0.0006 ? '' : `scale(${y})`;
    };

    SakugaFX.frames.add(tickFn);
    SakugaFX.start();

    return () => {
      SakugaFX.frames.delete(tickFn);
    };
  }, []);

  const handleFocus = (e) => {
    const inp = inpRef.current;
    const s = springRef.current;
    if (inp && s && SakugaFX) {
      s.x = 1.035;
      const c = SakugaFX.at(inp, 1, 0);
      SakugaFX.ticks(c.x - 6, c.y - 4, { dir: -1.05, n: 3, r: 5, len: 16, fan: 0.36, life: 0.5 });
    }
    onFocus?.(e);
  };

  const handleChange = (e) => {
    const inp = inpRef.current;
    const s = springRef.current;
    if (inp && s && SakugaFX) {
      const c = SakugaFX.at(inp, 0, 0.5);
      let x = c.x + c.w * 0.5;
      if (type === 'text' || type === 'password' || type === 'search' || type === 'email' || type === 'url' || type === 'tel') {
        const ctx = getMeasureCtx();
        if (ctx) {
          const cs = getComputedStyle(inp);
          ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
          const pos = inp.selectionStart ?? inp.value.length;
          const shown = type === 'password' ? '•'.repeat(pos) : String(inp.value).slice(0, pos);
          const padLeft = parseFloat(cs.paddingLeft) || 12;
          x = c.x + padLeft + Math.min(Math.max(0, c.w - padLeft * 2), ctx.measureText(shown).width);
        }
      }
      s.x = 0.985;
      SakugaFX.puff(x, c.y + 10, {
        size: SakugaFX.rnd(4, 6),
        n: 2,
        vy: -22,
        vx: SakugaFX.rnd(-10, 10),
        life: 0.4
      });
      if (Math.random() < 0.38) {
        SakugaFX.shards(x, c.y + 6, { n: 2, speed: 110, size: 3, life: 0.5 });
      }
    }
    onChange?.(e);
  };

  return (
    <input
      ref={inpRef}
      type={type}
      className={className}
      style={style}
      onFocus={handleFocus}
      onChange={handleChange}
      {...props}
    />
  );
}

export function SakugaSelect({
  className = 'minimal-input',
  style = {},
  onFocus,
  onChange,
  children,
  ...props
}) {
  const selRef = useRef(null);
  const springRef = useRef(null);

  useEffect(() => {
    const sel = selRef.current;
    if (!sel || !SakugaFX) return;

    const s = new SakugaFX.Spring(1, 620, 15);
    springRef.current = s;

    const tickFn = (dt) => {
      const y = s.step(dt);
      sel.style.transform = Math.abs(y - 1) < 0.0006 ? '' : `scale(${y})`;
    };

    SakugaFX.frames.add(tickFn);
    SakugaFX.start();

    return () => {
      SakugaFX.frames.delete(tickFn);
    };
  }, []);

  const handleFocus = (e) => {
    const sel = selRef.current;
    const s = springRef.current;
    if (sel && s && SakugaFX) {
      s.x = 1.03;
      const c = SakugaFX.at(sel, 1, 0);
      SakugaFX.ticks(c.x - 6, c.y - 4, { dir: -1.05, n: 3, r: 4, len: 14, fan: 0.4, life: 0.45 });
    }
    onFocus?.(e);
  };

  const handleChange = (e) => {
    const sel = selRef.current;
    const s = springRef.current;
    if (sel && s && SakugaFX) {
      s.x = 1.06;
      const c = SakugaFX.at(sel);
      SakugaFX.puff(c.x, c.y, { size: 6, n: 3, vy: -18, life: 0.45 });
      SakugaFX.ticks(c.x, c.y - c.h / 2 - 4, { dir: -Math.PI / 2, n: 3, r: 4, len: 12, life: 0.4 });
    }
    onChange?.(e);
  };

  return (
    <select
      ref={selRef}
      className={className}
      style={style}
      onFocus={handleFocus}
      onChange={handleChange}
      {...props}
    >
      {children}
    </select>
  );
}
