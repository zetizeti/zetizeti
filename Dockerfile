# zetizeti — CapRover image for the `blevn` server.
# Node + better-sqlite3 (native build) + persistent SQLite on the /app/data volume.
# Pure BYOK: the server holds NO LLM key. Secrets (Google OAuth, admin emails) come from
# CapRover env vars, never baked into the image.
FROM node:20-alpine

# better-sqlite3 compiles a native binding on alpine (musl) — needs a toolchain.
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Production deps first, for layer caching. Only better-sqlite3 + express (no @anthropic-ai/sdk).
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# App source ONLY — no docs (brand.md / build-plan.md / verification notes), no db/, no .env.
# The students roster (pool-allowlist-students.md) is copied too when present — the `md*` glob makes it
# OPTIONAL (server.mjs always matches, so the COPY never fails when the roster is absent on a self-host).
COPY server.mjs pool-allowlist-students.md* ./
COPY lib/ lib/
COPY public/ public/
COPY corpus/ corpus/

# The SQLite DB lives in the CapRover persistent volume (/app/data), NEVER baked into the image.
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=80
ENV ZETIZETI_DB=/app/data/zetizeti.db
EXPOSE 80

CMD ["node", "server.mjs"]
