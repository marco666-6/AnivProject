/** Loads and caches everything in content/. One place that knows the JSON shape. */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './db.js';

const DIR = path.join(ROOT, 'content');
const read = (name, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, `${name}.json`), 'utf8'));
  } catch (e) {
    console.warn(`[content] ${name}.json missing or invalid — using fallback. (${e.message})`);
    return fallback;
  }
};

export const loadContent = () => ({
  config:    read('config',    {}),
  gallery:   read('gallery',   { photos: [] }),
  memories:  read('memories',  { entries: [] }),
  reasons:   read('reasons',   { reasons: [] }),
  quiz:      read('quiz',      { questions: [] }),
  letters:   read('letters',   { main: {}, notes: [], unlockables: {} }),
  adventure: read('adventure', { start: null, nodes: {} }),
  wordle:    read('wordle',    { words: [] }),
});

/** Image manifest produced by `npm run images`. Maps original filename → web/thumb slug. */
export const loadManifest = () => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'images', '_manifest.json'), 'utf8'));
  } catch {
    return {};
  }
};

let cache = null;
export const content = () => (cache ??= loadContent());
export const refresh = () => (cache = loadContent());
