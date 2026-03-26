#!/bin/bash
# ═══════════════════════════════════════════════════════════
# نظام التحقق الصارم — مكافحة حلقة الوهم
# ═══════════════════════════════════════════════════════════
# الاستخدام:
#   verify-fix.sh verify <file> <pattern> <description>
#   verify-fix.sh build
#   verify-fix.sh check-all
#   verify-fix.sh log <file> <old_code> <new_code> <description>
# ═══════════════════════════════════════════════════════════

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FIX_LOG="$PROJECT_ROOT/.claude/fix-log.md"
TRACKER="$PROJECT_ROOT/.claude/.fix-tracker"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# ─── ألوان ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── تأكد من وجود ملف السجل ───
init_log() {
  if [ ! -f "$FIX_LOG" ]; then
    echo "# سجل الإصلاحات المُثبتة" > "$FIX_LOG"
    echo "" >> "$FIX_LOG"
    echo "> هذا الملف يُكتب تلقائياً بواسطة verify-fix.sh" >> "$FIX_LOG"
    echo "> كل إصلاح مسجل هنا تم التحقق منه بـ grep + build" >> "$FIX_LOG"
    echo "" >> "$FIX_LOG"
  fi
}

# ─── تحقق من إصلاح واحد ───
verify() {
  local file="$1"
  local pattern="$2"
  local desc="${3:-}"
  local full_path="$PROJECT_ROOT/$file"

  if [ ! -f "$full_path" ]; then
    echo -e "${RED}❌ الملف غير موجود: $file${NC}"
    return 1
  fi

  local result
  result=$(grep -n "$pattern" "$full_path" 2>/dev/null || true)

  if [ -n "$result" ]; then
    local line_num
    line_num=$(echo "$result" | head -1 | cut -d: -f1)
    echo -e "${GREEN}✅ موجود — السطر $line_num في $file${NC}"
    echo -e "   ${CYAN}$result${NC}"
    return 0
  else
    echo -e "${RED}❌ غير موجود — النمط '$pattern' لا يوجد في $file${NC}"
    return 1
  fi
}

# ─── فحص البناء ───
build() {
  echo -e "${CYAN}🔨 جاري فحص البناء...${NC}"
  cd "$PROJECT_ROOT"

  local build_output
  local build_status

  build_output=$(npx vite build --mode development 2>&1) && build_status=0 || build_status=$?

  if [ $build_status -eq 0 ]; then
    echo -e "${GREEN}✅ البناء نجح بدون أخطاء${NC}"

    # سجّل في fix-log
    init_log
    echo "### [$TIMESTAMP] — فحص بناء ناجح" >> "$FIX_LOG"
    echo '```' >> "$FIX_LOG"
    echo "$build_output" | tail -3 >> "$FIX_LOG"
    echo '```' >> "$FIX_LOG"
    echo "" >> "$FIX_LOG"

    # أعد تعيين عداد المحاولات
    echo "0" > "$TRACKER"
    return 0
  else
    # عدّ المحاولات الفاشلة
    local attempts=0
    [ -f "$TRACKER" ] && attempts=$(cat "$TRACKER" 2>/dev/null || echo 0)
    attempts=$((attempts + 1))
    echo "$attempts" > "$TRACKER"

    echo -e "${RED}❌ فشل البناء (المحاولة #$attempts)${NC}"
    echo "$build_output" | tail -10

    if [ "$attempts" -ge 3 ]; then
      echo ""
      echo -e "${RED}═══════════════════════════════════════════════${NC}"
      echo -e "${RED}⛔ تحذير: 3 محاولات فاشلة متتالية!${NC}"
      echo -e "${RED}   توقف وغيّر المنهج أو اسأل المستخدم${NC}"
      echo -e "${RED}═══════════════════════════════════════════════${NC}"
    fi

    return 1
  fi
}

