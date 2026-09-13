/**
 * Punch The Ex — a stick figure with a name on it. Hit it until it breaks.
 * Names live in content/punch.json so they're editable without touching code.
 * The last "target" isn't a target at all.
 */
import api from '../api.js';
import { rand, randi, pick } from '../util.js';

export default {
  id: 'punch-the-ex',
  name: 'Punch The Ex',
  icon: '🥊',
  tint: 'rgba(168,47,73,.45)',
  desc: 'Satu per satu, sampai patah. Ada satu yang nggak boleh dipukul.',
  scoring: 'high',
  scoreLabel: (v) => `${v} pukulan`,

  async mount(ctx) {
    const { root, el: E } = ctx;
    const cfg = await api.punch();
    const targets = cfg?.targets || [];
    if (!targets.length) {
      root.append(E('p', { class: 'g-loading', text: 'Daftar mantannya belum diisi — lihat content/punch.json.' }));
      return;
    }

    let idx = 0, punches = 0, teardown = () => {};
    ctx.onCleanup(() => teardown());

    const wrap = E('div', { class: 'cv-wrap px-wrap' });
    const cv = E('canvas', { class: 'cv' });
    wrap.append(cv);
    const nameEl = E('b', { text: targets[0].name });
    const hitEl = E('b', { text: '0' });
    const bar = E('span');
    const caption = E('p', { class: 'px-caption', text: cfg.intro || 'Ketuk buat mukul.' });

    root.append(
      E('p', { class: 'g-intro', text: 'Ketuk figurnya. Terus. Sampai patah.' }),
      E('div', { class: 'g-hud' },
        E('span', {}, 'Target ', nameEl),
        E('span', {}, 'Pukulan ', hitEl)),
      E('div', { class: 'g-bar px-bar' }, bar),
      wrap,
      caption
    );

    const c = cv.getContext('2d');
    let W = 0, H = 0;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      W = r.width || 320; H = Math.min(400, Math.max(300, innerHeight * .42));
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener('resize', resize);

    /* ── state for the current figure ── */
    let hp, maxHp, cracks, pieces, shake, flash, broken, finale, guardIdx = 0, sparks = [];
    const load = () => {
      const t = targets[idx];
      maxHp = hp = t.hp || 12;
      cracks = []; pieces = []; sparks = [];
      shake = 0; flash = 0; broken = false; finale = false;
      nameEl.textContent = t.name;
      caption.textContent = cfg.intro || '';
      bar.style.width = '100%';
    };
    const loadFinale = () => {
      finale = true; broken = false;
      cracks = []; pieces = []; sparks = [];
      hp = maxHp = 1; guardIdx = 0;
      nameEl.textContent = cfg.finale?.name || 'Aby';
      caption.textContent = '';
      bar.style.width = '100%';
    };
    load();

    /* ── drawing ── */
    const P = () => ({ cx: W / 2, top: H * .17, unit: Math.min(W, H) * .052 });

    function figure(alpha = 1, tone = '#f6e8e4') {
      const { cx, top, unit } = P();
      c.save();
      c.globalAlpha = alpha;
      c.strokeStyle = tone; c.lineWidth = Math.max(3, unit * .34);
      c.lineCap = 'round'; c.lineJoin = 'round';
      // head
      c.beginPath(); c.arc(cx, top + unit, unit, 0, 6.28); c.stroke();
      // body
      c.beginPath(); c.moveTo(cx, top + unit * 2); c.lineTo(cx, top + unit * 5.2); c.stroke();
      // arms
      c.beginPath(); c.moveTo(cx - unit * 1.7, top + unit * 4.1);
      c.lineTo(cx, top + unit * 2.8); c.lineTo(cx + unit * 1.7, top + unit * 4.1); c.stroke();
      // legs
      c.beginPath(); c.moveTo(cx - unit * 1.5, top + unit * 8);
      c.lineTo(cx, top + unit * 5.2); c.lineTo(cx + unit * 1.5, top + unit * 8); c.stroke();
      // face
      if (!finale) {
        c.lineWidth = Math.max(2, unit * .2);
        c.beginPath();
        c.moveTo(cx - unit * .42, top + unit * .72); c.lineTo(cx - unit * .14, top + unit * 1.04);
        c.moveTo(cx - unit * .14, top + unit * .72); c.lineTo(cx - unit * .42, top + unit * 1.04);
        c.moveTo(cx + unit * .14, top + unit * .72); c.lineTo(cx + unit * .42, top + unit * 1.04);
        c.moveTo(cx + unit * .42, top + unit * .72); c.lineTo(cx + unit * .14, top + unit * 1.04);
        c.stroke();
        c.beginPath(); c.arc(cx, top + unit * 1.62, unit * .38, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
      } else {
        c.lineWidth = Math.max(2, unit * .2);
        c.beginPath();
        c.arc(cx - unit * .34, top + unit * .82, unit * .11, 0, 6.28);
        c.arc(cx + unit * .34, top + unit * .82, unit * .11, 0, 6.28);
        c.fillStyle = tone; c.fill();
        c.beginPath(); c.arc(cx, top + unit * 1.15, unit * .42, .18, Math.PI - .18); c.stroke();
      }
      c.restore();
    }

    function drawCracks() {
      const { unit } = P();
      c.save();
      c.strokeStyle = 'rgba(224,82,109,.85)';
      c.lineWidth = Math.max(1.5, unit * .13);
      cracks.forEach((k) => {
        c.beginPath(); c.moveTo(k.x, k.y);
        c.lineTo(k.x + k.dx, k.y + k.dy);
        c.lineTo(k.x + k.dx * 1.7 + k.j, k.y + k.dy * 1.7);
        c.stroke();
      });
      c.restore();
    }

    function heart(x, y, s, fill) {
      c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = fill;
      c.beginPath(); c.moveTo(0, 6);
      c.bezierCurveTo(-9, -3, -9, -12, 0, -7);
      c.bezierCurveTo(9, -12, 9, -3, 0, 6);
      c.fill(); c.restore();
    }

    let raf = 0, last = performance.now();
    function frame(now) {
      const dt = Math.min(34, now - last) / 16.67; last = now;
      c.save();
      if (shake > 0) { c.translate(rand(-shake, shake), rand(-shake, shake)); shake -= .6 * dt; }

      const g = c.createLinearGradient(0, 0, 0, H);
      if (finale) { g.addColorStop(0, '#2a1922'); g.addColorStop(1, '#3c2130'); }
      else { g.addColorStop(0, '#1c1018'); g.addColorStop(1, '#2a1922'); }
      c.fillStyle = g; c.fillRect(-20, -20, W + 40, H + 40);

      // ground
      c.strokeStyle = 'rgba(246,232,228,.16)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(W * .12, H * .88); c.lineTo(W * .88, H * .88); c.stroke();

      if (!broken) {
        figure(1, finale ? '#ffc9d4' : '#f6e8e4');
        drawCracks();
        if (finale) {
          const { cx, top, unit } = P();
          heart(cx, top - unit * .5, unit * .09 + Math.sin(now / 400) * .012, 'rgba(224,82,109,.9)');
        }
      } else {
        pieces.forEach((p) => {
          p.vy += .42 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
          c.strokeStyle = 'rgba(246,232,228,.6)'; c.lineWidth = p.w; c.lineCap = 'round';
          c.beginPath(); c.moveTo(-p.len / 2, 0); c.lineTo(p.len / 2, 0); c.stroke();
          c.restore();
        });
      }

      sparks = sparks.filter((s) => {
        s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += .25 * dt;
        c.globalAlpha = Math.max(0, s.life / s.max);
        c.fillStyle = s.c;
        c.beginPath(); c.arc(s.x, s.y, s.r, 0, 6.28); c.fill();
        c.globalAlpha = 1;
        return s.life > 0;
      });

      if (flash > 0) {
        c.fillStyle = `rgba(255,255,255,${flash * .16})`;
        c.fillRect(-20, -20, W + 40, H + 40);
        flash -= .09 * dt;
      }
      c.restore();
      raf = requestAnimationFrame(frame);
    }

    /* ── interaction ── */
    function burstSparks(x, y, color, n = 12) {
      for (let i = 0; i < n; i++) {
        const a = rand(0, 6.28), sp = rand(1.5, 5);
        sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
          r: rand(1.5, 3.4), c: color, life: rand(14, 30), max: 30 });
      }
    }

    function breakIt() {
      broken = true;
      const { cx, top, unit } = P();
      const segs = [
        [cx, top + unit, unit * 2], [cx, top + unit * 3.6, unit * 3.2],
        [cx - unit, top + unit * 3.4, unit * 2.2], [cx + unit, top + unit * 3.4, unit * 2.2],
        [cx - unit * .8, top + unit * 6.6, unit * 3], [cx + unit * .8, top + unit * 6.6, unit * 3],
      ];
      pieces = segs.map(([x, y, len]) => ({
        x, y, len, w: Math.max(3, unit * .32),
        vx: rand(-4.5, 4.5), vy: rand(-8, -3.5), rot: rand(0, 6.28), vr: rand(-.22, .22),
      }));
      burstSparks(cx, top + unit * 3, 'rgba(224,82,109,.9)', 26);
      shake = 12;
      const t = targets[idx];
      caption.textContent = t.quip || 'Patah.';
      bar.style.width = '0%';

      setTimeout(() => {
        idx++;
        if (idx < targets.length) {
          root.querySelector('.px-next')?.remove();
          root.append(E('div', { class: 'g-actions px-next' },
            E('button', { class: 'btn btn--primary btn--sm', text: 'Lanjut ke berikutnya →',
              onclick: (e) => { e.target.closest('.px-next').remove(); load(); } })));
        } else {
          root.querySelector('.px-next')?.remove();
          root.append(E('div', { class: 'g-actions px-next' },
            E('button', { class: 'btn btn--primary btn--sm', text: 'Udah habis semua →',
              onclick: (e) => { e.target.closest('.px-next').remove(); loadFinale(); } })));
        }
      }, 1100);
    }

    const hit = (e) => {
      const r = cv.getBoundingClientRect();
      const p = e.touches?.[0] || e;
      const x = p.clientX - r.left, y = p.clientY - r.top;

      if (finale) {
        // she doesn't get hit
        guardIdx++;
        const guards = cfg.finale?.guard || ['Yang ini nggak boleh.'];
        caption.textContent = guards[Math.min(guardIdx - 1, guards.length - 1)];
        burstSparks(x, y, 'rgba(255,201,212,.95)', 8);
        ctx.burst(r.left + x, r.top + y, 3);
        if (guardIdx >= guards.length) {
          setTimeout(() => ctx.finish({
            score: punches,
            meta: { broken: targets.length },
            message: cfg.finale?.line || 'Yang ini nggak boleh dipukul.',
          }), 700);
        }
        return;
      }
      if (broken) return;

      punches++; hitEl.textContent = punches;
      hp = Math.max(0, hp - 1);
      bar.style.width = `${(hp / maxHp) * 100}%`;
      shake = Math.min(9, 4 + (1 - hp / maxHp) * 6);
      flash = 1;
      burstSparks(x, y, 'rgba(255,214,120,.95)', 10);
      cracks.push({ x, y, dx: rand(-16, 16), dy: rand(-14, 14), j: rand(-9, 9) });
      if (hp === 0) breakIt();
    };

    const tap = (e) => { e.preventDefault(); hit(e); };
    cv.addEventListener('pointerdown', tap);

    teardown = () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      cv.removeEventListener('pointerdown', tap);
    };

    raf = requestAnimationFrame(frame);
  },
};
