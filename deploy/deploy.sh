#!/bin/bash
# ══════════════════════════════════════════════════════════════
# سكربت النشر — سراج القرآن
# يُشغَّل تلقائياً من GitHub Actions أو يدوياً
#
# الاستخدام: bash deploy/deploy.sh
# ══════════════════════════════════════════════════════════════

set -e

APP_DIR="/opt/siraj-alquran"
LOG_FILE="$APP_DIR/deploy.log"
HEALTH_URL="http://localhost:5002/_health"
PM2_APP="siraj-alquran"

# ألوان
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"; }
fail() { echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"; }

echo "" >> "$LOG_FILE"
log "═══════════════════════════════════════"
log "  بدء النشر — $(date '+%Y-%m-%d %H:%M:%S')"
log "═══════════════════════════════════════"

cd "$APP_DIR"

# ── 1. حفظ الكوميت الحالي للـ rollback ──────────────────────
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "none")
log "1. الكوميت الحالي: ${PREV_COMMIT:0:8}"

# ── 2. سحب التحديثات ────────────────────────────────────────
log "2. سحب آخر التحديثات..."
git fetch origin main
git reset --hard origin/main
NEW_COMMIT=$(git rev-parse HEAD)
log "   الكوميت الجديد: ${NEW_COMMIT:0:8}"

if [ "$PREV_COMMIT" = "$NEW_COMMIT" ]; then
    log "   لا توجد تغييرات جديدة — إعادة النشر فقط"
fi

# ── 3. تثبيت المكتبات ───────────────────────────────────────
log "3. تثبيت المكتبات..."
npm ci --production=false 2>&1 | tail -3

# ── 4. بناء المشروع ─────────────────────────────────────────
log "4. بناء المشروع..."
npm run build 2>&1 | tail -5

if [ ! -f "dist/index.cjs" ]; then
    fail "فشل البناء — dist/index.cjs غير موجود!"
    exit 1
fi
log "   ✅ البناء نجح"

# ── 5. تطبيق تغييرات قاعدة البيانات ─────────────────────────
log "5. تحديث قاعدة البيانات..."
npx drizzle-kit push 2>&1 | tail -3 || warn "تحذير: فشل تحديث DB (قد تكون محدّثة)"

# ── 6. إعادة تشغيل التطبيق ──────────────────────────────────
log "6. إعادة تشغيل التطبيق..."
pm2 delete "$PM2_APP" 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
log "   PM2 started"

# ── 7. فحص صحة التطبيق ──────────────────────────────────────
log "7. فحص صحة التطبيق..."
HEALTHY=false
for i in $(seq 1 10); do
    sleep 5
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        HEALTHY=true
        log "   ✅ التطبيق يعمل (محاولة $i)"
        break
    fi
    warn "   محاولة $i: لا يستجيب..."
done

if [ "$HEALTHY" = "false" ]; then
    fail "التطبيق لا يستجيب بعد 10 محاولات!"
    log "سجلات PM2:"
    pm2 logs "$PM2_APP" --lines 20 --nostream 2>&1 | tee -a "$LOG_FILE"

    # Rollback
    if [ "$PREV_COMMIT" != "none" ] && [ "$PREV_COMMIT" != "$NEW_COMMIT" ]; then
        warn "إرجاع إلى الكوميت السابق: ${PREV_COMMIT:0:8}"
        git reset --hard "$PREV_COMMIT"
        npm ci --production=false 2>&1 | tail -1
        npm run build 2>&1 | tail -1
        pm2 reload "$PM2_APP" --update-env
        sleep 10
        if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
            log "✅ الـ rollback نجح"
        else
            fail "الـ rollback فشل أيضاً!"
        fi
    fi
    exit 1
fi

# ── 8. ملخص النشر ───────────────────────────────────────────
log "═══════════════════════════════════════"
log "  ✅ النشر اكتمل بنجاح!"
log "  الكوميت: ${NEW_COMMIT:0:8}"
log "  الموقع: https://sirajalquran.org"
log "═══════════════════════════════════════"
