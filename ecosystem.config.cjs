// إعداد PM2 لتشغيل نظام سراج القرآن على السيرفر
// استخدام: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: "siraj-alquran",
      script: "dist/index.cjs",
      cwd: "/opt/siraj-alquran",
      env: {
        NODE_ENV: "production",
        PORT: 5002,
      },
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/opt/siraj-alquran/logs/error.log",
      out_file: "/opt/siraj-alquran/logs/output.log",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
