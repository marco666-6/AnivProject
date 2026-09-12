/** "Alasan aku sayang kamu" — draw-a-card deck plus a full list view. */
import { $, el, shuffle, toast } from './util.js';
import { burstAt } from './fx.js';

const TONE_LABEL = { soft: 'lembut', funny: 'ngakak', deep: 'dalam', tiny: 'receh' };

export function initReasons(reasons) {
  const stage = $('#deck-stage');
  const count = $('#deck-count');
  const list = $('#reasons-list');
  if (!stage) return;

  let bag = shuffle(reasons);
  let drawn = 0;

  const render = (r) => {
    stage.replaceChildren(
      el('div', { class: 'deck__ghost', style: { transform: 'rotate(-3deg) translateY(10px)' } }),
      el('article', { class: `rcard rcard--${r.tone || 'soft'}` },
        el('p', { class: 'rcard__n', text: `alasan #${reasons.indexOf(r) + 1} dari ${reasons.length}` }),
        el('p', { class: 'rcard__t', text: r.text }),
        el('span', { class: 'rcard__tone', text: TONE_LABEL[r.tone] || r.tone || 'lembut' })
      )
    );
    count.textContent = `${drawn} kartu ditarik · ${bag.length} sisa di tumpukan`;
  };

  const draw = (ev) => {
    if (!bag.length) {
      bag = shuffle(reasons);
      toast('tumpukannya diacak ulang 🤍');
    }
    const r = bag.shift();
    drawn++;
    render(r);
    if (ev) burstAt(ev, 5);
  };

  $('#deck-draw')?.addEventListener('click', draw);

  $('#deck-all')?.addEventListener('click', (e) => {
    const showing = !list.hidden;
    if (showing) { list.hidden = true; e.target.textContent = 'Lihat semua'; return; }
    if (!list.childElementCount) {
      list.replaceChildren(...reasons.map((r, i) =>
        el('li', {
          style: { '--tone': `var(--${({ soft: 'rose', funny: 'gold', deep: 'plum', tiny: 'mint' })[r.tone] || 'rose'})`, animationDelay: `${i * 35}ms` },
        },
          el('b', { text: `${String(i + 1).padStart(2, '0')} — ${TONE_LABEL[r.tone] || 'lembut'}` }),
          r.text
        )
      ));
    }
    list.hidden = false;
    e.target.textContent = 'Sembunyikan';
    list.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Start with the reason of the day so it changes every visit-day.
  const dayIdx = Math.floor(Date.now() / 86400000) % reasons.length;
  const first = reasons[dayIdx];
  bag = bag.filter((r) => r !== first);
  drawn = 1;
  render(first);
}
