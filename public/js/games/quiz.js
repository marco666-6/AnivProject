/** Kuis Kita — questions about their own history, straight from content/quiz.json. */
import { shuffle } from '../util.js';
import api from '../api.js';

export default {
  id: 'quiz',
  name: 'Kuis Kita',
  icon: '💌',
  tint: 'rgba(217,164,65,.34)',
  desc: 'Seberapa inget kamu sama cerita kita? Jujur-jujuran.',
  scoring: 'high',
  scoreLabel: (v) => `benar terbanyak: ${v}`,

  async mount(ctx) {
    const { root, el: E } = ctx;
    const all = await api.quiz();
    if (!all?.length) { root.append(E('p', { class: 'g-loading', text: 'Belum ada soal.' })); return; }

    const qs = shuffle(all).slice(0, Math.min(8, all.length));
    let idx = 0, score = 0, answered = false;

    const bar = E('span');
    const head = E('div', { class: 'g-hud' },
      E('span', {}, 'Soal ', E('b', { id: 'qz-n', text: '1' }), `/${qs.length}`),
      E('span', {}, 'Benar ', E('b', { id: 'qz-s', text: '0' }))
    );
    const prog = E('div', { class: 'g-bar' }, bar);
    const stage = E('div', { class: 'qz' });
    root.append(head, prog, stage);

    function paint() {
      const q = qs[idx];
      answered = false;
      bar.style.width = `${(idx / qs.length) * 100}%`;
      document.getElementById('qz-n').textContent = idx + 1;

      const opts = q.options.map((text, i) => {
        const b = E('button', { class: 'qz-opt', text });
        b.addEventListener('click', () => choose(i, b, opts));
        return b;
      });

      stage.replaceChildren(
        E('p', { class: 'qz-q', text: q.q }),
        E('div', { class: 'qz-opts' }, opts),
        E('div', { class: 'qz-note', id: 'qz-note' })
      );
    }

    function choose(i, btn, opts) {
      if (answered) return;
      answered = true;
      const q = qs[idx];
      const right = i === q.a;
      if (right) { score++; document.getElementById('qz-s').textContent = score; }
      opts.forEach((b, k) => {
        b.disabled = true;
        if (k === q.a) b.classList.add('is-right');
        else if (k === i) b.classList.add('is-wrong');
      });
      if (right) {
        const r = btn.getBoundingClientRect();
        ctx.burst(r.left + r.width / 2, r.top + r.height / 2, 5);
      }
      const note = document.getElementById('qz-note');
      note.textContent = q.note || '';
      note.classList.add('is-on');
      note.append(E('button', {
        class: 'btn btn--primary btn--sm',
        text: idx === qs.length - 1 ? 'Lihat hasil' : 'Lanjut →',
        onclick: () => { idx++; idx < qs.length ? paint() : done(); },
      }));
      // make sure the explanation + next button are actually on screen
      requestAnimationFrame(() => note.scrollIntoView({ behavior: 'smooth', block: 'end' }));
    }

    function done() {
      bar.style.width = '100%';
      const pct = Math.round((score / qs.length) * 100);
      const verdict =
        pct === 100 ? 'Sempurna. Kamu nyimpen semuanya, sama kayak aku.' :
        pct >= 75 ? 'Hampir semua bener. Kepala kamu isinya kita juga ternyata.' :
        pct >= 50 ? 'Lumayan! Sisanya biar aku yang inget buat kamu.' :
                    'Nggak apa-apa. Yang penting orangnya masih di sini.';
      stage.replaceChildren(
        E('div', { class: 'qz-done' },
          E('p', { class: 'qz-score', text: `${score}/${qs.length}` }),
          E('p', { class: 'qz-verdict', text: verdict }),
          E('button', { class: 'btn btn--quiet btn--sm', text: 'Main lagi', onclick: () => { idx = 0; score = 0; document.getElementById('qz-s').textContent = '0'; paint(); } })
        )
      );
      ctx.finish({ score, meta: { total: qs.length } });
    }

    paint();
  },
};
