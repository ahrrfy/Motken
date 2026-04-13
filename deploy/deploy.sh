#!/bin/bash
# ══════════════════════════════════════════════════════════════
# سكربت النشر — سراج القرآن
# بنفس نمط نظام ERP المستقر
#
# يُشغَّل تلقائياً من GitHub Actions أو يدوياً:
#   cd /opt/siraj-alquran && bash deploy/deploy.sh
# ══════════════════════════════════════════════════════════════

set -e

APP_DIR="/opt/siraj-alquran"
APP_NAME="siraj-alquran"
HEALTH_URL="http://localhost:5002/_health"
LOG_FILE="$APP_DIR/logs/deploy.log"

# ── ألوان ─────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"; }
fail() { echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"; }

mkdir -p "$APP_DIR/logs"
echo "" >> "$LOG_FILE"
log "═══════════════════════════════════════"
log "  بدء النشر — $(date '+%Y-%m-%d %H:%M:%S')"
log "═══════════════════════════════════════"

cd "$APP_DIR"

# ── 1. تحميل متغيرات البيئة ──────────────────────────────────
log "1. تحميل متغيرات البيئة..."
if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
    set -a
    source .env
    set +a
    log "   تم تحميل .env"
elif [ -n "${DATABASE_URL:-}" ]; then
    log "   DATABASE_URL موجود بالفعل (من GitHub Secrets)"
else
    fail ".env غير موجود و DATABASE_URL غير محدد!"
    exit 1
fi

# ── 2. حفظ الكوميت الحالي ────────────────────────────────────
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "none")
log "2. الكوميت الحالي: ${PREV_COMMIT:0:8}"

# ── 3. سحب التحديثات ────────────────────────────────────────
log "3. سحب آخر التحديثات..."
git fetch origin main
git reset --hard origin/main
NEW_COMMIT=$(git rev-parse HEAD)
log "   الكوميت الجديد: ${NEW_COMMIT:0:8}"

if [ "$PREV_COMMIT" = "$NEW_COMMIT" ]; then
    log "   لا توجد تغييرات — إعادة النشر فقط"
fi

# ── 4. تثبيت المكتبات ───────────────────────────────────────
log "4. تثبيت المكتبات..."
npm ci --production=false 2>&1 | tail -3

# ── 5. بناء المشروع ─────────────────────────────────────────
log "5. بناء المشروع..."
npm run build 2>&1 | tail -5

if [ ! -f "dist/index.cjs" ]; then
    fail "فشل البناء — dist/index.cjs غير موجود!"
    exit 1
fi
log "   ✅ البناء نجح"

# ── 6. تحديث قاعدة البيانات ─────────────────────────────────
log "6. تحديث قاعدة البيانات..."
timeout 120 npx drizzle-kit push 2>&1 | tail -3 || warn "migration فشل (قد تكون محدّثة)"

# ── 7. إعادة تشغيل التطبيق (Zero-Downtime) ──────────────────
log "7. إعادة تشغيل التطبيق..."
if pm2 list | grep -q "$APP_NAME"; then
    pm2 reload "$APP_NAME" --update-env
    log "   ✅ تم إعادة التحميل (بدون قطع الاتصالات)"
else
    pm2 start deploy/ecosystem.config.cjs --update-env
    pm2 save
    log "   ✅ تم التشغيل لأول مرة"
fi

# ── 8. فحص صحة التطبيق ──────────────────────────────────────
log "8. فحص صحة التطبيق..."
HEALTHY=false
for i in $(seq 1 10); do
    sleep 5
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        HEALTHY=true
        log "   ✅ التطبيق يعمل (محاولة $i)"
        break
    fi
    warn "   محاولة $i/10: لا يستجيب..."
done

if [ "$HEALTHY" = "false" ]; then
    fail "التطبيق لا يستجيب بعد 10 محاولات!"
    log "سجلات PM2:"
    pm2 logs "$APP_NAME" --lines 20 --nostream 2>&1 | tee -a "$LOG_FILE"

    # Rollback إذا فيه كوميت سابق مختلف
    if [ "$PREV_COMMIT" != "none" ] && [ "$PREV_COMMIT" != "$NEW_COMMIT" ]; then
        warn "إرجاع إلى: ${PREV_COMMIT:0:8}"
        git reset --hard "$PREV_COMMIT"
        npm ci --production=false 2>&1 | tail -1
        npm run build 2>&1 | tail -1
        pm2 reload "$APP_NAME" --update-env
        sleep 10
        if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
            log "✅ الـ rollback نجح — التطبيق يعمل بالنسخة السابقة"
        else
            fail "الـ rollback فشل أيضاً!"
        fi
    fi
    exit 1
fi

# ── 9. حفظ PM2 ──────────────────────────────────────────────
pm2 save

log "═══════════════════════════════════════"
log "  ✅ النشر اكتمل بنجاح!"
log "  الكوميت: ${NEW_COMMIT:0:8}"
log "  الموقع: https://sirajalquran.org"
log "═══════════════════════════════════════"
