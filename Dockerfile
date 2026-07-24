# zetizeti — CapRover image. node:20-slim (glibc), REQUIRED since the neural embedding stack arrived:
# @huggingface/transformers → onnxruntime-node ships no musl binary and DLOPEN-CRASHES the process at
# runtime on alpine (proven in the 24 Jul 2026 local Docker gate; the npm install itself succeeds, so
# the breakage only appears live — never revert to alpine while these deps exist).
# Persistent SQLite on the /app/data volume. Secrets come from CapRover env vars, never the image.
FROM node:20-slim

# better-sqlite3 compiles a native binding — needs a toolchain on slim too.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server.mjs pool-allowlist-students.md* ./
COPY version.json* ./
COPY lib/ lib/
COPY public/ public/
COPY corpus/ corpus/

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=80
ENV ZETIZETI_DB=/app/data/zetizeti.db
EXPOSE 80

CMD ["node", "server.mjs"]
