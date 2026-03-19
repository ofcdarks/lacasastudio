const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || "info"] ?? 2;

function fmt(level, msg, meta = {}) {
  const ts = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `[${ts}] ${level.toUpperCase()} ${msg}${metaStr}`;
}

const logger = {
  error: (msg, meta) => { if (LEVEL >= 0) console.error(fmt("error", msg, meta)); },
  warn:  (msg, meta) => { if (LEVEL >= 1) console.warn(fmt("warn", msg, meta)); },
  info:  (msg, meta) => { if (LEVEL >= 2) console.log(fmt("info", msg, meta)); },
  debug: (msg, meta) => { if (LEVEL >= 3) console.log(fmt("debug", msg, meta)); },
};

module.exports = logger;
