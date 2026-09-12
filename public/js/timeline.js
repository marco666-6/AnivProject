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
      el('p', { class: 'tl__date', html: `${fmtDate(m.date)}${m.approx ? ' <em>(kira-kira)</em>' : ''}` }),
      el('h3', { class: 'tl__title', text: m.title }),
      el('p', { class: 'tl__body', text: m.body }),
      photo
        ? el('figure', {
            class: 'tl__photo',
            onclick: () => openLightbox(photo.__index),
            title: photo.title,
          }, imgWithFallback(photo, 'thumb'))
        : null
    );
    return node;
  }));
}
