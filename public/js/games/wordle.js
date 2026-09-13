/** Tebak Kata — a word-guess game. The answer is checked server-side, length varies. */
import api from '../api.js';

const ROWS = 6;

export default {
  id: 'wordle',
  name: 'Tebak Kata',
  icon: '🔤',
  tint: 'rgba(127,183,164,.32)',
  desc: 'Satu kata per hari, semuanya nyambung ke kita. Enam kesempatan buat Aby.',
  scoring: 'low',
  scoreLabel: (v) => `ketebak di percobaan ke-${v}`,

  async mount(ctx) {
    const { root, el: E } = ctx;
    const puzzle = await api.wordle();
    if (!puzzle) { root.append(E('p', { class: 'g-loading', text: 'Belum ada katanya.' })); return; }

    const LEN = puzzle.length;
    let row = 0, cur = '', done = false;
    const marksByLetter = {};

    const grid = E('div', { class: 'wd-grid', style: { '--len': LEN } });
    const hint = E('p', { class: 'wd-hint', text: '' });
    const kb = E('div', { class: 'wd-kb' });
    const msg = E('p', { class: 'wd-msg' });

    root.append(
      E('p', { class: 'g-intro', text: `${LEN} huruf, ${ROWS} percobaan. Kata hari ini ganti tiap hari.` }),
      grid, msg, hint, kb
    );

    const cells = [];
    for (let r = 0; r < ROWS; r++) {
      const line = [];
      const rowEl = E('div', { class: 'wd-row' });
      for (let i = 0; i < LEN; i++) {
        const cell = E('div', { class: 'wd-cell' });
        line.push(cell); rowEl.append(cell);
      }
      cells.push(line); grid.append(rowEl);
    }

    const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', '↵ZXCVBNM⌫'];
    const keyEls = {};
    KEYS.forEach((r) => {
      const rowEl = E('div', { class: 'wd-kbrow' });
      [...r].forEach((k) => {
        const b = E('button', { class: `wd-key${k === '↵' || k === '⌫' ? ' wd-key--wide' : ''}`, text: k });
        b.addEventListener('click', () => press(k === '↵' ? 'Enter' : k === '⌫' ? 'Backspace' : k));
        keyEls[k] = b; rowEl.append(b);
      });
      kb.append(rowEl);
    });

    function paint() {
      cells[row]?.forEach((c, i) => {
        c.textContent = cur[i] || '';
        c.classList.toggle('is-filled', !!cur[i]);
      });
    }

    async function submit() {
      if (cur.length !== LEN) { shake(); msg.textContent = `harus ${LEN} huruf`; return; }
      let res;
      try { res = await api.wordleCheck(puzzle.token, cur); }
      catch { msg.textContent = 'gagal ngecek, coba lagi'; return; }

      res.marks.forEach((m, i) => {
        setTimeout(() => {
          cells[row][i].classList.add(`is-${m}`, 'is-flip');
          const ch = cur[i];
          const rank = { correct: 3, present: 2, absent: 1 };
          if ((rank[m] || 0) > (rank[marksByLetter[ch]] || 0)) {
            marksByLetter[ch] = m;
            keyEls[ch]?.classList.remove('is-correct', 'is-present', 'is-absent');
            keyEls[ch]?.classList.add(`is-${m}`);
          }
        }, i * 130);
      });

      const attempt = row + 1;
      if (res.win) {
        done = true;
        setTimeout(() => {
          const r = grid.getBoundingClientRect();
          ctx.burst(r.left + r.width / 2, r.top + r.height / 2, 12);
          msg.textContent = ['telak!', 'gila cepet', 'mantap', 'pas banget', 'hampir aja', 'nyaris'][row] || 'kena!';
          ctx.finish({ score: attempt, meta: { word: res.answer }, message: res.reward });
        }, LEN * 130 + 250);
        return;
      }

      row++; cur = '';
      if (row >= ROWS) {
        done = true;
        setTimeout(() => {
          msg.textContent = 'kehabisan percobaan 😔';
          ctx.finish({ score: ROWS + 1, silent: false, message: 'Nggak ketebak hari ini — nggak apa-apa, Buk.\n\nBesok katanya ganti. Balik lagi ya. 🤍' });
        }, LEN * 130 + 250);
        return;
      }
      if (row === 2) hint.textContent = `bocoran: ${puzzle.hint}`;
      msg.textContent = '';
    }

    function shake() {
      const r = grid.children[row];
      r.classList.add('is-shake');
      setTimeout(() => r.classList.remove('is-shake'), 420);
    }

    function press(key) {
      if (done) return;
      if (key === 'Enter') return submit();
      if (key === 'Backspace') { cur = cur.slice(0, -1); return paint(); }
      if (/^[a-zA-Z]$/.test(key) && cur.length < LEN) { cur += key.toUpperCase(); paint(); }
    }

    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === 'Backspace' || /^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); press(e.key); }
    };
    addEventListener('keydown', onKey);
    ctx.onCleanup(() => removeEventListener('keydown', onKey));
  },
};
