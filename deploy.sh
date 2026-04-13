#!/bin/bash
# سكربت النشر لنظام مُتْقِن على VPS
# استخدام: bash deploy.sh
#
# المتطلبات على السيرفر:
# - Node.js 20+
# - PostgreSQL 15+
# - Nginx
# - PM2 (npm install -g pm2)
# - Certbot (للـ SSL المجاني)

set -e

APP_DIR="/home/mutqin/app"
LOG_DIR="/home/mutqin/logs"

echo "=== نشر نظام مُتْقِن ==="

# إنشاء المجلدات
mkdir -p "$APP_DIR" "$LOG_DIR"

# نسخ الملفات (أو git pull)
echo "1. تحديث الكود..."
cd "$APP_DIR"
git pull origin main 2>/dev/null || echo "تخطي git pull — يرجى نسخ الملفات يدوياً"

# تثبيت المكتبات
echo "2. تثبيت المكتبات..."
npm install --production

# بناء المشروع
echo "3. بناء المشروع..."
npm run build

# تطبيق تغييرات قاعدة البيانات
echo "4. تحديث قاعدة البيانات..."
npx drizzle-kit push

# إعادة تشغيل التطبيق
echo "5. إعادة تشغيل التطبيق..."
pm2 reload ecosystem.config.cjs --update-env 2>/dev/null || pm2 start ecosystem.config.cjs

# حفظ إعدادات PM2
pm2 save

echo ""
echo "=== تم النشر بنجاح ==="
echo "التطبيق يعمل على: http://localhost:5002"
echo "Nginx reverse proxy: https://sirajalquran.org"
echo ""
echo "أوامر مفيدة:"
echo "  pm2 status          — حالة التطبيق"
echo "  pm2 logs mutqin     — سجلات التطبيق"
echo "  pm2 restart mutqin  — إعادة تشغيل"
