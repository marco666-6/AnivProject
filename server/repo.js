/**
 * Repository layer. Everything the API touches goes through here.
 * Backed by SQLite when available, by plain Maps when it isn't —
 * the routes never need to know which.
 */
import db, { driver } from './db.js';

/* ------------------------------------------------------------------ */
/* in-memory fallback                                                  */
/* ------------------------------------------------------------------ */
const mem = {
  memories: [], photos: [], reasons: [],
  scores: [], unlocks: [], favourites: [], replies: [], visits: new Map(), meta: new Map(),
  seq: 1,
};
const nextId = () => mem.seq++;

const sql = driver === 'sqlite';
const run = (q, ...p) => db.prepare(q).run(...p);
const all = (q, ...p) => db.prepare(q).all(...p);
const one = (q, ...p) => db.prepare(q).get(...p);

/* ------------------------------------------------------------------ */
/* content                                                             */
/* ------------------------------------------------------------------ */

export const replaceMemories = (rows) => {
  if (!sql) { mem.memories = rows.map((r, i) => ({ id: i + 1, ...r })); return; }
  const tx = db.transaction((list) => {
    db.prepare('DELETE FROM memories').run();
    const ins = db.prepare(`INSERT INTO memories (key,date,icon,title,body,photo,photo_caption,pin,anchor,approx,sort)
                            VALUES (@key,@date,@icon,@title,@body,@photo,@photo_caption,@pin,@anchor,@approx,@sort)`);
    list.forEach((r) => ins.run(r));
  });
  tx(rows);
};

export const replacePhotos = (rows) => {
  if (!sql) { mem.photos = rows.map((r, i) => ({ id: i + 1, ...r })); return; }
  const tx = db.transaction((list) => {
    db.prepare('DELETE FROM photos').run();
    const ins = db.prepare(`INSERT INTO photos (file,slug,date,title,caption,tags,width,height,sort)
                            VALUES (@file,@slug,@date,@title,@caption,@tags,@width,@height,@sort)`);
    list.forEach((r) => ins.run(r));
  });
  tx(rows);
};

export const replaceReasons = (rows) => {
  if (!sql) { mem.reasons = rows.map((r, i) => ({ id: i + 1, ...r })); return; }
  const tx = db.transaction((list) => {
    db.prepare('DELETE FROM reasons').run();
    const ins = db.prepare('INSERT INTO reasons (key,tone,text,sort) VALUES (@key,@tone,@text,@sort)');
    list.forEach((r) => ins.run(r));
  });
  tx(rows);
};

export const getMemories = () =>
  sql ? all('SELECT * FROM memories ORDER BY sort ASC, date ASC') : [...mem.memories];

export const getPhotos = () =>
  sql ? all('SELECT * FROM photos ORDER BY sort ASC') : [...mem.photos];

export const getReasons = () =>
  sql ? all('SELECT * FROM reasons ORDER BY sort ASC') : [...mem.reasons];

/* ------------------------------------------------------------------ */
/* scores                                                              */
/* ------------------------------------------------------------------ */

export const addScore = ({ game, player = 'aby', score, meta = null }) => {
  const row = { game, player, score: Number(score) || 0, meta: meta ? JSON.stringify(meta) : null };
  if (!sql) {
    const r = { id: nextId(), ...row, created_at: new Date().toISOString() };
    mem.scores.push(r);
    return r;
  }
  const info = run('INSERT INTO scores (game,player,score,meta) VALUES (?,?,?,?)',
    row.game, row.player, row.score, row.meta);
  return one('SELECT * FROM scores WHERE id = ?', info.lastInsertRowid);
};

export const topScores = (game, limit = 5) => {
  if (!sql) {
    return mem.scores.filter((s) => s.game === game)
      .sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at))
      .slice(0, limit);
  }
  return all('SELECT * FROM scores WHERE game = ? ORDER BY score DESC, created_at ASC LIMIT ?', game, limit);
};

