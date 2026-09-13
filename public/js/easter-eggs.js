/**
 * Hidden things. None of these are signposted — that's the point.
 *
 *  · type "indonesia"      → a full-screen line she'll understand
 *  · type "bucuk"          → petal storm
 *  · konami code           → arcade unlock-all peek
 *  · tap the footer heart 7× → secret note
 *  · triple-tap the "&" in the hero → swaps the names
 *  · shake the phone       → a random note
 *  · idle for 90s          → a quiet message appears
 */
import { $, pick, toast } from './util.js';
import { burst, confetti } from './fx.js';

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

export function initEasterEggs({ notes = [], showReveal }) {
  let buf = '';
  let kIdx = 0;

  addEventListener('keydown', (e) => {
    // konami
    if (e.key === KONAMI[kIdx] || e.key.toLowerCase() === KONAMI[kIdx]) {
      kIdx++;
      if (kIdx === KONAMI.length) {
        kIdx = 0;
        confetti(80);
        showReveal('Kode rahasia. Aby emang bucuk yang pinter. 🤍\n\nBonus: semua pesan di halaman ini Marr tulis satu-satu, sambil senyum sendiri.');
      }
    } else kIdx = 0;

    // word triggers
    if (/^[a-z]$/i.test(e.key)) {
      buf = (buf + e.key.toLowerCase()).slice(-16);
      if (buf.endsWith('indonesia')) {
        buf = '';
        showReveal('Aby Indonesianya Marr.\n\nTanah, rumah, tempat Marr pulang. Dua tahun lalu Marr belum ngerti kenapa kata itu yang keluar. Sekarang ngerti.');
        confetti(60);
      }
      if (buf.endsWith('bucuk')) {
        buf = '';
        for (let i = 0; i < 40; i++) {
          setTimeout(() => burst(Math.random() * innerWidth, Math.random() * innerHeight, 2), i * 40);
        }
        toast('BUCUUUUK 🤍');
      }
      if (buf.endsWith('aby')) { buf = ''; toast(pick(notes) || 'Aby 🤍', 4200); }
      if (buf.endsWith('givit')) {
        buf = '';
        confetti(40);
        showReveal('Givit Yabes Mikael Sirait.\n\n"Give it your best" — bukan jadi yang terbaik, tapi ngasih yang terbaik. Marr mau itu jadi hal pertama yang dia bawa ke dunia.');
      }
      if (buf.endsWith('ain')) {
        buf = '';
        confetti(40);
        showReveal('Ain Novelia Mikaela Sirait.\n\n"I ain\'t no failure" — buat anak perempuan kita. Biar dia nggak pernah perlu diyakinin soal itu. Aby juga nggak, ya.');
      }
      if (buf.endsWith('sirait')) {
        buf = '';
        toast('Givit sama Ain. Dua dulu, Buk. Yang ketiga hahahaha 🤍', 5200);
      }
    }
  });

  // footer heart — 7 taps
  let taps = 0, tapTimer;
  $('#footer-heart')?.addEventListener('click', (e) => {
    taps++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { taps = 0; }, 1400);
    burst(e.clientX, e.clientY, 4);
    if (taps === 7) {
      taps = 0;
      showReveal('Tujuh kali. Aby keras kepala — dan itu salah satu alasan Marr sayang Aby.\n\nHalaman ini bakal Marr tambahin terus tiap tahun. Jangan lupa balik ke sini ya, Buk.');
    }
  });

  // triple tap the ampersand
  let amp = 0, ampTimer;
  $('.hero__amp')?.addEventListener('click', () => {
    amp++;
    clearTimeout(ampTimer);
    ampTimer = setTimeout(() => { amp = 0; }, 900);
    if (amp === 3) {
      amp = 0;
      const [a, b] = [$('.hero__line'), $('.hero__line--her')];
      const t = a.textContent; a.textContent = b.textContent; b.textContent = t;
      toast('Aby duluan, selalu boleh 🤍');
    }
  });

  // shake
  let lastShake = 0;
  addEventListener('devicemotion', (e) => {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const mag = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
    if (mag > 38 && Date.now() - lastShake > 3000) {
      lastShake = Date.now();
      confetti(20);
      toast(pick(notes) || '🤍', 4600);
    }
  });

  // idle whisper
  let idle;
  const resetIdle = () => {
    clearTimeout(idle);
    idle = setTimeout(() => {
      if (document.hidden) return;
      toast(pick(notes) || 'masih di sini, Buk? 🤍', 5200);
    }, 90000);
  };
  ['pointerdown','keydown','scroll','touchstart'].forEach((ev) =>
    addEventListener(ev, resetIdle, { passive: true }));
  resetIdle();

  // tap anywhere on the hero → tiny burst
  $('#hero')?.addEventListener('click', (e) => {
    if (e.target.closest('a,button')) return;
    burst(e.clientX, e.clientY, 3);
  });
}
