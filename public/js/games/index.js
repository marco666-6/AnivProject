/**
 * The game registry.
 *
 * ADDING A GAME:  write public/js/games/<name>.js exporting a default manifest,
 *                 import it below, and drop it in the GAMES array.
 *
 * REMOVING ONE:   take it out of the array. The file can stay on disk.
 *                 (memory-match, quiz, adventure, slide-puzzle and wordle are
 *                  parked below — put one back in the array any year you want it.)
 *
 * ORDER MATTERS:  GAMES[i] is mounted into the i-th [data-game] band in
 *                 index.html, so the array order is the page order.
 *
 * MANIFEST SHAPE:
 *   {
 *     id:         'my-game',              // also the key in content/letters.json → unlockables
 *     name:       'Nama Game',
 *     icon:       '🎮',
 *     tint:       'rgba(r,g,b,a)',        // band glow
 *     desc:       'satu kalimat',
 *     scoring:    'high' | 'low' | 'none',
 *     scoreLabel: (v) => `rekor ${v}`,
 *     async mount(ctx) { ... }            // ctx: { root, data, el, burst, toast, finish, onCleanup, close }
 *   }
 *
 * Call ctx.finish({ score, meta, message }) when the player completes a run —
 * that saves the score, unlocks the reward, and fires the celebration.
 */
import catchHearts   from './catch-hearts.js';
import constellation from './constellation.js';
import punchTheEx    from './punch-the-ex.js';
import scratch       from './scratch.js';
import runner        from './runner.js';

/* ── parked, not on the page right now ──────────────────────────────────
import memoryMatch from './memory-match.js';
import quiz        from './quiz.js';
import adventure   from './adventure.js';
import slidePuzzle from './slide-puzzle.js';
import wordle      from './wordle.js';
──────────────────────────────────────────────────────────────────────── */

export const GAMES = [
  catchHearts,     // after Cerita
  constellation,   // after Foto
  punchTheEx,      // after Alasan
  scratch,         // after Nanti
  runner,          // after Surat
];

export default GAMES;
