/** The envelope, the letter (typed in gently), and her reply box. */
import { $, el, wait, toast } from './util.js';
import { burstAt, confetti } from './fx.js';
import api from './api.js';

export function initLetter(letter) {
  const env = $('#envelope');
  const body = $('#letter-body');
  const btn = $('#envelope-open');
  if (!env || !body || !letter) return;

  const build = async () => {
    body.replaceChildren(el('h3', { class: 'letter__title', text: letter.title || 'Surat, dari Marr' }));
    body.hidden = false;

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const para of (letter.paragraphs || [])) {
      const p = el('p', { text: reduce ? para : '' });
      body.append(p);
      if (reduce) continue;
      p.classList.add('is-typing');
      // reveal in word chunks — fast enough to read, slow enough to feel written
      const words = para.split(' ');
      for (let i = 0; i < words.length; i += 3) {
        p.textContent = words.slice(0, i + 3).join(' ');
        await wait(34);
      }
      p.textContent = para;
      p.classList.remove('is-typing');
      await wait(120);
    }
    body.append(el('p', { class: 'letter__sig', text: letter.signature || '— Marco' }));
  };

  btn?.addEventListener('click', async (ev) => {
    burstAt(ev, 14);
    env.classList.add('is-open');
    confetti(20);
    await build();
    body.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

export function initReply(initial = []) {
  const form = $('#reply-form');
  const input = $('#reply-input');
  const list = $('#reply-list');
  if (!form) return;

  const draw = (rows) => {
    list.replaceChildren(...rows.map((r) =>
      el('li', {},
        r.body,
        el('time', { text: new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) })
      )
    ));
  };
  draw(initial);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    try {
      await api.addReply(text);
      draw(await api.replies());
      toast('kebaca kok, Buk. makasih 🤍');
      confetti(10);
    } catch {
      toast('gagal kirim — coba lagi ya');
      input.value = text;
    }
  });
}
