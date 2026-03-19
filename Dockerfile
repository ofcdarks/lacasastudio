# ============================================================
# LaCasaStudio V2.1 — Multi-stage Production Dockerfile
# ============================================================

# Stage 1: Build the React client
FROM node:20-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Install server dependencies + generate Prisma
FROM node:20-slim AS server-deps
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm install --omit=dev && npx prisma generate

# Stage 3: Production image
FROM node:20-slim AS production
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*

# Security: run as non-root
RUN groupadd -r appgroup && useradd -r -g appgroup -m appuser

# Copy server with node_modules
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/ ./server/

# Copy built client into server's public dir
COPY --from=client-build /app/client/dist ./server/public

# Create directories
RUN mkdir -p /app/data /app/server/uploads && chown -R appuser:appgroup /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/lacasastudio.db

EXPOSE 3000

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["sh", "-c", "cd server && npx prisma db push --accept-data-loss 2>/dev/null; node src/db/seed.js 2>/dev/null; node src/index.js"]
