/** Rasi Bintang — connect the stars in order and a shape appears in the sky. */
import { pick } from '../util.js';

const SHAPES = [
  {
    name: 'Hati',
    line: 'Bentuk pertama yang Marr gambar tiap kali mikirin Aby.',
    pts: [[.50,.22],[.36,.12],[.22,.22],[.22,.40],[.50,.72],[.78,.40],[.78,.22],[.64,.12],[.50,.22]],
  },
  {
    name: 'Bintang',
    line: 'Aby bukan bintang yang jauh. Aby yang paling deket.',
    pts: [[.50,.10],[.61,.38],[.90,.38],[.67,.56],[.76,.85],[.50,.67],[.24,.85],[.33,.56],[.10,.38],[.39,.38],[.50,.10]],
  },
  {
    name: 'Huruf A',
    line: 'A buat Ayu. A buat Aby. A buat awal dari semuanya.',
    pts: [[.24,.86],[.50,.14],[.76,.86],[.66,.60],[.34,.60]],
  },
  {
    name: 'Bulan',
    line: 'Kita sering ngobrol sampai bulan capek nungguin.',
    pts: [[.62,.14],[.40,.24],[.32,.46],[.40,.70],[.62,.84],[.46,.66],[.42,.46],[.48,.28],[.62,.14]],
  },
];

export default {
  id: 'constellation',
  name: 'Rasi Bintang',
  icon: '✨',
  tint: 'rgba(106,53,80,.4)',
  desc: 'Sambungin bintangnya urut. Ada bentuk yang muncul di langit.',
  scoring: 'none',

  async mount(ctx) {
    const { root, el: E } = ctx;
    const shape = pick(SHAPES);
    let step = 0, raf = 0;

    const wrap = E('div', { class: 'cv-wrap cv-wrap--night' });
    const cv = E('canvas', { class: 'cv' });
    wrap.append(cv);
    const label = E('p', { class: 'cn-label', text: `sambungin ${shape.pts.length} titik, urut dari yang menyala` });
    root.append(E('p', { class: 'g-intro', text: 'Ketuk bintang yang berkedip ya Buk. Satu per satu.' }), wrap, label);

    const c = cv.getContext('2d');
    let W = 0, H = 0;
    const bg = [];

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      W = r.width || 320; H = Math.min(440, Math.max(300, innerHeight * .45));
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener('resize', resize);

    for (let i = 0; i < 70; i++) bg.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + .3, p: Math.random() * 6.28 });

    const P = () => shape.pts.map(([x, y]) => ({ x: x * W, y: y * H }));

    function frame(t) {
      const pts = P();
      c.fillStyle = '#150c14'; c.fillRect(0, 0, W, H);
      const glow = c.createRadialGradient(W / 2, H * .4, 10, W / 2, H * .4, W * .8);
      glow.addColorStop(0, 'rgba(106,53,80,.4)'); glow.addColorStop(1, 'transparent');
      c.fillStyle = glow; c.fillRect(0, 0, W, H);

      bg.forEach((s) => {
        const a = .25 + Math.sin(t / 900 + s.p) * .2;
        c.fillStyle = `rgba(255,244,238,${a})`;
        c.beginPath(); c.arc(s.x * W, s.y * H, s.r, 0, 6.28); c.fill();
      });

      if (step > 1) {
        c.strokeStyle = 'rgba(217,164,65,.85)'; c.lineWidth = 1.6;
        c.shadowBlur = 12; c.shadowColor = 'rgba(217,164,65,.7)';
        c.beginPath(); c.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < step; i++) c.lineTo(pts[i].x, pts[i].y);
        c.stroke(); c.shadowBlur = 0;
      }

      pts.forEach((p, i) => {
        const done = i < step;
        const active = i === step;
        const pulse = active ? 1 + Math.sin(t / 180) * .35 : 1;
        c.beginPath();
        c.arc(p.x, p.y, (done ? 5 : active ? 7 : 3.5) * pulse, 0, 6.28);
        c.fillStyle = done ? '#ffd79a' : active ? '#fff' : 'rgba(255,244,238,.35)';
        c.shadowBlur = active ? 18 : done ? 10 : 0;
        c.shadowColor = active ? '#fff' : '#d9a441';
        c.fill(); c.shadowBlur = 0;
        if (active) {
          c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1;
          c.beginPath(); c.arc(p.x, p.y, 14 + Math.sin(t / 200) * 4, 0, 6.28); c.stroke();
        }
      });

      if (step >= pts.length) {
        c.fillStyle = 'rgba(255,244,238,.92)'; c.textAlign = 'center';
        c.font = '600 22px Fraunces, serif';
        c.fillText(shape.name, W / 2, H - 26);
      }
      raf = requestAnimationFrame(frame);
    }

    const tap = (e) => {
      if (step >= shape.pts.length) return;
      const r = cv.getBoundingClientRect();
      const p = e.touches?.[0] || e;
      const x = p.clientX - r.left, y = p.clientY - r.top;
      const target = P()[step];
      if (Math.hypot(x - target.x, y - target.y) < 34) {
        step++;
        ctx.burst(r.left + target.x, r.top + target.y, 3);
        label.textContent = step >= shape.pts.length
          ? `${shape.name} — kebentuk ✨`
          : `${step} dari ${shape.pts.length}`;
        if (step >= shape.pts.length) {
          setTimeout(() => ctx.finish({ message: `${shape.name}.\n\n${shape.line}` }), 700);
        }
      }
    };
    cv.addEventListener('pointerdown', tap);

    ctx.onCleanup(() => { cancelAnimationFrame(raf); removeEventListener('resize', resize); });
    raf = requestAnimationFrame(frame);
  },
};
