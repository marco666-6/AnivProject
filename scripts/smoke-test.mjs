/** Minimal end-to-end check against a running server. `npm run smoke` */
const BASE = process.env.BASE || 'http://localhost:3000';
let pass = 0, fail = 0;

const t = async (name, fn) => {
  try { await fn(); console.log(`  ✓ ${name}`); pass++; }
  catch (e) { console.log(`  ✗ ${name} — ${e.message}`); fail++; }
};
const get = async (p) => {
  const r = await fetch(BASE + p);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || `status ${r.status}`);
  return j.data;
};
const post = async (p, body) => {
  const r = await fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || `status ${r.status}`);
  return j.data;
};
const is = (a, b, m) => { if (!b) throw new Error(m || `expected truthy, got ${JSON.stringify(a)}`); };

console.log(`\n  smoke test → ${BASE}\n`);

await t('health', async () => { const d = await get('/api/health'); is(d, d.up); });
await t('bootstrap has config/photos/memories/reasons', async () => {
  const d = await get('/api/bootstrap');
  is(d, d.config?.people?.her?.name, 'no her name');
  is(d, d.photos.length > 0, 'no photos');
  is(d, d.memories.length > 0, 'no memories');
  is(d, d.reasons.length > 0, 'no reasons');
  is(d, d.letter?.paragraphs?.length > 0, 'no letter');
  is(d, d.notes.length > 0, 'no notes');
});
await t('photos carry slugs for optimised files', async () => {
  const p = await get('/api/photos');
  is(p, p.every((x) => x.slug), 'a photo is missing its slug');
});
await t('quiz questions', async () => { const q = await get('/api/games/quiz'); is(q, q.length >= 5); });
await t('adventure reachable from start', async () => {
  const a = await get('/api/games/adventure');
  is(a, a.nodes[a.start], 'start node missing');
  const seen = new Set(), stack = [a.start];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    const n = a.nodes[id];
    is(a, n, `node "${id}" referenced but not defined`);
    (n.choices || []).forEach((c) => stack.push(c.to));
    if (!n.end && !(n.choices || []).length) throw new Error(`node "${id}" is a dead end`);
  }
});
await t('wordle serves a puzzle and grades a guess', async () => {
  const w = await get('/api/games/wordle');
  is(w, w.length >= 4 && w.token);
  const answer = Buffer.from(w.token, 'base64').toString();
  const r = await post('/api/games/wordle/check', { token: w.token, guess: answer });
  is(r, r.win === true, 'correct answer not accepted');
  is(r, r.marks.every((m) => m === 'correct'));
  const wrong = await post('/api/games/wordle/check', { token: w.token, guess: 'A'.repeat(w.length) });
  is(wrong, wrong.win === false);
});
await t('score saves and reads back', async () => {
  await post('/api/scores', { game: 'smoke', score: 42 });
  await post('/api/scores', { game: 'smoke', score: 17 });
  const top = await get('/api/scores/smoke');
  is(top, top[0].score === 42, `expected 42 on top, got ${top[0]?.score}`);
});
await t('unlock is idempotent and returns the reward', async () => {
  const a = await post('/api/unlocks', { key: 'quiz' });
  const b = await post('/api/unlocks', { key: 'quiz' });
  is(b, b.unlocks.filter((k) => k === 'quiz').length === 1, 'unlock duplicated');
  is(a, typeof a.reward === 'string' && a.reward.length > 0, 'no reward text');
});
await t('favourite toggles on then off', async () => {
  const on = await post('/api/favourites', { kind: 'photo', ref: 'smoke.jpg' });
  is(on, on.on === true);
  const off = await post('/api/favourites', { kind: 'photo', ref: 'smoke.jpg' });
  is(off, off.on === false);
});
await t('reply round-trips', async () => {
  const body = `smoke ${Date.now()}`;
  await post('/api/replies', { body });
  const all = await get('/api/replies');
  is(all, all.some((r) => r.body === body));
});
await t('static: index, css, js, optimised photo', async () => {
  for (const p of ['/', '/css/base.css', '/js/main.js', '/js/games/index.js']) {
    const r = await fetch(BASE + p);
    if (!r.ok) throw new Error(`${p} → ${r.status}`);
  }
  const photos = await get('/api/photos');
  const r = await fetch(`${BASE}/images/_web/${photos[0].slug}.jpg`);
  if (!r.ok) throw new Error(`optimised photo → ${r.status}`);
  const th = await fetch(`${BASE}/images/_thumb/${photos[0].slug}.jpg`);
  if (!th.ok) throw new Error(`thumb → ${th.status}`);
});
await t('unknown route falls through to the app shell', async () => {
  const r = await fetch(`${BASE}/nope`);
  const html = await r.text();
  is(html, html.includes('<title>'), 'no html served');
});

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
