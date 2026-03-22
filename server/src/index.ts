import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { validateEnv, getEnv } from "./services/env";
import logger from "./services/logger";
import prisma from "./db/prisma";
import { requestId } from "./middleware/requestId";

// Validate environment FIRST — fail fast
const env = validateEnv();

import authRoutes from "./routes/auth";
import channelRoutes from "./routes/channels";
import videoRoutes from "./routes/videos";
import sceneRoutes from "./routes/scenes";
import teamRoutes from "./routes/team";
import assetRoutes from "./routes/assets";
import metaRoutes from "./routes/metas";
import templateRoutes from "./routes/templates";
import budgetRoutes from "./routes/budget";
import notifRoutes from "./routes/notifications";
import checklistRoutes from "./routes/checklists";
import settingsRoutes from "./routes/settings";
import aiRoutes from "./routes/ai";
import youtubeRoutes from "./routes/youtube";
import scriptRoutes from "./routes/scripts";
import seoResultRoutes from "./routes/seo-results";
import ideaRoutes from "./routes/ideas";
import searchRoutes from "./routes/search";
import exportRoutes from "./routes/export";
import adminRoutes from "./routes/admin";
import researchRoutes from "./routes/research";
import chatRoutes from "./routes/chat";
import competitiveRoutes from "./routes/competitive";
import algorithmRoutes from "./routes/algorithm";

const app = express();
const PORT = Number(env.PORT) || 3000;

// Trust proxy (required behind nginx/EasyPanel for correct IP in rate limiting)
app.set("trust proxy", 1);

// CORS — require explicit origin in production
const ALLOWED_ORIGINS: string[] = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(",").map((o: string) => o.trim())
  : [];

const corsOrigin = env.NODE_ENV === "production" && ALLOWED_ORIGINS.length > 0
  ? ALLOWED_ORIGINS
  : true; // Allow all in development only

app.use(cors({ origin: corsOrigin, credentials: true }));

// Security headers with CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://api.laozhang.ai", "https://www.googleapis.com", "https://youtube.googleapis.com"],
      mediaSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

app.use(compression());
app.use(requestId);
app.use(express.json({ limit: "5mb" })); // Reduced from 50mb
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// Rate limiting
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: "Muitas requisições de IA." } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: "Muitas tentativas." } });

app.use("/api/", globalLimiter);
app.use("/api/ai/", aiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/scenes", sceneRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/metas", metaRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/notifications", notifRoutes);
app.use("/api/checklists", checklistRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/youtube", youtubeRoutes);
app.use("/api/scripts", scriptRoutes);
app.use("/api/seo-results", seoResultRoutes);
app.use("/api/ideas", ideaRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/research", researchRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/competitive", competitiveRoutes);
app.use("/api/algorithm", algorithmRoutes);

// Health check with expanded metrics
app.get("/api/health", (_: Request, res: Response) => {
  const mem = process.memoryUsage();
  res.json({
    status: "ok",
    version: "2.5.0",
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + "MB",
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + "MB",
      rss: Math.round(mem.rss / 1024 / 1024) + "MB",
    },
    env: env.NODE_ENV,
  });
});

// Serve client
const publicPath = path.join(__dirname, "..", "public");
app.use(express.static(publicPath));
app.get("*", (req: Request, res: Response) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Route not found" });
  }
  res.sendFile(path.join(publicPath, "index.html"));
});

// Error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const reqId = (req as any).requestId || "unknown";
  logger.error(err.message, { path: req.path, method: req.method, requestId: reqId });
  res.status(err.status || 500).json({
    error: env.NODE_ENV === "production" ? "Internal server error" : err.message,
    requestId: reqId,
  });
});

// Enable WAL mode for SQLite
prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {});

const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info(`LaCasaStudio V2.5 running on http://0.0.0.0:${PORT} [${env.NODE_ENV}]`);
});

// Graceful shutdown
function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Server closed. Connections drained.");
    process.exit(0);
  });
  // Force close after 10s
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;
