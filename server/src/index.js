const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

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

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security & Performance ──────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

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

// ── Health Check ────────────────────────────────────────────
app.get("/api/health", (_, res) => {
  res.json({ status: "ok", version: "2.0.0", uptime: process.uptime() });
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
  console.error(`[ERROR] ${err.message}`);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🏠 LaCasaStudio V2.0 running on http://0.0.0.0:${PORT}\n`);
});

module.exports = app;
