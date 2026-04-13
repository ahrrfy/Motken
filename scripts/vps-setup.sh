#!/bin/bash
# =============================================================================
# سكربت إعداد سيرفر VPS لنظام سراج القرآن
# يُشغّل مرة واحدة فقط على السيرفر
#
# الاستخدام:
#   scp scripts/vps-setup.sh root@187.124.183.140:/root/
#   ssh root@187.124.183.140 "bash /root/vps-setup.sh"
#
# ⚠️ هذا السكربت آمن للسيرفرات التي عليها أنظمة أخرى:
#   - لا يحذف أي config موجود
#   - يضيف server block منفصل لـ Nginx
#   - لا يغلق أي بورتات مفتوحة
# =============================================================================

set -euo pipefail

APP_DIR="/opt/siraj-alquran"
DOMAIN="sirajalquran.org"

echo "============================================="
echo "  إعداد سيرفر سراج القرآن"
echo "  الدومين: $DOMAIN"
echo "============================================="
echo ""

# --------------------------------------------------
# 1. تحديث النظام
# --------------------------------------------------
echo "[1/8] تحديث حزم النظام..."
apt update -qq
apt upgrade -y -qq

# --------------------------------------------------
# 2. تثبيت Docker (إذا غير موجود)
# --------------------------------------------------
if command -v docker &> /dev/null; then
    echo "[2/8] Docker موجود: $(docker --version)"
else
    echo "[2/8] تثبيت Docker..."
    apt install -y -qq ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update -qq
    apt install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "   Docker تم تثبيته: $(docker --version)"
fi

# --------------------------------------------------
# 3. تثبيت Nginx (إذا غير موجود)
# --------------------------------------------------
if command -v nginx &> /dev/null; then
    echo "[3/8] Nginx موجود: $(nginx -v 2>&1)"
else
    echo "[3/8] تثبيت Nginx..."
    apt install -y -qq nginx
    systemctl enable nginx
    echo "   Nginx تم تثبيته"
fi

# --------------------------------------------------
# 4. تثبيت Certbot (إذا غير موجود)
# --------------------------------------------------
if command -v certbot &> /dev/null; then
    echo "[4/8] Certbot موجود"
else
    echo "[4/8] تثبيت Certbot..."
    apt install -y -qq certbot python3-certbot-nginx
    echo "   Certbot تم تثبيته"
fi

# --------------------------------------------------
# 5. إعداد UFW (فتح البورتات بدون إغلاق الموجود)
# --------------------------------------------------
echo "[5/8] إعداد Firewall..."
if ! ufw status | grep -q "Status: active"; then
    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    ufw --force enable
    echo "   UFW مفعّل"
else
    ufw allow 'Nginx Full'
    echo "   UFW موجود — أضفنا Nginx Full فقط"
fi

# --------------------------------------------------
# 6. إنشاء مجلد التطبيق
# --------------------------------------------------
echo "[6/8] إعداد مجلد التطبيق..."
mkdir -p "$APP_DIR"

# إنشاء ملف .env إذا غير موجود
if [ ! -f "$APP_DIR/.env" ]; then
    cat > "$APP_DIR/.env" << 'ENVFILE'
# === سراج القرآن — متغيرات البيئة ===
# أنشئ كلمات سر قوية قبل التشغيل!

# قاعدة البيانات
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# الجلسات (أنشئ بـ: openssl rand -hex 64)
SESSION_SECRET=CHANGE_ME_RANDOM_HEX

# MinIO (تخزين الملفات)
MINIO_ACCESS_KEY=CHANGE_ME
MINIO_SECRET_KEY=CHANGE_ME_STRONG
ENVFILE
    echo "   تم إنشاء .env — عدّل القيم قبل التشغيل!"
else
    echo "   .env موجود"
fi

# --------------------------------------------------
# 7. إعداد Nginx server block (ملف منفصل — لا يمس الموجود)
# --------------------------------------------------
echo "[7/8] إعداد Nginx..."
NGINX_CONF="/etc/nginx/sites-available/siraj-alquran"

# إنشاء config مؤقت بدون SSL (Certbot يضيفه لاحقاً)
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

# تفعيل الموقع
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/siraj-alquran

# اختبار config
if nginx -t 2>/dev/null; then
    systemctl reload nginx
    echo "   Nginx معاد التحميل بنجاح"
else
    echo "   ⚠️ خطأ في Nginx config — تحقق يدوياً"
fi

# --------------------------------------------------
# 8. تعليمات ما بعد الإعداد
# --------------------------------------------------
echo ""
echo "============================================="
echo "  الإعداد اكتمل!"
echo "============================================="
echo ""
echo "الخطوات التالية:"
echo ""
echo "1. عدّل قيم .env:"
echo "   nano $APP_DIR/.env"
echo ""
echo "2. انسخ docker-compose files:"
echo "   scp docker-compose.yml docker-compose.prod.yml root@187.124.183.140:$APP_DIR/"
echo ""
echo "3. سجّل دخول GHCR (من GitHub → Settings → Tokens):"
echo "   echo YOUR_TOKEN | docker login ghcr.io -u ahrrfy --password-stdin"
echo ""
echo "4. شغّل الخدمات:"
echo "   cd $APP_DIR && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
echo ""
echo "5. فعّل SSL (بعد توجيه DNS):"
echo "   certbot --nginx -d sirajalquran.org -d www.sirajalquran.org"
echo ""
echo "6. تحقق:"
echo "   curl http://localhost:5002/_health"
echo ""
