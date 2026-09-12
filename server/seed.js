/**
 * Mirrors content/*.json into the DB.
 * Runs automatically on boot. Content tables are replaced; state tables are untouched.
 */
import { loadContent, loadManifest } from './content.js';
import * as repo from './repo.js';

const slugify = (name) =>
  name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function seed({ quiet = false } = {}) {
  const c = loadContent();
  const manifest = loadManifest();

  const memories = (c.memories.entries || []).map((e, i) => ({
    key: e.key || `${e.date}-${slugify(e.title || String(i))}`,
    date: e.date,
    icon: e.icon || '•',
    title: e.title || '',
    body: e.body || '',
    photo: e.photo || null,
    pin: e.pin ? 1 : 0,
    anchor: e.anchor ? 1 : 0,
    approx: e.approx ? 1 : 0,
    sort: i,
  }));

  const photos = (c.gallery.photos || []).map((p, i) => {
    const m = manifest[p.file] || {};
    return {
      file: p.file,
      slug: m.slug || slugify(p.file),
      date: p.date || null,
      title: p.title || '',
      caption: p.caption || '',
      tags: JSON.stringify(p.tags || []),
      width: m.w || null,
      height: m.h || null,
      sort: i,
    };
  });

  const reasons = (c.reasons.reasons || []).map((r, i) => ({
    key: r.key || `r${i}-${(r.text || '').slice(0, 24).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    tone: r.tone || 'soft',
    text: r.text || '',
    sort: i,
  }));

  repo.replaceMemories(memories);
  repo.replacePhotos(photos);
  repo.replaceReasons(reasons);
  repo.setMeta('seeded_at', new Date().toISOString());

  if (!quiet) {
    console.log(`[seed] ${memories.length} memories · ${photos.length} photos · ${reasons.length} reasons`);
  }
  return { memories: memories.length, photos: photos.length, reasons: reasons.length };
}

// `npm run seed`
if (process.argv[1] && process.argv[1].endsWith('seed.js')) seed();
