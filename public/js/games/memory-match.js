/** Tebak Pasangan — photo memory match using their own pictures. */
import { shuffle, el, imgWithFallback, nf } from '../util.js';

export default {
  id: 'memory-match',
  name: 'Tebak Pasangan',
  icon: '🃏',
  tint: 'rgba(224,82,109,.34)',
  desc: 'Balik kartunya, temuin foto yang sama. Semua foto kita sendiri.',
  scoring: 'low',
  scoreLabel: (v) => `rekor ${v} langkah`,

  async mount(ctx) {
    const { root, data, el: E } = ctx;
    const pool = shuffle(data.photos).slice(0, 6);
    const cards = shuffle([...pool, ...pool].map((p, i) => ({ p, uid: i })));

    let flipped = [], moves = 0, matched = 0, lock = false, t0 = null, timer = null;

    const hud = E('div', { class: 'g-hud' },
      E('span', {}, 'Langkah ', E('b', { id: 'mm-moves', text: '0' })),
      E('span', {}, 'Cocok ', E('b', { id: 'mm-match', text: '0' }), '/6'),
      E('span', {}, '⏱ ', E('b', { id: 'mm-time', text: '0:00' }))
    );

    const board = E('div', { class: 'mm-board' });
    root.append(
      E('p', { class: 'g-intro', text: 'Dua belas kartu, enam pasang. Makin sedikit langkah makin bagus.' }),
      hud, board,
      E('div', { class: 'g-actions' }, E('button', { class: 'btn btn--quiet btn--sm', onclick: () => restart() }, 'Ulang'))
    );

    const tick = () => {
      if (!t0) return;
      const s = Math.floor((Date.now() - t0) / 1000);
      const m = document.getElementById('mm-time');
      if (m) m.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    timer = setInterval(tick, 500);
    ctx.onCleanup(() => clearInterval(timer));

    function restart() {
      const fresh = shuffle([...pool, ...pool].map((p, i) => ({ p, uid: i })));
      cards.length = 0; cards.push(...fresh);
      flipped = []; moves = 0; matched = 0; lock = false; t0 = null;
      document.getElementById('mm-moves').textContent = '0';
      document.getElementById('mm-match').textContent = '0';
      document.getElementById('mm-time').textContent = '0:00';
      draw();
    }

    function draw() {
      board.replaceChildren(...cards.map((c, i) => {
        const tile = E('button', { class: 'mm-card', 'data-i': i, 'aria-label': 'kartu' },
          E('span', { class: 'mm-face mm-face--back', text: '🤍' }),
          E('span', { class: 'mm-face mm-face--front' }, imgWithFallback(c.p, 'thumb'))
        );
        tile.addEventListener('click', () => flip(i, tile));
        return tile;
      }));
    }

    function flip(i, tile) {
      if (lock || tile.classList.contains('is-up') || tile.classList.contains('is-done')) return;
      t0 ||= Date.now();
      tile.classList.add('is-up');
      flipped.push({ i, tile });
      if (flipped.length < 2) return;

      moves++;
      document.getElementById('mm-moves').textContent = moves;
      const [a, b] = flipped;

      if (cards[a.i].p.file === cards[b.i].p.file) {
        matched++;
        document.getElementById('mm-match').textContent = matched;
        [a, b].forEach(({ tile: t }) => t.classList.add('is-done'));
        flipped = [];
        const r = a.tile.getBoundingClientRect();
        ctx.burst(r.left + r.width / 2, r.top + r.height / 2, 5);
        if (matched === 6) {
          clearInterval(timer);
          const secs = Math.floor((Date.now() - t0) / 1000);
          setTimeout(() => ctx.finish({
            score: moves,
            meta: { seconds: secs },
            message: `Selesai dalam ${moves} langkah — ${secs < 60 ? `${secs} detik` : `${Math.floor(secs / 60)} menit ${secs % 60} detik`}.\n\n${ctx.data.unlockables?.['memory-match'] || ''}`,
          }), 520);
        }
      } else {
        lock = true;
        setTimeout(() => {
          a.tile.classList.remove('is-up');
          b.tile.classList.remove('is-up');
          flipped = []; lock = false;
        }, 780);
      }
    }

    draw();
  },
};
