# ── Aniv ──────────────────────────────────────────────────────
# Debian slim (not alpine) so better-sqlite3 and sharp both get
# prebuilt binaries instead of compiling from source.
FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/aniv.sqlite

WORKDIR /app

# deps first so this layer caches across content edits
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=4s --start-period=8s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
