/** Small shared helpers. */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach((c) => c != null && n.append(c.nodeType ? c : document.createTextNode(c)));
  return n;
};

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const rand  = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Deterministic pick that changes once per day. */
export const daily = (arr, offset = 0) =>
  arr[(Math.floor(Date.now() / 86400000) + offset) % arr.length];

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export const fmtDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
export const fmtShort = (iso) => {
  if (!iso) return '';
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

export const nf = new Intl.NumberFormat('id-ID');

/** Photo URLs: optimised first, original as fallback. */
export const photoSrc = (p, size = 'web') =>
  p.slug ? `/images/_${size}/${p.slug}.jpg` : `/images/${encodeURIComponent(p.file)}`;
export const photoFull = (p) => photoSrc(p, 'web');
export const photoThumb = (p) => photoSrc(p, 'thumb');

/** Attach a graceful fallback to the original file if the optimised one is missing. */
export const imgWithFallback = (p, size = 'thumb', attrs = {}) => {
  const img = el('img', { src: photoSrc(p, size), alt: p.title || '', loading: 'lazy', decoding: 'async', ...attrs });
  img.addEventListener('error', function once() {
    img.removeEventListener('error', once);
    img.src = `/images/${encodeURIComponent(p.file)}`;
  });
  return img;
};

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Observe elements and add .is-in when they scroll into view. */
export const observeRise = (root = document) => {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  $$('.rise:not(.is-in)', root).forEach((n) => io.observe(n));
  return io;
};

let toastTimer;
export const toast = (msg, ms = 2600) => {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
};
