/** The live day counter. Ticks every second, no page reload needed. */
import { $, nf, fmtDate, el } from './util.js';

const MS = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

export function initCounter(config) {
  const startISO = config?.dates?.together || '2024-09-02';
  const start = new Date(`${startISO}T00:00:00`);
  const numEl = $('#days');
  const rowEl = $('#counter-row');
  const sinceEl = $('.counter__since');

  if (sinceEl) {
    sinceEl.innerHTML = `sejak <b>${fmtDate(startISO)}</b> — ${config?.hero?.kicker?.split('—').pop()?.trim() || 'hari aku menyebutmu Indonesiaku'}`;
  }

  // count-up animation on first paint
  let animated = false;
  const animate = (to) => {
    const dur = 1400, t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      numEl.textContent = nf.format(Math.round(to * eased));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const chips = () => {
    const now = new Date();
    const ms = now - start;
    const days = Math.floor(ms / MS.d);

    // whole months + leftover days
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (now.getDate() < start.getDate()) months--;
    const years = Math.floor(months / 12);

    // next anniversary
    const next = new Date(now.getFullYear(), start.getMonth(), start.getDate());
    if (next < now) next.setFullYear(next.getFullYear() + 1);
    const toNext = Math.ceil((next - now) / MS.d);

    const hours = Math.floor(ms / MS.h);
    const mins  = Math.floor((ms % MS.h) / MS.m);
    const secs  = Math.floor((ms % MS.m) / MS.s);

    if (!animated) { animate(days); animated = true; }
    else numEl.textContent = nf.format(days);

    const data = [
      ['tahun', years],
      ['bulan', months],
      ['jam', nf.format(hours)],
      ['menit', nf.format(Math.floor(ms / MS.m))],
      ['detik ini', `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`],
      [toNext === 0 ? 'HARI INI 🎉' : 'hari lagi ke 2 Sept', toNext === 0 ? '' : toNext],
    ];

    rowEl.replaceChildren(...data.map(([label, value]) =>
      el('div', { class: 'counter__chip' },
        value !== '' ? el('b', { text: String(value) }) : null,
        el('span', { text: label }))
    ));
  };

  chips();
  setInterval(chips, 1000);
}

/** Rotating hero line. */
export function initHeroRotate(lines = []) {
  const node = $('#hero-rotate');
  if (!node || !lines.length) return;
  let i = Math.floor(Math.random() * lines.length);
  node.textContent = lines[i];
  setInterval(() => {
    node.classList.add('is-swap');
    setTimeout(() => {
      i = (i + 1) % lines.length;
      node.textContent = lines[i];
      node.classList.remove('is-swap');
    }, 500);
  }, 6200);
}
