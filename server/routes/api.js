import express from 'express';
import * as repo from '../repo.js';
import { content, refresh } from '../content.js';
import { seed } from '../seed.js';

const r = express.Router();
const ok = (res, data) => res.json({ ok: true, data });
const bad = (res, code, msg) => res.status(code).json({ ok: false, error: msg });

/* ---------- bootstrap: one call, everything the page needs ---------- */
r.get('/bootstrap', (req, res) => {
  const c = content();
  ok(res, {
    config: c.config,
    memories: repo.getMemories(),
    photos: repo.getPhotos(),
    reasons: repo.getReasons(),
    letter: c.letters.main,
    future: c.config.future || null,
    notes: c.letters.notes,
    unlockables: c.letters.unlockables,
    unlocks: repo.getUnlocks().map((u) => u.key),
    favourites: repo.getFavourites(),
    best: repo.bestScores(),
    visit: repo.bumpVisit(),
    serverTime: new Date().toISOString(),
  });
});

/* ---------- content slices ---------- */
r.get('/config',    (_q, s) => ok(s, content().config));
r.get('/memories',  (_q, s) => ok(s, repo.getMemories()));
r.get('/photos',    (_q, s) => ok(s, repo.getPhotos()));
r.get('/reasons',   (_q, s) => ok(s, repo.getReasons()));
r.get('/letter',    (_q, s) => ok(s, content().letters.main));
r.get('/notes',     (_q, s) => ok(s, content().letters.notes));

/* ---------- game data ---------- */
r.get('/games/quiz',      (_q, s) => ok(s, content().quiz.questions));
r.get('/games/adventure', (_q, s) => ok(s, content().adventure));
r.get('/games/punch',     (_q, s) => ok(s, content().punch));
r.get('/games/wordle',    (_q, s) => {
  // Pick a word from the day so it's stable for 24h but changes daily.
  const words = content().wordle.words;
  if (!words.length) return ok(s, null);
  const day = Math.floor(Date.now() / 86400000);
  const pick = words[day % words.length];
  return ok(s, { length: pick.w.length, hint: pick.hint, token: Buffer.from(pick.w).toString('base64') });
});
r.post('/games/wordle/check', (req, res) => {
  const { token, guess } = req.body || {};
  if (!token || !guess) return bad(res, 400, 'token and guess required');
  let answer;
  try { answer = Buffer.from(token, 'base64').toString('utf8'); } catch { return bad(res, 400, 'bad token'); }
  const g = String(guess).toUpperCase();
  if (g.length !== answer.length) return bad(res, 400, 'wrong length');

  const marks = Array(g.length).fill('absent');
  const pool = {};
  [...answer].forEach((ch, i) => { if (g[i] === ch) marks[i] = 'correct'; else pool[ch] = (pool[ch] || 0) + 1; });
  [...g].forEach((ch, i) => {
    if (marks[i] === 'correct') return;
    if (pool[ch] > 0) { marks[i] = 'present'; pool[ch] -= 1; }
  });

  const win = marks.every((m) => m === 'correct');
  const entry = content().wordle.words.find((w) => w.w === answer);
  ok(res, { marks, win, answer: win ? answer : undefined, reward: win ? entry?.reward : undefined });
});

/* ---------- scores ---------- */
r.post('/scores', (req, res) => {
  const { game, score, meta, player } = req.body || {};
  if (!game || score === undefined) return bad(res, 400, 'game and score required');
  const row = repo.addScore({ game, score, meta, player });
  ok(res, { saved: row, top: repo.topScores(game, 5), best: repo.bestScores() });
});
r.get('/scores/:game', (req, res) => ok(res, repo.topScores(req.params.game, Number(req.query.limit) || 5)));
r.get('/scores',       (_q, s) => ok(s, repo.bestScores()));

/* ---------- unlocks ---------- */
r.post('/unlocks', (req, res) => {
  const { key, label } = req.body || {};
  if (!key) return bad(res, 400, 'key required');
  repo.addUnlock(key, label);
  const reward = content().letters.unlockables?.[key] || null;
  ok(res, { unlocks: repo.getUnlocks().map((u) => u.key), reward });
});
r.get('/unlocks', (_q, s) => ok(s, repo.getUnlocks()));

/* ---------- favourites ---------- */
r.post('/favourites', (req, res) => {
  const { kind, ref } = req.body || {};
  if (!kind || !ref) return bad(res, 400, 'kind and ref required');
  ok(res, { ...repo.toggleFavourite(kind, ref), all: repo.getFavourites() });
});
r.get('/favourites', (_q, s) => ok(s, repo.getFavourites()));

/* ---------- her replies ---------- */
r.post('/replies', (req, res) => {
  try { ok(res, repo.addReply(req.body?.body, req.body?.author)); }
  catch { bad(res, 400, 'body required'); }
});
r.get('/replies', (_q, s) => ok(s, repo.getReplies()));

/* ---------- housekeeping ---------- */
r.get('/health', (_q, s) => ok(s, { up: true, ...repo.stats() }));
r.post('/reload', (_q, s) => { refresh(); const n = seed({ quiet: true }); ok(s, n); });

export default r;
