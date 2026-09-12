/**
 * Aniv — boot sequence.
 * One API call, then every section paints itself.
 */
import { $, $$, el, observeRise, toast } from './util.js';
import api, { local } from './api.js';
import { startPetals, createMusic, burst } from './fx.js';
import { initCounter, initHeroRotate } from './counter.js';
import { renderTimeline } from './timeline.js';
import { renderGallery, initLightbox, open as openPhoto } from './gallery.js';
import { initReasons } from './reasons.js';
import { initLetter, initReply } from './letter.js';
import { initArcade, showReveal } from './arcade.js';
import { initEasterEggs } from './easter-eggs.js';

/* ─── theme from config ─── */
function applyTheme(theme = {}) {
  const map = { ink: '--ink', paper: '--paper', rose: '--rose', roseDeep: '--rose-deep', gold: '--gold', plum: '--plum', mint: '--mint' };
  Object.entries(map).forEach(([k, v]) => { if (theme[k]) document.documentElement.style.setProperty(v, theme[k]); });
}

/* ─── text bindings from config ─── */
function bind(config) {
  const get = (path) => path.split('.').reduce((o, k) => o?.[k], {
    site: config.site, hero: config.hero,
    her: config.people?.her, him: config.people?.him,
    timelineTitle: config.timelineTitle, galleryTitle: config.galleryTitle,
    arcadeTitle: config.arcadeTitle, reasonsTitle: config.reasonsTitle,
    letterSectionTitle: config.letterSectionTitle,
  });
  $$('[data-bind]').forEach((n) => {
    const v = get(n.dataset.bind);
    if (typeof v === 'string' && v) n.textContent = v;
  });
  if (config.site?.title) document.title = config.site.title;
  const her = config.people?.her?.nicknames?.[0] || config.people?.her?.short;
  const him = config.people?.him?.short;
  if (him) $('.hero__line').textContent = him;
  if (her) $('.hero__line--her').textContent = her;
  if (config.people) {
    $('.topbar__mark').innerHTML =
      `${(him || 'M')[0]}<span>&amp;</span>${(config.people.her?.initial || 'A')}`;
  }
}

/* ─── scroll spy + sticky bar ─── */
function initChrome() {
  const bar = $('#topbar');
  const links = $$('.topbar__nav a');
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);

  const onScroll = () => bar.classList.toggle('is-stuck', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));
}

/* ─── curtain ─── */
function initCurtain(music, config) {
  const curtain = $('#curtain');
  const open = async () => {
    curtain.classList.add('is-gone');
    document.body.classList.remove('is-locked');
    $('#topbar').classList.add('is-ready');
    setTimeout(() => { curtain.remove(); }, 1000);
    if (config?.music?.defaultOn !== false) {
      const on = await music.toggle();
      $('#music-toggle').setAttribute('aria-pressed', String(!!on));
    }
    burst(innerWidth / 2, innerHeight / 2, 16);
  };
  document.body.classList.add('is-locked');
  $('#curtain-open').addEventListener('click', open);
  // don't trap anyone who reloads and just wants to scroll
  setTimeout(() => curtain.isConnected && addEventListener('wheel', open, { once: true, passive: true }), 2500);
}

/* ─── go ─── */
(async function boot() {
  startPetals($('#fx-canvas'));

  let data;
  try {
    data = await api.bootstrap();
  } catch (err) {
    console.error(err);
    $('#curtain .curtain__inner').replaceChildren(
      el('div', { class: 'curtain__heart', text: '🥺' }),
      el('p', { class: 'curtain__sub', text: 'Servernya belum nyala. Jalanin `npm start` atau `docker compose up` dulu ya.' })
    );
    return;
  }

  const config = data.config || {};
  applyTheme(config.theme);
  bind(config);

  const music = createMusic(config.music || {});
  $('#music-toggle').addEventListener('click', async (e) => {
    const on = await music.toggle();
    e.currentTarget.setAttribute('aria-pressed', String(!!on));
    if (!on) toast('musiknya dimatiin');
  });

  initCurtain(music, config);
  initChrome();
  initCounter(config);
  initHeroRotate(config.hero?.rotatingLines || []);

  const photosByFile = new Map(data.photos.map((p) => [p.file, p]));
  renderGallery(data.photos, data.favourites || local.read().favourites);
  data.photos.forEach((p, i) => { p.__index = i; });
  initLightbox();
  renderTimeline(data.memories, photosByFile, openPhoto);
  initReasons(data.reasons);
  initLetter(data.letter);
  initArcade(data);
  initEasterEggs({ notes: data.notes || [], showReveal });

  try { initReply(await api.replies()); } catch { initReply([]); }

  const v = data.visit || {};
  $('#footer-meta').textContent =
    `kunjungan ke-${v.total || 1} · dibuka di ${v.days || 1} hari berbeda · v${new Date().getFullYear()}`;

  observeRise();
  // anything rendered after first paint
  setTimeout(() => observeRise(), 400);
})();
