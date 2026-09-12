/**
 * Arcade host.
 *
 * ─── ADDING A GAME NEXT YEAR ──────────────────────────────────
 *   1. create public/js/games/my-game.js exporting a manifest
 *   2. add one import line to public/js/games/index.js
 *   3. (optional) add a reward line in content/letters.json → unlockables
 *   Nothing in this file needs to change. Ever.
 * ──────────────────────────────────────────────────────────────
 */
import { $, el, nf, toast } from './util.js';
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

/* ─────────── progress UI ─────────── */
function paintProgress() {
  const total = GAMES.length;
  const done = GAMES.filter((g) => unlocks.has(g.id)).length;
  $('#arcade-bar-fill').style.width = `${(done / total) * 100}%`;
  $('#arcade-progress-text').textContent =
    done === total ? `semua ${total} kebuka — kamu juara 🤍` : `${done} dari ${total} kebuka`;
  GAMES.forEach((g) => {
    const card = document.getElementById(`gcard-${g.id}`);
    if (!card) return;
    card.classList.toggle('is-done', unlocks.has(g.id));
    const badge = card.querySelector('.gcard__badge');
    if (badge) badge.textContent = unlocks.has(g.id) ? '✓ kebuka' : 'belum';
    const bestEl = card.querySelector('.gcard__best');
    if (bestEl) bestEl.textContent = scoreLine(g);
  });
  paintVault();
}

function scoreLine(g) {
  const b = best[g.id];
  if (!b || b.best === undefined || b.best === null) return 'belum pernah dimainin';
  const v = typeof b === 'object' ? b.best : b;
  return g.scoreLabel ? g.scoreLabel(v) : `skor terbaik ${nf.format(v)}`;
}

function paintVault() {
  const list = $('#vault-list');
  const items = GAMES.filter((g) => unlocks.has(g.id));
  if (!items.length) {
    list.replaceChildren(el('p', { class: 'vault__empty', text: 'Belum ada. Main satu game dulu ya 🤍' }));
    return;
  }
  list.replaceChildren(...items.map((g, i) =>
    el('div', { class: 'vnote', style: { animationDelay: `${i * 60}ms` } },
      unlockables[g.id] || 'Kebuka. Tapi pesannya belum ditulis — nanti aku isi.',
      el('small', { text: `dari ${g.name}` })
    )
  ));
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
      paintProgress();

      if (!silent) {
        confetti(first ? 60 : 24);
        showReveal(message || unlockables[game.id] || 'Kamu selesaiin. Aku bangga, serius. 🤍');
      }
      if (GAMES.every((g) => unlocks.has(g.id))) {
        setTimeout(() => {
          confetti(120);
          showReveal('SEMUA KEBUKA.\n\nKamu selesaiin semuanya, satu-satu, sampai habis. Persis kayak cara kamu ngejalanin dua tahun ini.\n\nAku sayang kamu, Bucuk. Sampai ketemu di update tahun depan.');
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

  const grid = $('#arcade-grid');
  grid.replaceChildren(...GAMES.map((g, i) =>
    el('button', {
      class: 'gcard rise',
      id: `gcard-${g.id}`,
      style: { '--g-tint': g.tint || 'rgba(224,82,109,.3)', transitionDelay: `${Math.min(i * 55, 400)}ms` },
      onclick: () => launch(g),
    },
      el('span', { class: 'gcard__icon', text: g.icon }),
      el('h3', { class: 'gcard__name', text: g.name }),
      el('p', { class: 'gcard__desc', text: g.desc }),
      el('div', { class: 'gcard__foot' },
        el('span', { class: 'gcard__best' }),
        el('span', { class: 'gcard__badge' })
      )
    )
  ));

  $('#modal-close')?.addEventListener('click', closeModal);
  $('#modal-scrim')?.addEventListener('click', closeModal);
  $('#reveal-close')?.addEventListener('click', hideReveal);
  $('#reveal')?.addEventListener('click', (e) => { if (e.target === $('#reveal')) hideReveal(); });
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#reveal').hidden) hideReveal();
    else if (!$('#modal').hidden) closeModal();
  });

  paintProgress();
}

export { closeModal };
