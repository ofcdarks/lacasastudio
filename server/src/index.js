const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const logger = require("./services/logger");

const authRoutes = require("./routes/auth");
const channelRoutes = require("./routes/channels");
const videoRoutes = require("./routes/videos");
const sceneRoutes = require("./routes/scenes");
const teamRoutes = require("./routes/team");
const assetRoutes = require("./routes/assets");
const metaRoutes = require("./routes/metas");
const templateRoutes = require("./routes/templates");
const budgetRoutes = require("./routes/budget");
const notifRoutes = require("./routes/notifications");
const checklistRoutes = require("./routes/checklists");
const settingsRoutes = require("./routes/settings");
const aiRoutes = require("./routes/ai");
const youtubeRoutes = require("./routes/youtube");
const scriptRoutes = require("./routes/scripts");
const seoResultRoutes = require("./routes/seo-results");
const ideaRoutes = require("./routes/ideas");
const searchRoutes = require("./routes/search");
const exportRoutes = require("./routes/export");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Allowed origins ─────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
  : [];

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS[0] !== "*"
    ? ALLOWED_ORIGINS
    : true,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Rate limiters ───────────────────────────────────────────
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: "Muitas requisições de IA. Tente em 15 minutos." } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: "Muitas tentativas. Tente em 15 minutos." } });

app.use("/api/", globalLimiter);
app.use("/api/ai/", aiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ── Serve uploaded files ────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ── API Routes ──────────────────────────────────────────────
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

// ── Health Check ────────────────────────────────────────────
app.get("/api/health", (_, res) => {
  res.json({ status: "ok", version: "2.1.0", uptime: process.uptime() });
});

// ── Serve React SPA in production ───────────────────────────
const publicPath = path.join(__dirname, "..", "public");
app.use(express.static(publicPath));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Route not found" });
  }
  res.sendFile(path.join(publicPath, "index.html"));
});

// ── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(err.message, { path: req.path, method: req.method, stack: err.stack?.split("\n")[1]?.trim() });
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  logger.info(`LaCasaStudio V2.1 running on http://0.0.0.0:${PORT}`);
});

module.exports = app;
