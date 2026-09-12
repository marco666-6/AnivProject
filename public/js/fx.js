/**
 * Ambient layer: drifting petals/sparks on a canvas, heart bursts on tap,
 * and a soft generated lullaby (or public/audio/theme.mp3 if you drop one in).
 */
import { rand, randi, clamp } from './util.js';

/* ══════════════════════════════════════════════════════════
   PETALS
   ══════════════════════════════════════════════════════════ */
export function startPetals(canvas) {
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, dpr = 1, raf = 0;
  const parts = [];

  const COLORS = ['rgba(224,82,109,', 'rgba(217,164,65,', 'rgba(106,53,80,', 'rgba(232,140,160,'];

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(initial = false) {
    return {
      x: rand(-40, w + 40),
      y: initial ? rand(-h, h) : rand(-120, -20),
      r: rand(3, 8.5),
      sp: rand(.16, .62),
      dr: rand(-.22, .22),
      rot: rand(0, Math.PI * 2),
      vr: rand(-.011, .011),
      a: rand(.14, .46),
      c: COLORS[randi(0, COLORS.length - 1)],
      sway: rand(.006, .018),
      phase: rand(0, Math.PI * 2),
    };
  }

  function petal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.c + p.a + ')';
    ctx.beginPath();
    ctx.moveTo(0, -p.r);
    ctx.bezierCurveTo(p.r * .92, -p.r * .55, p.r * .72, p.r * .68, 0, p.r);
    ctx.bezierCurveTo(-p.r * .72, p.r * .68, -p.r * .92, -p.r * .55, 0, -p.r);
    ctx.fill();
    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.phase += p.sway;
      p.x += p.dr + Math.sin(p.phase) * .38;
      p.y += p.sp;
      p.rot += p.vr;
      if (p.y > h + 30 || p.x < -70 || p.x > w + 70) Object.assign(p, spawn());
      petal(p);
    }
    raf = requestAnimationFrame(tick);
  }

  resize();
  const count = reduce ? 0 : clamp(Math.round(innerWidth / 26), 14, 46);
  for (let i = 0; i < count; i++) parts.push(spawn(true));
  if (count) tick();

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 160); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (count) { cancelAnimationFrame(raf); tick(); }
  });

  return { stop: () => cancelAnimationFrame(raf) };
}

/* ══════════════════════════════════════════════════════════
   HEART BURST
   ══════════════════════════════════════════════════════════ */
const GLYPHS = ['🤍', '💗', '💛', '🌸', '✨'];

export function burst(x, y, n = 9) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.textContent = GLYPHS[randi(0, GLYPHS.length - 1)];
    const dx = rand(-90, 90), dy = rand(-130, -50), rot = rand(-70, 70), sc = rand(.6, 1.25);
    Object.assign(s.style, {
      position: 'fixed', left: x + 'px', top: y + 'px', zIndex: 140,
      fontSize: rand(13, 26) + 'px', pointerEvents: 'none',
      transform: 'translate(-50%,-50%) scale(.4)', opacity: '0',
      transition: `transform ${rand(.7, 1.2)}s cubic-bezier(.22,.61,.36,1), opacity .9s ease-out`,
      willChange: 'transform,opacity',
    });
    document.body.append(s);
    requestAnimationFrame(() => {
      s.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rot}deg) scale(${sc})`;
      s.style.opacity = '1';
      setTimeout(() => { s.style.opacity = '0'; }, 420);
    });
    setTimeout(() => s.remove(), 1500);
  }
}

export const burstAt = (ev, n) => {
  const e = ev.touches?.[0] || ev.changedTouches?.[0] || ev;
  burst(e.clientX ?? innerWidth / 2, e.clientY ?? innerHeight / 2, n);
};

export function confetti(n = 46) {
  const rect = { x: innerWidth / 2, y: innerHeight * .35 };
  for (let i = 0; i < n; i++) {
    setTimeout(() => burst(rect.x + rand(-140, 140), rect.y + rand(-60, 60), 2), i * 22);
  }
}

/* ══════════════════════════════════════════════════════════
   MUSIC — an mp3 if present, otherwise a generated lullaby
   ══════════════════════════════════════════════════════════ */
export function createMusic(config = {}) {
  const file = config.file || 'audio/theme.mp3';
  let audio = null, ctx = null, master = null, loop = null, on = false, mode = null;

  // A slow, warm progression. Frequencies in Hz (F major-ish, gentle).
  const CHORDS = [
    [174.6, 220.0, 261.6],   // F  A  C
    [146.8, 220.0, 293.7],   // D  A  D
    [130.8, 196.0, 261.6],   // C  G  C
    [155.6, 233.1, 311.1],   // Eb Bb Eb
  ];
  const MELODY = [523.3, 587.3, 698.5, 587.3, 523.3, 440.0, 523.3, 659.3];

  function ensureCtx() {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (!master) {
      master = ctx.createGain();
      master.gain.value = 0;
      const verb = ctx.createConvolver();
      const len = ctx.sampleRate * 2.2;
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      verb.buffer = buf;
      const wet = ctx.createGain(); wet.gain.value = .3;
      master.connect(ctx.destination);
      master.connect(wet); wet.connect(verb); verb.connect(ctx.destination);
    }
    return ctx;
  }

  function voice(freq, t, dur, gain, type = 'sine') {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1800;
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * .22);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + .05);
  }

  let step = 0;
  function schedule() {
    const t = ctx.currentTime + .05;
    const chord = CHORDS[step % CHORDS.length];
    chord.forEach((f, i) => voice(f, t, 3.6, .055 - i * .008, 'sine'));
    voice(MELODY[step % MELODY.length], t + .18, 1.5, .035, 'triangle');
    if (step % 2 === 1) voice(MELODY[(step + 3) % MELODY.length], t + 1.7, 1.2, .022, 'triangle');
    step++;
  }

  async function start() {
    // Try the real file first.
    if (mode !== 'gen') {
      audio ||= Object.assign(new Audio(file), { loop: true, volume: 0, preload: 'none' });
      try {
        audio.preload = 'auto';
        await audio.play();
        mode = 'file';
        let v = 0;
        const fade = setInterval(() => { v = Math.min(.42, v + .03); audio.volume = v; if (v >= .42) clearInterval(fade); }, 90);
        on = true;
        return true;
      } catch { mode = 'gen'; }
    }
    // Fall back to the generated lullaby.
    if (config.generatedFallback === false) return false;
    ensureCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(.9, ctx.currentTime + 1.6);
    schedule();
    loop = setInterval(schedule, 3400);
    on = true;
    return true;
  }

  function stop() {
    on = false;
    if (mode === 'file' && audio) {
      let v = audio.volume;
      const fade = setInterval(() => { v = Math.max(0, v - .04); audio.volume = v; if (v <= 0) { audio.pause(); clearInterval(fade); } }, 70);
    }
    if (loop) { clearInterval(loop); loop = null; }
    if (master && ctx) master.gain.linearRampToValueAtTime(0, ctx.currentTime + .8);
  }

  return {
    get on() { return on; },
    toggle: async () => (on ? (stop(), false) : await start()),
    start, stop,
  };
}
