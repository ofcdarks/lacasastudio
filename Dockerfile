# ============================================================
# LaCasaStudio V2.5 — Production Build (Optimized)
# ============================================================

FROM node:20-slim AS client-build
WORKDIR /app/client
COPY client/package*.json client/tsconfig*.json client/tailwind.config.js client/postcss.config.js ./
RUN npm install --prefer-offline --no-audit --no-fund || npm install --prefer-offline --no-audit --no-fund
COPY client/ ./
RUN npx tsc --noEmit && npx vite build

FROM node:20-slim AS server-deps
WORKDIR /app/server
RUN apt-get update -y && apt-get install -y openssl sqlite3 && rm -rf /var/lib/apt/lists/*
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm install --no-audit --no-fund || npm install --no-audit --no-fund
RUN npx prisma generate

FROM node:20-slim AS server-build
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY --from=server-deps /app/server/node_modules ./node_modules
COPY server/package*.json server/tsconfig.json ./
COPY server/prisma ./prisma/
RUN npx prisma generate
COPY server/src ./src/
RUN npx tsc

FROM node:20-slim AS production
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl sqlite3 wget curl python3 python3-pip ffmpeg && rm -rf /var/lib/apt/lists/*
RUN pip3 install --break-system-packages --upgrade "yt-dlp[default]"
RUN groupadd -r appgroup && useradd -r -g appgroup -m appuser

COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/dist ./server/dist
COPY server/prisma ./server/prisma/
COPY --from=client-build /app/client/dist ./server/public
COPY scripts/entrypoint.sh /app/entrypoint.sh
COPY scripts/backup.sh /app/backup.sh

RUN mkdir -p /app/data /app/backups /app/server/uploads /home/appuser/Downloads \
    && chmod +x /app/entrypoint.sh /app/backup.sh \
    && chown -R appuser:appgroup /app /home/appuser

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/lacasastudio.db
EXPOSE 3000
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server/dist/index.js"]
