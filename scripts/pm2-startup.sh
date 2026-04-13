#!/bin/bash
# ══════════════════════════════════════════════════════════════
# سكربت تشغيل PM2 عند إعادة تشغيل السيرفر
#
# الإعداد (مرة واحدة):
#   pm2 startup systemd -u root --hp /root
#   bash /opt/siraj-alquran/scripts/pm2-startup.sh
#   pm2 save
# ══════════════════════════════════════════════════════════════

APP_DIR="/opt/siraj-alquran"

cd "$APP_DIR"

# تحميل .env
set -a
source "$APP_DIR/.env"
set +a

# تشغيل التطبيق
pm2 start "$APP_DIR/ecosystem.config.cjs" --update-env
pm2 save

echo "✅ سراج القرآن يعمل"