export const bestScores = () => {
  if (!sql) {
    const out = {};
    mem.scores.forEach((s) => { out[s.game] = Math.max(out[s.game] ?? -Infinity, s.score); });
    return out;
  }
  const rows = all('SELECT game, MAX(score) AS best, COUNT(*) AS plays FROM scores GROUP BY game');
  return Object.fromEntries(rows.map((r) => [r.game, { best: r.best, plays: r.plays }]));
};

/* ------------------------------------------------------------------ */
/* unlocks                                                             */
/* ------------------------------------------------------------------ */

export const addUnlock = (key, label = null) => {
  if (!sql) {
    if (!mem.unlocks.find((u) => u.key === key)) {
      mem.unlocks.push({ id: nextId(), key, label, created_at: new Date().toISOString() });
    }
    return mem.unlocks.find((u) => u.key === key);
  }
  run('INSERT OR IGNORE INTO unlocks (key,label) VALUES (?,?)', key, label);
  return one('SELECT * FROM unlocks WHERE key = ?', key);
};

export const getUnlocks = () =>
  sql ? all('SELECT * FROM unlocks ORDER BY created_at ASC') : [...mem.unlocks];

/* ------------------------------------------------------------------ */
/* favourites                                                          */
/* ------------------------------------------------------------------ */

export const toggleFavourite = (kind, ref) => {
  if (!sql) {
    const i = mem.favourites.findIndex((f) => f.kind === kind && f.ref === ref);
    if (i >= 0) { mem.favourites.splice(i, 1); return { on: false }; }
    mem.favourites.push({ id: nextId(), kind, ref, created_at: new Date().toISOString() });
    return { on: true };
  }
  const hit = one('SELECT id FROM favourites WHERE kind = ? AND ref = ?', kind, ref);
  if (hit) { run('DELETE FROM favourites WHERE id = ?', hit.id); return { on: false }; }
  run('INSERT INTO favourites (kind,ref) VALUES (?,?)', kind, ref);
  return { on: true };
};

export const getFavourites = () =>
  sql ? all('SELECT kind, ref FROM favourites') : mem.favourites.map(({ kind, ref }) => ({ kind, ref }));

/* ------------------------------------------------------------------ */
/* replies (her little guestbook back to him)                          */
/* ------------------------------------------------------------------ */

export const addReply = (body, author = 'aby') => {
  const clean = String(body).slice(0, 2000).trim();
  if (!clean) throw new Error('empty');
  if (!sql) {
    const r = { id: nextId(), author, body: clean, created_at: new Date().toISOString() };
    mem.replies.push(r);
    return r;
  }
  const info = run('INSERT INTO replies (author,body) VALUES (?,?)', author, clean);
  return one('SELECT * FROM replies WHERE id = ?', info.lastInsertRowid);
};

export const getReplies = () =>
  sql ? all('SELECT * FROM replies ORDER BY created_at DESC LIMIT 200') : [...mem.replies].reverse();

/* ------------------------------------------------------------------ */
/* visits + meta                                                       */
/* ------------------------------------------------------------------ */

export const bumpVisit = () => {
  const day = new Date().toISOString().slice(0, 10);
  if (!sql) {
    mem.visits.set(day, (mem.visits.get(day) || 0) + 1);
    let total = 0; mem.visits.forEach((v) => { total += v; });
    return { day, today: mem.visits.get(day), total, days: mem.visits.size };
  }
  run(`INSERT INTO visits (day,count) VALUES (?,1)
       ON CONFLICT(day) DO UPDATE SET count = count + 1`, day);
  const today = one('SELECT count FROM visits WHERE day = ?', day)?.count ?? 1;
  const agg = one('SELECT SUM(count) AS total, COUNT(*) AS days FROM visits');
  return { day, today, total: agg.total, days: agg.days };
};

export const setMeta = (key, value) => {
  if (!sql) { mem.meta.set(key, String(value)); return; }
  run('INSERT INTO meta (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key, String(value));
};

export const getMeta = (key) =>
  sql ? one('SELECT value FROM meta WHERE key = ?', key)?.value ?? null : mem.meta.get(key) ?? null;

export const stats = () => ({
  driver,
  memories: getMemories().length,
  photos: getPhotos().length,
  reasons: getReasons().length,
  unlocks: getUnlocks().length,
  replies: getReplies().length,
});
