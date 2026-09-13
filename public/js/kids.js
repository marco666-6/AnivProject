/** The "Nanti" section — the two names already picked out. */
import { $, el } from './util.js';
import { burstAt } from './fx.js';

export function renderKids(future) {
  const wrap = $('#kids');
  const note = $('#kids-note');
  if (!wrap || !future?.kids?.length) {
    document.getElementById('nanti')?.setAttribute('hidden', '');
    return;
  }

  wrap.replaceChildren(...future.kids.map((k, i) =>
    el('article', {
      class: `kid kid--${k.gender || 'x'} rise`,
      style: { transitionDelay: `${i * 110}ms` },
      tabindex: '0',
      onclick: (e) => { e.currentTarget.classList.toggle('is-open'); burstAt(e, 5); },
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.classList.toggle('is-open'); } },
    },
      el('p', { class: 'kid__tag', text: k.gender === 'girl' ? 'anak perempuan' : 'anak laki-laki' }),
      el('h3', { class: 'kid__name', text: k.name }),
      el('p', { class: 'kid__call', text: `dipanggil ${k.call}` }),
      el('p', { class: 'kid__meaning' }, el('span', { text: '“' }), k.meaning, el('span', { text: '”' })),
      el('p', { class: 'kid__line', text: k.line }),
      el('span', { class: 'kid__more', text: 'ketuk' })
    )
  ));

  if (note) note.textContent = future.third || '';
}