# ─── تسجيل إصلاح مع دليل ───
log_fix() {
  local file="$1"
  local old_code="$2"
  local new_code="$3"
  local desc="$4"

  init_log

  # تحقق أن الكود الجديد موجود فعلاً
  local full_path="$PROJECT_ROOT/$file"
  local grep_result
  grep_result=$(grep -n "$new_code" "$full_path" 2>/dev/null | head -1 || true)

  local verify_status="❌ لم يُتحقق"
  if [ -n "$grep_result" ]; then
    verify_status="✅ مُثبت — السطر $(echo "$grep_result" | cut -d: -f1)"
  fi

  # اكتب في السجل
  {
    echo "---"
    echo ""
    echo "## [$TIMESTAMP] — $desc"
    echo "- **الملف**: \`$file\`"
    echo "- **قبل**: \`$old_code\`"
    echo "- **بعد**: \`$new_code\`"
    echo "- **دليل grep**: $verify_status"
    if [ -n "$grep_result" ]; then
      echo "  \`\`\`"
      echo "  $grep_result"
      echo "  \`\`\`"
    fi
    echo "- **الحالة**: $verify_status"
    echo ""
  } >> "$FIX_LOG"

  if [ -n "$grep_result" ]; then
    echo -e "${GREEN}✅ تم تسجيل الإصلاح مع الدليل في fix-log.md${NC}"
  else
    echo -e "${RED}❌ تحذير: الكود الجديد غير موجود في الملف! الإصلاح لم يُطبّق فعلياً${NC}"
  fi
}

# ─── فحص جميع الإصلاحات المسجلة ───
check_all() {
  if [ ! -f "$FIX_LOG" ]; then
    echo -e "${YELLOW}📝 لا يوجد سجل إصلاحات بعد${NC}"
    return 0
  fi

  echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
  echo -e "${CYAN}  فحص جميع الإصلاحات المسجلة${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
  echo ""

  local total=0
  local passed=0
  local failed=0

  # استخرج أزواج (ملف، كود جديد) من السجل
  while IFS= read -r line; do
    if echo "$line" | grep -q '^\- \*\*الملف\*\*:'; then
      local file
      file=$(echo "$line" | sed 's/.*`\(.*\)`.*/\1/')

      # اقرأ السطر التالي (بعد)
      read -r next_line || true
      read -r after_line || true

      if echo "$after_line" | grep -q '^\- \*\*بعد\*\*:'; then
        local pattern
        pattern=$(echo "$after_line" | sed 's/.*`\(.*\)`.*/\1/')

        total=$((total + 1))
        local full="$PROJECT_ROOT/$file"

        if [ -f "$full" ] && grep -q "$pattern" "$full" 2>/dev/null; then
          echo -e "  ${GREEN}✅ [$total] $file — موجود${NC}"
          passed=$((passed + 1))
        else
          echo -e "  ${RED}❌ [$total] $file — مفقود!${NC}"
          failed=$((failed + 1))
        fi
      fi
    fi
  done < "$FIX_LOG"

  echo ""
  echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
  echo -e "  الإجمالي: $total | ${GREEN}نجح: $passed${NC} | ${RED}فشل: $failed${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════${NC}"

  if [ "$failed" -gt 0 ]; then
    return 1
  fi
  return 0
}

# ─── الأمر الرئيسي ───
case "${1:-help}" in
  verify)
    verify "${2:-}" "${3:-}" "${4:-}"
    ;;
  build)
    build
    ;;
  log)
    log_fix "${2:-}" "${3:-}" "${4:-}" "${5:-}"
    ;;
  check-all)
    check_all
    ;;
  *)
    echo "الاستخدام:"
    echo "  verify-fix.sh verify <file> <pattern> [description]"
    echo "  verify-fix.sh build"
    echo "  verify-fix.sh log <file> <old_code> <new_code> <description>"
    echo "  verify-fix.sh check-all"
    ;;
esac
