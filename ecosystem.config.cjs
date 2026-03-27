// إعداد PM2 لتشغيل نظام مُتْقِن على السيرفر
// استخدام: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: "mutqin",
      script: "dist/index.cjs",
      cwd: "/home/mutqin/app",  // غيّر حسب مسار التطبيق على السيرفر
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        // ضع متغيرات البيئة في .env على السيرفر
      },
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/home/mutqin/logs/error.log",
      out_file: "/home/mutqin/logs/output.log",
      merge_logs: true,
      // إعادة تشغيل تلقائي عند التعطل
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
