#!/bin/bash
# =============================================================================
# سكربت إعداد سيرفر VPS لنظام سراج القرآن
# يُشغّل مرة واحدة فقط على السيرفر
#
# الاستخدام:
#   ssh root@187.124.183.140
#   curl -sL https://raw.githubusercontent.com/ahrrfy/Motken/main/scripts/vps-setup.sh | bash
#
# ⚠️ هذا السكربت آمن للسيرفرات التي عليها أنظمة أخرى
# =============================================================================

set -euo pipefail

APP_DIR="/opt/siraj-alquran"
DOMAIN="sirajalquran.org"
REPO="https://github.com/ahrrfy/Motken.git"

echo "============================================="
echo "  إعداد سيرفر سراج القرآن"
echo "  الدومين: $DOMAIN"
echo "============================================="

# --------------------------------------------------
# 1. تحديث النظام
# --------------------------------------------------
echo "[1/8] تحديث حزم النظام..."
apt update -qq && apt upgrade -y -qq

# --------------------------------------------------
# 2. تثبيت Node.js 20 (إذا غير موجود)
# --------------------------------------------------
if command -v node &> /dev/null && [[ "$(node -v)" == v20* ]]; then
    echo "[2/8] Node.js موجود: $(node -v)"
else
    echo "[2/8] تثبيت Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y -qq nodejs
    echo "   Node.js تم تثبيته: $(node -v)"
fi

# --------------------------------------------------
# 3. تثبيت PM2 (إذا غير موجود)
# --------------------------------------------------
if command -v pm2 &> /dev/null; then
    echo "[3/8] PM2 موجود"
else
    echo "[3/8] تثبيت PM2..."
    npm install -g pm2
    pm2 startup systemd -u root --hp /root
    echo "   PM2 تم تثبيته"
fi

# --------------------------------------------------
# 4. تثبيت PostgreSQL (إذا غير موجود)
# --------------------------------------------------
if command -v psql &> /dev/null; then
    echo "[4/8] PostgreSQL موجود"
else
    echo "[4/8] تثبيت PostgreSQL..."
    apt install -y -qq postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql

    # إنشاء قاعدة البيانات والمستخدم
    sudo -u postgres psql -c "CREATE USER siraj WITH PASSWORD 'siraj_strong_password_change_me';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE siraj_alquran OWNER siraj;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE siraj_alquran TO siraj;" 2>/dev/null || true
    echo "   PostgreSQL تم تثبيته"
fi

# --------------------------------------------------
# 5. تثبيت Nginx (إذا غير موجود)
# --------------------------------------------------
if command -v nginx &> /dev/null; then
    echo "[5/8] Nginx موجود"
else
    echo "[5/8] تثبيت Nginx..."
    apt install -y -qq nginx
    systemctl enable nginx
fi

# تثبيت Certbot
if ! command -v certbot &> /dev/null; then
    apt install -y -qq certbot python3-certbot-nginx
fi

# --------------------------------------------------
# 6. استنساخ المشروع
# --------------------------------------------------
echo "[6/8] إعداد مجلد التطبيق..."
if [ -d "$APP_DIR/.git" ]; then
    echo "   المشروع موجود — تحديث..."
    cd "$APP_DIR"
    git fetch origin main
    git reset --hard origin/main
else
    echo "   استنساخ المشروع..."
    git clone "$REPO" "$APP_DIR"
    cd "$APP_DIR"
fi

mkdir -p "$APP_DIR/logs"

# --------------------------------------------------
# 7. إنشاء ملف .env
# --------------------------------------------------
if [ ! -f "$APP_DIR/.env" ]; then
    SESSION_SECRET=$(openssl rand -hex 64)
    cat > "$APP_DIR/.env" << ENVFILE
# === سراج القرآن — متغيرات البيئة ===
DATABASE_URL=postgresql://siraj:siraj_strong_password_change_me@localhost:5432/siraj_alquran
SESSION_SECRET=$SESSION_SECRET
PORT=5002
NODE_ENV=production
DATABASE_SSL=false
ENVFILE
    echo "   ✅ تم إنشاء .env"
else
    echo "   .env موجود"
fi

# --------------------------------------------------
# 8. إعداد Nginx
# --------------------------------------------------
echo "[7/8] إعداد Nginx..."
NGINX_CONF="/etc/nginx/sites-available/siraj-alquran"

cat > "$NGINX_CONF" << 'NGINXCONF'
server {
    listen 80;
    server_name sirajalquran.org www.sirajalquran.org;

    client_max_body_size 50M;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 1000;

    location /assets/ {
        proxy_pass http://127.0.0.1:5002;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /ws {
        proxy_pass http://127.0.0.1:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://127.0.0.1:5002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINXCONF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/siraj-alquran
nginx -t && systemctl reload nginx
echo "   ✅ Nginx جاهز"

# --------------------------------------------------
# 9. بناء وتشغيل التطبيق
# --------------------------------------------------
echo "[8/8] بناء وتشغيل التطبيق..."
cd "$APP_DIR"
npm ci --production=false
npm run build

# تشغيل Database migration
npx drizzle-kit push 2>&1 || echo "تحذير: فشل migration"

# تشغيل PM2
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "============================================="
echo "  ✅ الإعداد اكتمل!"
echo "============================================="
echo ""
echo "الخطوات التالية:"
echo ""
echo "1. عدّل كلمة سر DB في .env:"
echo "   nano $APP_DIR/.env"
echo ""
echo "2. فعّل SSL:"
echo "   certbot --nginx -d sirajalquran.org -d www.sirajalquran.org"
echo ""
echo "3. تحقق:"
echo "   curl http://localhost:5002/_health"
echo "   pm2 status"
echo ""
