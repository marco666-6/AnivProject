/**
 * The game registry.
 *
 * ADDING A GAME:  write public/js/games/<name>.js exporting a default manifest,
 *                 import it below, and drop it in the array. That's the whole job.
 *
 * MANIFEST SHAPE:
 *   {
 *     id:         'my-game',              // also the key in content/letters.json → unlockables
 *     name:       'Nama Game',
 *     icon:       '🎮',
 *     tint:       'rgba(r,g,b,a)',        // card glow
 *     desc:       'satu kalimat',
 *     scoring:    'high' | 'low' | 'none',
 *     scoreLabel: (v) => `rekor ${v}`,
 *     async mount(ctx) { ... }            // ctx: { root, data, el, burst, toast, finish, onCleanup, close }
 *   }
 *
 * Call ctx.finish({ score, meta, message }) when the player completes a run —
 * that saves the score, unlocks the reward, and fires the celebration.
 */
import memoryMatch   from './memory-match.js';
import quiz          from './quiz.js';
import scratch       from './scratch.js';
import adventure     from './adventure.js';
import catchHearts   from './catch-hearts.js';
import slidePuzzle   from './slide-puzzle.js';
import wordle        from './wordle.js';
import constellation from './constellation.js';
import runner        from './runner.js';

export const GAMES = [
  memoryMatch,
  quiz,
  scratch,
  adventure,
  catchHearts,
  slidePuzzle,
  wordle,
  constellation,
  runner,
];

export default GAMES;
