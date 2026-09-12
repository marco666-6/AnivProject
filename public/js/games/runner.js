/** Lari Bareng — an endless runner. Jump the gaps, collect the hearts. */
import { rand, clamp } from '../util.js';

export default {
  id: 'runner',
  name: 'Lari Bareng',
  icon: '🏃',
  tint: 'rgba(224,82,109,.38)',
  desc: 'Lompatin rintangannya, kumpulin hatinya. Makin lama makin ngebut.',
  scoring: 'high',
  scoreLabel: (v) => `rekor ${v} m`,

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
      const dEl = E('b', { text: '0' }), hEl = E('b', { text: '0' });
      root.append(
        E('p', { class: 'g-intro', text: 'Ketuk layar / Spasi / ↑ buat lompat. Tekan dua kali buat lompat ganda.' }),
        E('div', { class: 'g-hud' }, E('span', {}, 'Jarak ', dEl, ' m'), E('span', {}, '💗 ', hEl)),
        wrap
      );

      const c = cv.getContext('2d');
      let W = 0, H = 0, GY = 0;
      const resize = () => {
        const r = wrap.getBoundingClientRect();
        W = r.width || 320; H = Math.min(300, Math.max(220, innerHeight * .34));
        GY = H - 46;
        const dpr = Math.min(devicePixelRatio || 1, 2);
        cv.width = W * dpr; cv.height = H * dpr;
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      addEventListener('resize', resize);

      const P = { x: 52, y: 0, vy: 0, w: 18, h: 26, jumps: 0, run: 0 };
      let spd = 4.2, dist = 0, hearts = 0, obs = [], pick = [], over = false, raf = 0, last = performance.now(), spawn = 60, shake = 0;

      const jump = () => {
        if (over) return;
        if (P.jumps < 2) { P.vy = P.jumps === 0 ? -9.4 : -8.2; P.jumps++; }
      };
      const onKey = (e) => {
        if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); jump(); }
        if (over && e.key === 'Enter') run();
      };
      const onTap = (e) => { e.preventDefault(); jump(); };
      addEventListener('keydown', onKey);
      cv.addEventListener('pointerdown', onTap);

      teardown = () => {
        cancelAnimationFrame(raf); over = true;
        removeEventListener('keydown', onKey); removeEventListener('resize', resize);
      };

      function frame(now) {
        const dt = Math.min(34, now - last) / 16.67; last = now;

        if (!over) {
          spd = 4.2 + dist / 620;
          dist += spd * dt * .34;
          dEl.textContent = Math.floor(dist);
          P.run += dt * .35;

          P.vy += .58 * dt;
          P.y += P.vy * dt;
          if (P.y > 0) { P.y = 0; P.vy = 0; P.jumps = 0; }

          spawn -= dt * spd * .34;
          if (spawn <= 0) {
            const r = Math.random();
            if (r < .62) obs.push({ x: W + 20, w: rand(15, 26), h: rand(20, 40) });
            else pick.push({ x: W + 20, y: rand(30, 78) });
            spawn = rand(34, 68);
          }

          obs = obs.filter((o) => {
            o.x -= spd * dt;
            const px = P.x, py = GY + P.y;
            if (px + P.w / 2 > o.x && px - P.w / 2 < o.x + o.w && py > GY - o.h) { end(); }
            return o.x > -60;
          });

          pick = pick.filter((p) => {
            p.x -= spd * dt;
            if (Math.abs(p.x - P.x) < 20 && Math.abs((GY + P.y - 14) - (GY - p.y)) < 24) {
              hearts++; hEl.textContent = hearts;
              const r = cv.getBoundingClientRect();
              ctx.burst(r.left + p.x, r.top + GY - p.y, 3);
              return false;
            }
            return p.x > -40;
          });
        }
        if (shake > 0) shake -= dt;

        /* ─ draw ─ */
        c.save();
        if (shake > 0) c.translate(rand(-3, 3), rand(-3, 3));
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#fff6f1'); g.addColorStop(1, '#f8dde2');
        c.fillStyle = g; c.fillRect(0, 0, W, H);

        // parallax hills
        c.fillStyle = 'rgba(224,82,109,.1)';
        for (let i = 0; i < 5; i++) {
          const hx = ((i * 180 - dist * 1.4) % (W + 220)) - 110;
          c.beginPath(); c.ellipse(hx, GY + 6, 92, 40, 0, Math.PI, 0); c.fill();
        }

        // ground
        c.fillStyle = '#a82f49'; c.fillRect(0, GY + P.h / 2, W, 3);
        c.fillStyle = 'rgba(168,47,73,.18)';
        for (let i = 0; i < W / 34 + 2; i++) {
          const gx = ((i * 34 - dist * 2.6) % (W + 34));
          c.fillRect(gx, GY + P.h / 2 + 7, 16, 2);
        }

        // obstacles
        obs.forEach((o) => {
          c.fillStyle = '#6a3550';
          c.beginPath(); c.roundRect(o.x, GY + P.h / 2 - o.h, o.w, o.h, 4); c.fill();
        });

        // pickups
        pick.forEach((p) => {
          c.font = '18px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText('💗', p.x, GY - p.y);
        });

        // runner
        const py = GY + P.y;
        const bob = P.y === 0 ? Math.sin(P.run) * 1.6 : 0;
        c.fillStyle = '#e0526d';
        c.beginPath(); c.roundRect(P.x - P.w / 2, py - P.h / 2 + bob, P.w, P.h, 7); c.fill();
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(P.x + 1, py - P.h / 2 + 6 + bob, 2, 0, 6.28); c.fill();
        // legs
        c.strokeStyle = '#a82f49'; c.lineWidth = 3; c.lineCap = 'round';
        const swing = P.y === 0 ? Math.sin(P.run * 2) * 6 : 4;
        c.beginPath();
        c.moveTo(P.x - 3, py + P.h / 2 - 2 + bob); c.lineTo(P.x - 3 + swing, py + P.h / 2 + 6 + bob);
        c.moveTo(P.x + 3, py + P.h / 2 - 2 + bob); c.lineTo(P.x + 3 - swing, py + P.h / 2 + 6 + bob);
        c.stroke();
        c.restore();

        if (over) {
          c.fillStyle = 'rgba(28,16,24,.76)'; c.fillRect(0, 0, W, H);
          c.fillStyle = '#fff'; c.textAlign = 'center';
          c.font = '700 32px Fraunces, serif'; c.fillText(`${Math.floor(dist)} m`, W / 2, H / 2 - 6);
          c.font = '13px "Plus Jakarta Sans", sans-serif';
          c.fillText(`${hearts} hati dikumpulin`, W / 2, H / 2 + 18);
        }
        raf = requestAnimationFrame(frame);
      }

      function end() {
        if (over) return;
        over = true; shake = 12;
        root.append(E('div', { class: 'g-actions' },
          E('button', { class: 'btn btn--quiet btn--sm', text: 'Lari lagi', onclick: run })));
        ctx.finish({ score: Math.floor(dist), meta: { hearts } });
      }

      raf = requestAnimationFrame(frame);
    };

    run();
  },
};
