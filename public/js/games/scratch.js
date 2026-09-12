/** Gosok Pesan — scratch-off cards hiding notes from content/letters.json. */
import { shuffle } from '../util.js';

export default {
  id: 'scratch',
  name: 'Gosok Pesan',
  icon: '🪙',
  tint: 'rgba(106,53,80,.34)',
  desc: 'Gosok pakai jari. Di bawahnya ada pesan yang aku tulis buat kamu.',
  scoring: 'high',
  scoreLabel: (v) => `${v} pesan digosok`,

  async mount(ctx) {
    const { root, data, el: E } = ctx;
    const notes = shuffle(data.notes?.length ? data.notes : ['Aku sayang kamu 🤍']);
    let i = 0, opened = 0;

    const label = E('p', { class: 'g-intro', text: 'Gosok dengan jari atau mouse. Kalau udah kebaca, tarik kartu berikutnya.' });
    const holder = E('div', { class: 'sc-holder' });
    const counter = E('p', { class: 'sc-count', text: '' });
    const nextBtn = E('button', { class: 'btn btn--primary btn--sm', text: 'Kartu berikutnya', onclick: () => card() });
    const revealBtn = E('button', { class: 'btn btn--quiet btn--sm', text: 'Males gosok, buka aja', onclick: () => holder.querySelector('.sc-card')?.dispatchEvent(new CustomEvent('force-open')) });
    root.append(label, holder, E('div', { class: 'g-actions' }, revealBtn, nextBtn), counter);

    function card() {
      const text = notes[i % notes.length];
      i++;
      counter.textContent = `kartu ${i} · ${opened} udah kebuka`;

      const wrap = E('div', { class: 'sc-card' },
        E('p', { class: 'sc-text', text }),
      );
      const cv = E('canvas', { class: 'sc-canvas' });
      wrap.append(cv);
      holder.replaceChildren(wrap);

      const dpr = Math.min(devicePixelRatio || 1, 2);
      const r = wrap.getBoundingClientRect();
      const w = Math.max(240, r.width), h = Math.max(150, r.height);
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      const c = cv.getContext('2d');
      c.scale(dpr, dpr);

      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#e5a9b6'); g.addColorStop(.5, '#d98ca0'); g.addColorStop(1, '#c9788f');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.32)';
      c.font = '600 13px "Plus Jakarta Sans", sans-serif';
      c.textAlign = 'center';
      c.fillText('gosok di sini', w / 2, h / 2 - 6);
      c.font = '22px serif';
      c.fillText('🤍', w / 2, h / 2 + 24);
      c.globalCompositeOperation = 'destination-out';

      let drawing = false, done = false, checked = 0;

      const pos = (e) => {
        const b = cv.getBoundingClientRect();
        const p = e.touches?.[0] || e;
        return { x: p.clientX - b.left, y: p.clientY - b.top };
      };
      const scratch = (e) => {
        if (!drawing || done) return;
        const { x, y } = pos(e);
        c.beginPath(); c.arc(x, y, 22, 0, Math.PI * 2); c.fill();
        if (++checked % 8 === 0) test();
      };
      const coverage = () => {
        const img = c.getImageData(0, 0, cv.width, cv.height).data;
        let clear = 0, total = 0;
        for (let p = 3; p < img.length; p += 4 * 24) { total++; if (img[p] < 40) clear++; }
        return total ? clear / total : 0;
      };
      const test = (loose = false) => { if (coverage() > (loose ? .3 : .45)) reveal(); };
      const reveal = () => {
        if (done) return;
        done = true; opened++;
        wrap.classList.add('is-open');
        counter.textContent = `kartu ${i} · ${opened} udah kebuka`;
        const b = wrap.getBoundingClientRect();
        ctx.burst(b.left + b.width / 2, b.top + b.height / 2, 8);
        ctx.finish({ score: opened, silent: opened > 1 });
      };

      wrap.addEventListener('force-open', () => reveal());
      const down = (e) => { drawing = true; scratch(e); };
      const up = () => { if (!drawing) return; drawing = false; if (!done) test(true); };
      cv.addEventListener('pointerdown', down);
      cv.addEventListener('pointermove', scratch);
      addEventListener('pointerup', up);
      cv.addEventListener('touchmove', (e) => { e.preventDefault(); scratch(e); }, { passive: false });
      ctx.onCleanup(() => removeEventListener('pointerup', up));
    }

    card();
  },
};
