#!/bin/bash
# ══════════════════════════════════════════════════════════════
# سكربت النشر — سراج القرآن
# ══════════════════════════════════════════════════════════════

set -e

APP_DIR="/opt/siraj-alquran"
LOG_FILE="$APP_DIR/deploy.log"
HEALTH_URL="http://localhost:5002/_health"
PM2_APP="siraj-alquran"

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

echo "" >> "$LOG_FILE"
log "═══════════════════════════════════════"
log "  بدء النشر — $(date '+%Y-%m-%d %H:%M:%S')"
log "═══════════════════════════════════════"

cd "$APP_DIR"

# ── 1. تحميل متغيرات البيئة ──────────────────────────────────
log "1. تحميل .env..."
if [ -f "$APP_DIR/.env" ]; then
    set -a
    source "$APP_DIR/.env"
    set +a
    log "   DATABASE_URL موجود: $(echo $DATABASE_URL | head -c 30)..."
else
    log "❌ .env غير موجود!"
    exit 1
fi

# ── 2. حفظ الكوميت الحالي للـ rollback ──────────────────────
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "none")
log "2. الكوميت الحالي: ${PREV_COMMIT:0:8}"

# ── 3. سحب التحديثات ────────────────────────────────────────
log "3. سحب آخر التحديثات..."
git fetch origin main
git reset --hard origin/main
NEW_COMMIT=$(git rev-parse HEAD)
log "   الكوميت الجديد: ${NEW_COMMIT:0:8}"

# ── 4. تثبيت المكتبات ───────────────────────────────────────
log "4. تثبيت المكتبات..."
npm ci --production=false 2>&1 | tail -3

# ── 5. بناء المشروع ─────────────────────────────────────────
log "5. بناء المشروع..."
npm run build 2>&1 | tail -5

if [ ! -f "dist/index.cjs" ]; then
    log "❌ فشل البناء!"
    exit 1
fi
log "   ✅ البناء نجح"

# ── 6. تحديث قاعدة البيانات ─────────────────────────────────
log "6. تحديث قاعدة البيانات..."
npx drizzle-kit push 2>&1 | tail -3 || log "   تحذير: migration فشل"

# ── 7. إعادة تشغيل التطبيق ──────────────────────────────────
log "7. إعادة تشغيل التطبيق..."
pm2 delete "$PM2_APP" 2>/dev/null || true

# تشغيل مع تمرير المتغيرات مباشرة
DATABASE_URL="$DATABASE_URL" \
SESSION_SECRET="$SESSION_SECRET" \
NODE_ENV="${NODE_ENV:-production}" \
PORT="${PORT:-5002}" \
DATABASE_SSL="${DATABASE_SSL:-false}" \
pm2 start ecosystem.config.cjs --update-env

pm2 save
log "   PM2 started"

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
    log "   محاولة $i: لا يستجيب..."
done

if [ "$HEALTHY" = "false" ]; then
    log "❌ التطبيق لا يستجيب!"
    pm2 logs "$PM2_APP" --lines 10 --nostream 2>&1 | tee -a "$LOG_FILE"
    exit 1
fi

log "═══════════════════════════════════════"
log "  ✅ النشر اكتمل بنجاح!"
log "  الكوميت: ${NEW_COMMIT:0:8}"
log "═══════════════════════════════════════"
