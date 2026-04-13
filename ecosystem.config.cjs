// إعداد PM2 لتشغيل نظام سراج القرآن على السيرفر
// يقرأ .env تلقائياً ويحمّل المتغيرات

const fs = require("fs");
const path = require("path");

const APP_DIR = "/opt/siraj-alquran";

// قراءة .env وتحويله لـ object
function loadEnv(envPath) {
  try {
    const content = fs.readFileSync(envPath, "utf8");
    const env = {};
    content.split("\n").forEach((line) => {
      line = line.trim();
      if (!line || line.startsWith("#")) return;
      const eqIndex = line.indexOf("=");
      if (eqIndex === -1) return;
      const key = line.slice(0, eqIndex).trim();
      const value = line.slice(eqIndex + 1).trim();
      if (key) env[key] = value;
    });
    return env;
  } catch (e) {
    return {};
  }
}

const envVars = loadEnv(path.join(APP_DIR, ".env"));

module.exports = {
  apps: [
    {
      name: "siraj-alquran",
      script: "dist/index.cjs",
      cwd: APP_DIR,
      env: {
        NODE_ENV: "production",
        PORT: 5002,
        ...envVars,
      },
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: path.join(APP_DIR, "logs/error.log"),
      out_file: path.join(APP_DIR, "logs/output.log"),
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
