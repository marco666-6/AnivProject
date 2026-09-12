/** Gallery grid + lightbox. Long-press (or double-tap) a photo to heart it. */
import { $, el, fmtShort, imgWithFallback, photoFull, toast } from './util.js';
import { burstAt } from './fx.js';
import api from './api.js';

let photos = [];
let favs = new Set();
let cur = 0;

export function renderGallery(list, initialFavs = []) {
  photos = list;
  photos.forEach((p, i) => { p.__index = i; });
  favs = new Set(initialFavs.map((f) => (typeof f === 'string' ? f : `${f.kind}:${f.ref}`)));

  const grid = $('#gallery-grid');
  if (!grid) return;

  grid.replaceChildren(...photos.map((p, i) => {
    const card = el('div', {
      class: `shot rise${favs.has(`photo:${p.file}`) ? ' is-fav' : ''}`,
      style: { transitionDelay: `${Math.min(i * 45, 400)}ms` },
      tabindex: '0',
      role: 'button',
      'aria-label': p.title || p.file,
    },
      imgWithFallback(p, 'thumb'),
      el('span', { class: 'shot__fav', text: '🤍' }),
      el('div', { class: 'shot__veil' },
        el('p', { class: 'shot__t', text: p.title || '' }),
        el('p', { class: 'shot__d', text: fmtShort(p.date) })
      )
    );

    let timer = null, longPressed = false;
    const heart = async (ev) => {
      longPressed = true;
      const on = await api.toggleFavourite('photo', p.file);
      card.classList.toggle('is-fav', on);
      if (on) { burstAt(ev, 7); toast('disimpen 🤍'); }
    };

    card.addEventListener('pointerdown', (ev) => {
      longPressed = false;
      timer = setTimeout(() => heart(ev), 520);
    });
    const cancel = () => clearTimeout(timer);
    card.addEventListener('pointerup', cancel);
    card.addEventListener('pointerleave', cancel);
    card.addEventListener('pointercancel', cancel);

    card.addEventListener('click', () => { if (!longPressed) open(i); });
    card.addEventListener('dblclick', (ev) => heart(ev));
    card.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(i); }
      if (ev.key.toLowerCase() === 'f') heart(ev);
    });

    return card;
  }));
}

/* ─── lightbox ─── */
const box = () => $('#lightbox');

export function open(i) {
  cur = (i + photos.length) % photos.length;
  const p = photos[cur];
  const img = $('#lightbox-img');
  const cap = $('#lightbox-cap');

  img.src = photoFull(p);
  img.onerror = () => { img.onerror = null; img.src = `/images/${encodeURIComponent(p.file)}`; };
  img.alt = p.title || '';
  cap.innerHTML = '';
  cap.append(
    el('b', { text: p.title || '' }),
    el('span', { text: p.caption || '' }),
    el('i', { text: `${fmtShort(p.date)} · ${cur + 1} dari ${photos.length}` })
  );

  box().hidden = false;
  document.body.classList.add('is-locked');
}

export function close() {
  box().hidden = true;
  document.body.classList.remove('is-locked');
}

export const next = () => open(cur + 1);
export const prev = () => open(cur - 1);

export function initLightbox() {
  $('#lightbox-close')?.addEventListener('click', close);
  $('#lightbox-next')?.addEventListener('click', next);
  $('#lightbox-prev')?.addEventListener('click', prev);
  box()?.addEventListener('click', (e) => { if (e.target === box()) close(); });

  addEventListener('keydown', (e) => {
    if (box()?.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  // swipe
  let x0 = null;
  box()?.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  box()?.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 55) (dx < 0 ? next : prev)();
    x0 = null;
  }, { passive: true });
}

export const getPhotos = () => photos;
