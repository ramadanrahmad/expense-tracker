// Zero-dependency Web Audio API synthesizer for Manga / Sakuga UI comic sound effects.
let ctx = null;
let muted = typeof localStorage !== 'undefined' && localStorage.getItem('soundMuted') === 'true';

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function createNoiseBuffer(audioCtx, duration) {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

const soundFx = {
  isMuted() {
    return muted;
  },

  setMuted(val) {
    muted = !!val;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('soundMuted', String(muted));
    }
  },

  // Typing dust pop (soft & non-fatiguing)
  playKeyPop() {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    const base = 420 + Math.random() * 140;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.55, now + 0.032);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  },

  // Crisp comic click ("Kachi!") for tabs, filters, selects, toggles
  playClick() {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(1260, now + 0.038);
    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  },

  // Quick comic swoosh ("Shu!") for tab switching & ink transition
  playSwipe() {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = createNoiseBuffer(c, 0.14);
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.8, now);
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(420, now + 0.13);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(now);
    src.stop(now + 0.145);
  },

  // Manga impact boom ("DON!!") for primary action buttons
  playImpact() {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;

    // Punchy low sub thud
    const sub = c.createOscillator();
    const subGain = c.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(155, now);
    sub.frequency.exponentialRampToValueAtTime(46, now + 0.15);
    subGain.gain.setValueAtTime(0.18, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
    sub.connect(subGain).connect(c.destination);
    sub.start(now);
    sub.stop(now + 0.18);

    // Crisp comic burst transient
    const noise = c.createBufferSource();
    noise.buffer = createNoiseBuffer(c, 0.08);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(950, now);
    bp.Q.setValueAtTime(1.2, now);
    const nGain = c.createGain();
    nGain.gain.setValueAtTime(0.075, now);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    noise.connect(bp).connect(nGain).connect(c.destination);
    noise.start(now);
    noise.stop(now + 0.08);

    // Bright anime rebound ping
    const ping = c.createOscillator();
    const pGain = c.createGain();
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(587.33, now + 0.04);
    ping.frequency.exponentialRampToValueAtTime(880, now + 0.11);
    pGain.gain.setValueAtTime(0.0001, now);
    pGain.gain.setValueAtTime(0.05, now + 0.04);
    pGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    ping.connect(pGain).connect(c.destination);
    ping.start(now + 0.04);
    ping.stop(now + 0.15);
  },

  // Skid/discard SFX ("Zuza!") for deleting
  playDelete() {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.11);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, now);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(lp).connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.125);
  },

  // Crisp 2-note chime for saving / restoring
  playSuccess() {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    [523.25, 783.99].forEach((freq, idx) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const start = now + idx * 0.065;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
      osc.connect(gain).connect(c.destination);
      osc.start(start);
      osc.stop(start + 0.16);
    });
  },

  // Celebratory rising anime fanfare when Cicilan reaches Rp 0 (LUNAS!) or target hits 100%
  playLunasFanfare() {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const start = now + idx * 0.075;
      const dur = idx === 3 ? 0.34 : 0.16;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.095, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain).connect(c.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    });
  },
};

export default soundFx;
