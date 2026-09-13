# Aniv 🤍

A little house on the internet for **Marr & Aby**.

The copy talks to her as **Aby / Bebelac / Bucuk** and refers to him as **Marr**,
not `kamu`/`aku` — keep that voice when you add to `content/`.
Built to be *added to* every year, not rebuilt.

Day zero: **2 September 2023** — the day I called you my Indonesia.

---

## Run it

```bash
docker compose up --build
```

→ **http://localhost:3000**

`content/`, `images/` and `public/` are mounted into the container, so editing
them is instant — just refresh (restart only if you change `content/*.json`,
which is read at boot).

Without Docker:

```bash
npm install
npm start
```

---

## Where everything lives

```
AnivProject/
├── content/          ← 📝 THE ONLY FOLDER YOU NEED TO TOUCH EACH YEAR
│   ├── config.json       names, dates, theme colours, hero lines, music
│   ├── memories.json     the timeline
│   ├── gallery.json      photo captions
│   ├── reasons.json      "alasan aku sayang kamu"
│   ├── letters.json      the big letter + short notes + game rewards
│   ├── quiz.json         quiz questions
│   ├── adventure.json    the choose-your-own-path story
│   └── wordle.json       words for the guessing game
│
├── images/           ← 📷 drop new photos straight in here
│   ├── _web/             1400px versions   (generated)
│   ├── _thumb/           640px versions    (generated)
│   └── _manifest.json    filename → slug map (generated)
│
├── public/           the site itself
│   ├── index.html
│   ├── css/          base · layout · components · games
│   └── js/
│       ├── main.js       boot sequence
│       ├── api.js        server calls + offline localStorage mirror
│       ├── arcade.js     the game host (modal, scores, unlocks, vault)
│       ├── fx.js         petals, heart bursts, generated background music
│       ├── counter.js  timeline.js  gallery.js  reasons.js  letter.js
│       ├── easter-eggs.js
│       └── games/        ← 🎮 one file per game + index.js registry
│
├── server/
│   ├── index.js      express app
│   ├── db.js         sqlite connection + schema
│   ├── repo.js       every query, in one place
│   ├── seed.js       mirrors content/*.json into the DB on boot
│   └── routes/api.js the REST API
│
├── scripts/
│   ├── build-images.mjs   npm run images
│   └── smoke-test.mjs     npm run smoke
│
└── data/             aniv.sqlite lives here (gitignored)
```

---

## Updating it next year

### Add photos
1. Drop the files into `images/`.
2. `npm run images` — makes the phone-friendly versions.
3. Add an entry to `content/gallery.json`:
   ```json
   { "file": "IMG_1234.jpg", "date": "2027-09-02", "title": "…", "caption": "…", "tags": ["us"] }
   ```

**Dates are optional and fuzzy on purpose** — never invent one:

| value | shows as |
|---|---|
| `"2026-09-12"` | 12 September 2026 |
| `"2025-11"` | November 2025 |
| `"2025"` | 2025 |
| `null` | nothing (gallery shows `—`, timeline shows "entah kapan") |

Order on the page comes from the order in the JSON, not from the date — so a
photo with no date still sits exactly where you want it.

### Add a memory to the timeline
Append to `content/memories.json` → `entries`. Set `"anchor": true` to make the dot glow.

### Bump the year
Nothing to bump. The counter reads `content/config.json` → `dates.together` and works it out live.

### Add a reason / a note / a quiz question
One more object in `reasons.json`, `letters.json` → `notes`, or `quiz.json`. Done.

### Add a whole new game
1. Create `public/js/games/my-game.js`:
   ```js
   export default {
     id: 'my-game',
     name: 'Nama Game',
     icon: '🎮',
     tint: 'rgba(224,82,109,.34)',
     desc: 'satu kalimat',
     scoring: 'high',          // 'high' | 'low' | 'none'
     scoreLabel: (v) => `rekor ${v}`,
     async mount(ctx) {
       // ctx.root      → the element to render into
       // ctx.data      → photos, config, notes, unlockables
       // ctx.el        → tiny element helper
       // ctx.burst     → heart particles at x,y
       // ctx.onCleanup → register teardown (timers, listeners)
       // ctx.finish({ score, meta, message })  → saves + unlocks + celebrates
     },
   };
   ```
2. Add two lines to `public/js/games/index.js` (import + array entry).
3. Optionally add a reward line under `unlockables` in `content/letters.json`,
   keyed by the same `id`.

The arcade card, progress bar, high score, unlock badge and vault entry all
appear by themselves.

### Background music
Drop an mp3 at `public/audio/theme.mp3`. If it isn't there, a soft lullaby is
generated in the browser with the Web Audio API — no file, no licence, no cost.

---

## The database

SQLite, at `data/aniv.sqlite`. Two kinds of table:

| kind | tables | behaviour |
|---|---|---|
| **content** | `memories` `photos` `reasons` | rebuilt from `content/*.json` every boot |
| **state** | `scores` `unlocks` `favourites` `replies` `visits` `meta` | never wiped |

So editing JSON always wins, and her high scores and hearted photos never get lost.

If `better-sqlite3` can't load (some serverless hosts), the app falls back to an
in-memory store and keeps working — nothing crashes, state just isn't durable.

### API

| method | path | |
|---|---|---|
| GET | `/api/bootstrap` | everything the page needs, one call |
| GET | `/api/memories` `/api/photos` `/api/reasons` `/api/letter` `/api/notes` | |
| GET | `/api/games/quiz` `/api/games/adventure` `/api/games/wordle` | |
| POST | `/api/games/wordle/check` | grades a guess server-side |
| POST/GET | `/api/scores` `/api/scores/:game` | |
| POST/GET | `/api/unlocks` | |
| POST/GET | `/api/favourites` | |
| POST/GET | `/api/replies` | her messages back |
| GET | `/api/health` | |
| POST | `/api/reload` | re-read `content/` without a restart |

---

## Deploying free

**GitHub → Vercel.** `vercel.json` routes everything through `server/index.js`.

One caveat worth knowing: Vercel's filesystem is ephemeral, so the SQLite file
resets between deploys (and can reset between cold starts). Content, photos,
games and the counter all work perfectly — but scores, hearts and her replies
are also mirrored to `localStorage` in her browser, so on her phone they survive
anyway. For truly permanent storage later, point `DB_PATH` at a mounted volume
(Fly.io, Railway, a VPS) or swap `repo.js` for Turso/libSQL — it's the only file
that talks to the database.

---

## Hidden things

Don't tell her. Let her find them.

- type **`indonesia`** anywhere
- type **`bucuk`**
- type **`aby`**
- the konami code (↑↑↓↓←→←→ B A)
- tap the footer heart **7 times**
- triple-tap the **&** between the names
- shake the phone
- long-press (or double-tap) any photo to heart it
- leave the page idle for a while

---

## Checks

```bash
npm run smoke     # 12 API + static checks against a running server
```

---

Made by hand, for Aby.
Aby · Bebelac Gold · Bucuk · Indonesiaku 🤍
