/** Tangkap Hati — 45 seconds, catch the hearts, dodge the broken ones. */
import { rand, clamp } from '../util.js';

export default {
  id: 'catch-hearts',
  name: 'Tangkap Hati',
  icon: '🧺',
  tint: 'rgba(224,82,109,.4)',
  desc: 'Geser keranjangnya, Buk. Tangkap yang utuh, hindari yang retak. 45 detik.',
  scoring: 'high',
  scoreLabel: (v) => `rekor ${v} poin`,

  async mount(ctx) {
    const { root, el: E } = ctx;
    let teardown = () => {};
    ctx.onCleanup(() => teardown());

    const run = () => {
      teardown();
      root.replaceChildren();

      const wrap = E('div', { class: 'cv-wrap' });
      const cv = E('canvas', { class: 'cv' });
      wrap.append(cv);
      const sEl = E('b', { text: '0' }), lEl = E('b', { text: '3' }), tEl = E('b', { text: '45' });
      root.append(
        E('p', { class: 'g-intro', text: 'Geser jari / mouse, atau pakai ← →. Hati emas = 5 poin.' }),
        E('div', { class: 'g-hud' },
          E('span', {}, 'Skor ', sEl), E('span', {}, '❤ ', lEl), E('span', {}, '⏱ ', tEl)),
        wrap
      );

      const c = cv.getContext('2d');
      let W = 0, H = 0;
      const resize = () => {
        const r = wrap.getBoundingClientRect();
        W = r.width || 320;
        H = Math.min(420, Math.max(290, innerHeight * .42));
        const dpr = Math.min(devicePixelRatio || 1, 2);
        cv.width = W * dpr; cv.height = H * dpr;
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      addEventListener('resize', resize);

      const basket = { x: W / 2, w: 74, h: 22 };
      let items = [], score = 0, lives = 3, t = 45, raf = 0, spawnT = 0, over = false, last = performance.now();
      const keys = {};

      const onKey = (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keys[e.key] = e.type === 'keydown'; e.preventDefault(); }
      };
      const move = (e) => {
        const r = cv.getBoundingClientRect();
        const p = e.touches?.[0] || e;
        basket.x = clamp(p.clientX - r.left, basket.w / 2, W - basket.w / 2);
      };
      const touchMove = (e) => { e.preventDefault(); move(e); };
      addEventListener('keydown', onKey); addEventListener('keyup', onKey);
      cv.addEventListener('pointermove', move);
      cv.addEventListener('pointerdown', move);
      cv.addEventListener('touchmove', touchMove, { passive: false });

      const clock = setInterval(() => {
        if (over) return;
        t--; tEl.textContent = t;
        if (t <= 0) end();
      }, 1000);

      teardown = () => {
        cancelAnimationFrame(raf); clearInterval(clock); over = true;
        removeEventListener('keydown', onKey); removeEventListener('keyup', onKey);
        removeEventListener('resize', resize);
      };

      const TYPES = [
        { k: 'good', ch: '💗', pts: 1, w: 62 },
        { k: 'gold', ch: '💛', pts: 5, w: 12 },
        { k: 'bad',  ch: '💔', pts: 0, w: 26 },
      ];
      const roll = () => {
        let n = rand(0, TYPES.reduce((s, x) => s + x.w, 0));
        for (const x of TYPES) if ((n -= x.w) <= 0) return x;
        return TYPES[0];
      };

      const heart = (x, y, s, fill) => {
        c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = fill;
        c.beginPath(); c.moveTo(0, 6);
        c.bezierCurveTo(-9, -3, -9, -12, 0, -7);
        c.bezierCurveTo(9, -12, 9, -3, 0, 6);
        c.fill(); c.restore();
      };

      function frame(now) {
        const dt = Math.min(34, now - last) / 16.67; last = now;
        if (!over) {
          spawnT -= dt;
          if (spawnT <= 0) {
            items.push({ ...roll(), x: rand(24, Math.max(30, W - 24)), y: -26, vy: rand(1.7, 3.0) + (45 - t) * .026, r: rand(-.4, .4) });
            spawnT = Math.max(9, rand(16, 30) - (45 - t) * .2);
          }
          if (keys.ArrowLeft)  basket.x = clamp(basket.x - 7 * dt, basket.w / 2, W - basket.w / 2);
          if (keys.ArrowRight) basket.x = clamp(basket.x + 7 * dt, basket.w / 2, W - basket.w / 2);
        }

        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#fff4ef'); g.addColorStop(1, '#fbe2e6');
        c.fillStyle = g; c.fillRect(0, 0, W, H);

        const by = H - 34;
        items = items.filter((it) => {
          it.y += it.vy * dt; it.r += .015 * dt;
          c.save(); c.translate(it.x, it.y); c.rotate(it.r);
          c.font = '26px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(it.ch, 0, 0); c.restore();

          if (!over && it.y > by - 16 && it.y < by + 24 && Math.abs(it.x - basket.x) < basket.w / 2 + 10) {
            if (it.k === 'bad') {
              lives--; lEl.textContent = Math.max(0, lives);
              cv.classList.add('is-hit'); setTimeout(() => cv.classList.remove('is-hit'), 220);
              if (lives <= 0) end();
            } else {
              score += it.pts; sEl.textContent = score;
              const r = cv.getBoundingClientRect();
              ctx.burst(r.left + it.x, r.top + by, it.k === 'gold' ? 6 : 2);
            }
            return false;
          }
          return it.y < H + 40;
        });

        c.fillStyle = '#a82f49';
        c.beginPath();
        c.roundRect(basket.x - basket.w / 2, by, basket.w, basket.h, [4, 4, 12, 12]);
        c.fill();
        heart(basket.x, by + 12, .85, 'rgba(255,255,255,.85)');

        if (over) {
          c.fillStyle = 'rgba(28,16,24,.74)'; c.fillRect(0, 0, W, H);
          c.fillStyle = '#fff'; c.textAlign = 'center';
          c.font = '700 36px Fraunces, serif'; c.fillText(String(score), W / 2, H / 2 - 4);
          c.font = '13px "Plus Jakarta Sans", sans-serif'; c.fillText('poin', W / 2, H / 2 + 20);
        }
        raf = requestAnimationFrame(frame);
      }

      function end() {
        if (over) return;
        over = true;
        clearInterval(clock);
        root.append(E('div', { class: 'g-actions' },
          E('button', { class: 'btn btn--quiet btn--sm', text: 'Main lagi', onclick: run })));
        ctx.finish({ score, meta: { lives } });
      }

      raf = requestAnimationFrame(frame);
    };

    run();
  },
};
