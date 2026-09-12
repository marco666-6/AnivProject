/**
 * Regenerates images/_web (1400px) and images/_thumb (640px) plus _manifest.json.
 *
 *   npm run images
 *
 * Run this after dropping new photos into images/. Safe to re-run — it skips
 * files that are already up to date.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'images');
const WEB = path.join(SRC, '_web');
const THUMB = path.join(SRC, '_thumb');
const MANIFEST = path.join(SRC, '_manifest.json');

const EXT = /\.(jpe?g|png|webp|avif|heic|gif)$/i;
const slug = (n) => n.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error(`
  ✗ sharp isn't installed, so images can't be resized.

    npm install sharp

  The site still works without this — it falls back to the original files,
  they're just heavier on a phone.
`);
  process.exit(1);
}

fs.mkdirSync(WEB, { recursive: true });
fs.mkdirSync(THUMB, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => EXT.test(f) && !f.startsWith('_') && !f.startsWith('.'));
if (!files.length) { console.log('No photos in images/ yet.'); process.exit(0); }

const manifest = {};
let made = 0, skipped = 0;

for (const file of files) {
  const s = slug(file);
  const src = path.join(SRC, file);
  const webOut = path.join(WEB, `${s}.jpg`);
  const thumbOut = path.join(THUMB, `${s}.jpg`);
  const srcTime = fs.statSync(src).mtimeMs;

  const fresh = (p) => fs.existsSync(p) && fs.statSync(p).mtimeMs >= srcTime;

  if (fresh(webOut) && fresh(thumbOut)) {
    const meta = await sharp(webOut).metadata();
    manifest[file] = { slug: s, w: meta.width, h: meta.height };
    skipped++;
    continue;
  }

  const base = sharp(src).rotate(); // honour EXIF orientation
  const info = await base.clone().resize(1400, 1400, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, progressive: true, mozjpeg: true }).toFile(webOut);
  await base.clone().resize(640, 640, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 78, progressive: true, mozjpeg: true }).toFile(thumbOut);

  manifest[file] = { slug: s, w: info.width, h: info.height };
  made++;
  console.log(`  ✓ ${file}  →  _web/${s}.jpg (${Math.round(info.size / 1024)} KB)`);
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(`\n  ${made} generated, ${skipped} already current. Manifest: ${files.length} photos.`);
console.log(`  Now add the new filenames to content/gallery.json and restart.\n`);
