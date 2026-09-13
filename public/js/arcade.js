/**
 * Game host.
 *
 * Games aren't in one arcade block any more — each one gets its own band
 * between two content sections (the `[data-game-slot]` elements in index.html).
 * GAMES[i] from games/index.js is mounted into slot i, so the registry order
 * is the page order.
 *
 * ─── ADDING A GAME NEXT YEAR ──────────────────────────────────
 *   1. create public/js/games/my-game.js exporting a manifest
 *   2. import it in public/js/games/index.js and add it to GAMES
 *   3. add one more <section class="section section--play" data-game-slot="N">
 *      band to index.html wherever you want it in the scroll
 *   4. (optional) add a reward line in content/letters.json → unlockables
 * ──────────────────────────────────────────────────────────────
 */
import { $, $$, el, nf, toast } from './util.js';
import { burst, burstAt, confetti } from './fx.js';
import api, { local } from './api.js';
import { GAMES } from './games/index.js';

let ctxData = null;
let unlocks = new Set();
let unlockables = {};
let best = {};
let activeCleanup = null;

/* ─────────── reveal overlay ─────────── */
export function showReveal(text) {
  const box = $('#reveal');
  $('#reveal-text').textContent = text;
  box.hidden = false;
  document.body.classList.add('is-locked');
}
function hideReveal() {
  $('#reveal').hidden = true;
  if ($('#modal').hidden) document.body.classList.remove('is-locked');
}

/* ─────────── modal host ─────────── */
function openModal(title) {
  $('#modal-title').textContent = title;
  $('#modal-body').replaceChildren();
  $('#modal').hidden = false;
  document.body.classList.add('is-locked');
  return $('#modal-body');
}
function closeModal() {
  try { activeCleanup?.(); } catch (e) { console.warn(e); }
  activeCleanup = null;
  $('#modal').hidden = true;
  $('#modal-body').replaceChildren();
  document.body.classList.remove('is-locked');
}

/* ─────────── score line ─────────── */
function scoreLine(g) {
  const b = best[g.id];
  const v = typeof b === 'object' ? b?.best : b;
  if (v === undefined || v === null) return 'belum pernah dimainin';
  return g.scoreLabel ? g.scoreLabel(v) : `skor terbaik ${nf.format(v)}`;
}

/* ─────────── one band per game ─────────── */
function paintBand(g, slot) {
  const root = slot.querySelector('[data-play-root]');
  if (!root) return;
  const done = unlocks.has(g.id);
  slot.style.setProperty('--g-tint', g.tint || 'rgba(224,82,109,.3)');
  slot.classList.toggle('is-done', done);

  root.replaceChildren(
    el('p', { class: 'play__eyebrow', text: done ? 'kebuka' : 'sela — main dulu' }),
    el('span', { class: 'play__icon', text: g.icon }),
    el('h2', { class: 'play__name', text: g.name }),
    el('p', { class: 'play__desc', text: g.desc }),
    el('button', {
      class: 'btn btn--primary play__btn',
      text: done ? 'Main lagi' : 'Main',
      onclick: (e) => { burstAt(e, 5); launch(g); },
    }),
    el('p', { class: 'play__best', text: scoreLine(g) }),
    done && unlockables[g.id]
      ? el('blockquote', { class: 'play__note' }, unlockables[g.id])
      : null
  );
}

function paintAll() {
  const slots = $$('[data-game-slot]');
  GAMES.forEach((g, i) => {
    const slot = slots.find((s) => Number(s.dataset.gameSlot) === i);
    if (slot) paintBand(g, slot);
  });
  const done = GAMES.filter((g) => unlocks.has(g.id)).length;
  const foot = $('#footer-play');
  if (foot) {
    foot.textContent = done === GAMES.length
      ? `semua ${GAMES.length} permainan kebuka — Aby juara 🤍`
      : `${done} dari ${GAMES.length} permainan kebuka`;
  }
}

/* ─────────── the ctx handed to each game ─────────── */
function makeCtx(game, root) {
  const cleanups = [];
  return {
    root,
    data: ctxData,
    api,
    el, toast, burst, burstAt, confetti,
    onCleanup: (fn) => cleanups.push(fn),
    _runCleanups: () => cleanups.forEach((f) => { try { f(); } catch {} }),
    close: closeModal,

    /** Call when the player finishes. Saves the score and opens the reward. */
    async finish({ score = 0, meta = null, message = null, silent = false } = {}) {
      if (game.scoring !== 'none') {
        const res = await api.saveScore(game.id, score, meta);
        if (res?.best) best = { ...best, ...res.best };
        else {
          const prev = best[game.id]?.best ?? -Infinity;
          best[game.id] = { best: Math.max(prev, score), plays: (best[game.id]?.plays || 0) + 1 };
        }
      }
      const first = !unlocks.has(game.id);
      unlocks.add(game.id);
      const res = await api.unlock(game.id, game.name);
      if (res?.reward) unlockables[game.id] = res.reward;
      paintAll();

      if (!silent) {
        confetti(first ? 60 : 24);
        showReveal(message || unlockables[game.id] || 'Aby selesaiin. Marr bangga, serius. 🤍');
      }
      if (GAMES.every((g) => unlocks.has(g.id))) {
        setTimeout(() => {
          confetti(120);
          showReveal('SEMUA KEBUKA.\n\nAby selesaiin semuanya, satu-satu, sampai habis. Persis kayak cara Aby ngejalanin dua tahun ini.\n\nMarr sayang Aby, Bucuk. Sampai ketemu di update tahun depan.');
        }, 3200);
      }
    },
  };
}

/* ─────────── launch ─────────── */
async function launch(game) {
  const root = openModal(game.name);
  root.append(el('p', { class: 'g-loading', text: 'sebentar ya…' }));
  try {
    const ctx = makeCtx(game, root);
    root.replaceChildren();
    await game.mount(ctx);
    activeCleanup = ctx._runCleanups;
  } catch (err) {
    console.error(err);
    root.replaceChildren(el('p', { class: 'g-loading', text: 'Aduh, game-nya ngambek. Coba tutup dan buka lagi ya.' }));
  }
}

/* ─────────── boot ─────────── */
export function initArcade(data) {
  ctxData = data;
  unlockables = { ...(data.unlockables || {}) };
  const localState = local.read();
  unlocks = new Set([...(data.unlocks || []), ...(localState.unlocks || [])]);
  best = { ...(localState.best || {}), ...(data.best || {}) };

  paintAll();

  $('#modal-close')?.addEventListener('click', closeModal);
  $('#modal-scrim')?.addEventListener('click', closeModal);
  $('#reveal-close')?.addEventListener('click', hideReveal);
  $('#reveal')?.addEventListener('click', (e) => { if (e.target === $('#reveal')) hideReveal(); });
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#reveal').hidden) hideReveal();
    else if (!$('#modal').hidden) closeModal();
  });
}

export { closeModal };
