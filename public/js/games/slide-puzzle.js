/** Susun Ulang — a 3×3 sliding photo puzzle. */
import { pick, photoThumb } from '../util.js';

export default {
  id: 'slide-puzzle',
  name: 'Susun Ulang',
  icon: '🧩',
  tint: 'rgba(217,164,65,.32)',
  desc: 'Fotonya berantakan. Geser sampai balik ke tempatnya.',
  scoring: 'low',
  scoreLabel: (v) => `rekor ${v} geseran`,

  async mount(ctx) {
    const { root, data, el: E } = ctx;
    const N = 3;
    const photo = pick(data.photos);
    const src = photoThumb(photo);

    let tiles = [], moves = 0, solved = false;
    const movesEl = E('b', { text: '0' });
    const board = E('div', { class: 'sp-board', style: { '--n': N } });

    root.append(
      E('p', { class: 'g-intro', text: `Ketuk kotak di sebelah yang kosong. Fotonya: "${photo.title}".` }),
      E('div', { class: 'g-hud' },
        E('span', {}, 'Geseran ', movesEl),
        E('span', { class: 'sp-peek' }, E('img', { src, alt: 'contekan', class: 'sp-thumb' }), ' contekan')),
      board,
      E('div', { class: 'g-actions' },
        E('button', { class: 'btn btn--quiet btn--sm', text: 'Acak ulang', onclick: () => start() }))
    );

    const idx = (r, c) => r * N + c;
    const solvable = (arr) => {
      let inv = 0;
      const flat = arr.filter((v) => v !== N * N - 1);
      for (let i = 0; i < flat.length; i++)
        for (let j = i + 1; j < flat.length; j++) if (flat[i] > flat[j]) inv++;
      return inv % 2 === 0; // odd grid width → solvable when inversions are even
    };

    function start() {
      moves = 0; solved = false; movesEl.textContent = '0';
      do {
        tiles = [...Array(N * N).keys()];
        for (let i = tiles.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }
      } while (!solvable(tiles) || tiles.every((v, i) => v === i));
      draw();
    }

    function draw() {
      board.replaceChildren(...tiles.map((val, pos) => {
        const blank = val === N * N - 1;
        const r = Math.floor(val / N), c = val % N;
        const t = E('button', {
          class: `sp-tile${blank ? ' is-blank' : ''}${solved ? ' is-solved' : ''}`,
          style: blank ? {} : {
            backgroundImage: `url("${src}")`,
            backgroundSize: `${N * 100}% ${N * 100}%`,
            backgroundPosition: `${(c / (N - 1)) * 100}% ${(r / (N - 1)) * 100}%`,
          },
        }, blank ? '' : E('span', { class: 'sp-num', text: String(val + 1) }));
        t.addEventListener('click', () => move(pos));
        return t;
      }));
    }

    function move(pos) {
      if (solved) return;
      const blank = tiles.indexOf(N * N - 1);
      const [br, bc] = [Math.floor(blank / N), blank % N];
      const [pr, pc] = [Math.floor(pos / N), pos % N];
      if (Math.abs(br - pr) + Math.abs(bc - pc) !== 1) return;
      [tiles[blank], tiles[pos]] = [tiles[pos], tiles[blank]];
      moves++; movesEl.textContent = moves;
      if (tiles.every((v, i) => v === i)) {
        solved = true;
        draw();
        const b = board.getBoundingClientRect();
        ctx.burst(b.left + b.width / 2, b.top + b.height / 2, 12);
        setTimeout(() => ctx.finish({
          score: moves,
          meta: { photo: photo.file },
          message: `Beres dalam ${moves} geseran.\n\n${data.unlockables?.['slide-puzzle'] || ''}`,
        }), 400);
        return;
      }
      draw();
    }

    start();
  },
};
