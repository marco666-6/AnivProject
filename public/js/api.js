/**
 * Thin API client.
 * Writes go to localStorage FIRST (instant, works offline) and sync to the
 * server best-effort. Reads come from the server, with one retry.
 */

const BASE = '/api';
const LS = 'aniv.v2';

/* ---------- local mirror ---------- */
const blank = () => ({ unlocks: [], favourites: [], best: {}, seen: {}, prefs: {} });

export const local = {
  read() {
    try { return { ...blank(), ...JSON.parse(localStorage.getItem(LS) || '{}') }; }
    catch { return blank(); }
  },
  write(patch) {
    const next = { ...this.read(), ...patch };
    try { localStorage.setItem(LS, JSON.stringify(next)); } catch {}
    return next;
  },
  push(key, value) {
    const s = this.read();
    const arr = Array.isArray(s[key]) ? s[key] : [];
    if (!arr.includes(value)) arr.push(value);
    return this.write({ [key]: arr });
  },
};

/* ---------- transport ---------- */
async function req(path, opts = {}, retry = 1) {
  try {
    const res = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'request failed');
    return json.data;
  } catch (err) {
    if (retry > 0) return req(path, opts, retry - 1);
    throw err;
  }
}

const get  = (p)     => req(p);
const post = (p, b)  => req(p, { method: 'POST', body: b });

/* ---------- public surface ---------- */
export const api = {
  bootstrap: () => get('/bootstrap'),

  quiz:      () => get('/games/quiz'),
  adventure: () => get('/games/adventure'),
  wordle:    () => get('/games/wordle'),
  wordleCheck: (token, guess) => post('/games/wordle/check', { token, guess }),

  /** Save a score. Local best updates immediately; server sync is best-effort. */
  async saveScore(game, score, meta) {
    const s = local.read();
    const prev = s.best?.[game]?.best ?? -Infinity;
    if (score > prev) {
      s.best[game] = { best: score, plays: (s.best[game]?.plays || 0) + 1 };
    } else {
      s.best[game] = { best: prev, plays: (s.best[game]?.plays || 0) + 1 };
    }
    local.write({ best: s.best });
    try { return await post('/scores', { game, score, meta }); }
    catch { return { offline: true, best: s.best }; }
  },

  /** Unlock a reward. Returns the reward text (server copy wins, local cache fallback). */
  async unlock(key, label) {
    local.push('unlocks', key);
    try { return await post('/unlocks', { key, label }); }
    catch { return { offline: true, unlocks: local.read().unlocks, reward: null }; }
  },

  async toggleFavourite(kind, ref) {
    const s = local.read();
    const id = `${kind}:${ref}`;
    const arr = s.favourites || [];
    const i = arr.indexOf(id);
    const on = i < 0;
    if (on) arr.push(id); else arr.splice(i, 1);
    local.write({ favourites: arr });
    try { await post('/favourites', { kind, ref }); } catch {}
    return on;
  },

  replies: () => get('/replies'),
  addReply: (body) => post('/replies', { body }),
};

export default api;
