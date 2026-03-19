# ============================================================
# LaCasaStudio V2.0 — Multi-stage Production Dockerfile
# Uses Debian slim instead of Alpine for Prisma compatibility
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

# Install OpenSSL — required by Prisma query engine
RUN apt-get update -y && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*

# Security: run as non-root
RUN groupadd -r appgroup && useradd -r -g appgroup -m appuser

# Copy server with node_modules (includes generated Prisma client)
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/ ./server/

# Copy built client into server's public dir
COPY --from=client-build /app/client/dist ./server/public

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/lacasastudio.db

EXPOSE 3000

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start: push schema + seed if empty + run server
CMD ["sh", "-c", "cd server && npx prisma db push --accept-data-loss 2>/dev/null; node src/db/seed.js 2>/dev/null; node src/index.js"]
