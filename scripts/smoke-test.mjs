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

await t('score saves and reads back', async () => {
  await post('/api/scores', { game: 'smoke', score: 42 });
  await post('/api/scores', { game: 'smoke', score: 17 });
  const top = await get('/api/scores/smoke');
  is(top, top[0].score === 42, `expected 42 on top, got ${top[0]?.score}`);
});
await t('every registered game has a reward, and unlock is idempotent', async () => {
  const { GAMES } = await import('../public/js/games/index.js');
  is(GAMES, GAMES.length > 0, 'no games registered');
  for (const g of GAMES) {
    const a = await post('/api/unlocks', { key: g.id });
    is(a, typeof a.reward === 'string' && a.reward.length > 0,
       `no reward text in content/letters.json → unlockables["${g.id}"]`);
    const b = await post('/api/unlocks', { key: g.id });
    is(b, b.unlocks.filter((k) => k === g.id).length === 1, `unlock duplicated for ${g.id}`);
  }
});
await t('every game band in index.html has a game to put in it', async () => {
  const { GAMES } = await import('../public/js/games/index.js');
  const html = await (await fetch(BASE + '/')).text();
  const slots = [...html.matchAll(/data-game-slot="(\d+)"/g)].map((m) => Number(m[1]));
  is(slots, slots.length === GAMES.length,
     `${slots.length} bands in index.html but ${GAMES.length} games registered`);
  GAMES.forEach((g, i) => is(slots, slots.includes(i), `no band for slot ${i} (${g.id})`));
});
await t('punch targets and finale are present', async () => {
  const p = await get('/api/games/punch');
  is(p, p.targets?.length > 0, 'no punch targets');
  is(p, p.targets.every((x) => x.name && x.hp > 0), 'a target is missing name or hp');
  is(p, p.finale?.name && p.finale?.line, 'no finale');
});
await t('future kids reach the page', async () => {
  const d = await get('/api/bootstrap');
  is(d, d.future?.kids?.length >= 2, 'kids missing from bootstrap');
  is(d, d.future.kids.every((k) => k.name && k.meaning && k.line), 'a kid is missing a field');
});
await t('html/css/js are served no-cache so edits actually show up', async () => {
  for (const p of ['/', '/js/main.js', '/css/base.css']) {
    const r = await fetch(BASE + p);
    const cc = r.headers.get('cache-control') || '';
    if (!/no-cache/.test(cc)) throw new Error(`${p} → Cache-Control: ${cc || '(none)'}`);
  }
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
