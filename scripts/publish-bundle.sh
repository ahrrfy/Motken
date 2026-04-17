#!/usr/bin/env bash
# نشر حزمة OTA جديدة إلى السيرفر بدون بناء APK
# الاستخدام: VERSION=1.2.0 OTA_ADMIN_COOKIE="connect.sid=..." bash scripts/publish-bundle.sh "ملاحظات الإصدار"

set -euo pipefail

VERSION="${VERSION:-}"
SERVER_URL="${SERVER_URL:-https://sirajalquran.org}"
RELEASE_NOTES="${1:-تحديث الواجهة}"
ACTIVATE="${ACTIVATE:-true}"

if [ -z "$VERSION" ]; then
  VERSION=$(node -p "require('./package.json').version")
fi

if [ -z "${OTA_ADMIN_COOKIE:-}" ]; then
  echo "❌ OTA_ADMIN_COOKIE غير محدد. سجّل دخول كـ admin وانسخ cookie connect.sid"
  exit 1
fi

echo "📦 بناء الواجهة..."
npm run build

BUNDLE_DIR="dist/public"
BUNDLE_ZIP="dist/bundle-v${VERSION}.zip"

if [ ! -d "$BUNDLE_DIR" ]; then
  echo "❌ مجلد $BUNDLE_DIR غير موجود"
  exit 1
fi

echo "🗜️  ضغط الحزمة..."
rm -f "$BUNDLE_ZIP"
(cd "$BUNDLE_DIR" && zip -r "../bundle-v${VERSION}.zip" . -q)

SIZE=$(stat -c%s "$BUNDLE_ZIP" 2>/dev/null || stat -f%z "$BUNDLE_ZIP")
SIZE_MB=$(echo "scale=2; $SIZE / 1024 / 1024" | bc)
echo "📊 حجم الحزمة: ${SIZE_MB} MB"

echo "🚀 رفع الحزمة إلى $SERVER_URL..."
curl -sS -X POST "$SERVER_URL/api/admin/ota/bundles" \
  -H "Cookie: $OTA_ADMIN_COOKIE" \
  -F "version=$VERSION" \
  -F "releaseNotes=$RELEASE_NOTES" \
  -F "activate=$ACTIVATE" \
  -F "file=@$BUNDLE_ZIP" | jq . || true

echo ""
echo "✅ تم! الإصدار $VERSION جاهز."
echo "   سيستلم المستخدمون التحديث عند الفتح التالي لتطبيقهم."
