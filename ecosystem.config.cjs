// إعداد PM2 — سراج القرآن
// المتغيرات الحساسة (DATABASE_URL, SESSION_SECRET) تأتي من PM2 --update-env
// لا تضعها هنا — ضعها في .env على السيرفر

const APP_DIR = "/opt/siraj-alquran";

module.exports = {
  apps: [
    {
      name: "siraj-alquran",
      script: "dist/index.cjs",
      cwd: APP_DIR,
      env: {
        NODE_ENV: "production",
        PORT: 5002,
        TZ: "Asia/Baghdad",
      },
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: APP_DIR + "/logs/error.log",
      out_file: APP_DIR + "/logs/output.log",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
