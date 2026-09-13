/** Timeline section. Alternates sides on desktop; taps open the photo. */
import { $, el, fmtDate, imgWithFallback } from './util.js';

export function renderTimeline(memories, photosByFile, openLightbox) {
  const list = $('#timeline-list');
  if (!list) return;

  list.replaceChildren(...memories.map((m, i) => {
    const photo = m.photo ? photosByFile.get(m.photo) : null;
    const node = el('li', {
      class: `tl rise${m.anchor ? ' tl--anchor' : ''}`,
      style: { transitionDelay: `${Math.min(i * 60, 300)}ms` },
    },
      el('div', { class: 'tl__dot', text: m.icon || '•' }),
      el('p', { class: 'tl__date', html: `${fmtDate(m.date) || 'entah kapan'}${m.approx ? ' <em>(kira-kira)</em>' : ''}` }),
      el('h3', { class: 'tl__title', text: m.title }),
      el('p', { class: 'tl__body', text: m.body }),
      photo
        ? el('figure', { class: 'tl__photo' },
            el('button', {
              class: 'tl__photo-btn',
              onclick: () => openLightbox(photo.__index),
              title: photo.title,
              'aria-label': `Buka foto: ${photo.title || ''}`,
            }, imgWithFallback(photo, 'thumb')),
            m.photo_caption
              ? el('figcaption', { class: 'tl__cap' }, m.photo_caption)
              : null
          )
        : null
    );
    return node;
  }));
}
