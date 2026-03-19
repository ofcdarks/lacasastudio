# ============================================================
# LaCasaStudio V2.0 — Multi-stage Production Dockerfile
# ============================================================

# Stage 1: Build the React client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Install server dependencies
FROM node:20-alpine AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm install --omit=dev && npx prisma generate

# Stage 3: Production image
FROM node:20-alpine AS production
WORKDIR /app

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy server
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

# Start: migrate DB + seed if empty + run server
CMD ["sh", "-c", "cd server && npx prisma db push --accept-data-loss 2>/dev/null; node src/db/seed.js 2>/dev/null; node src/index.js"]
