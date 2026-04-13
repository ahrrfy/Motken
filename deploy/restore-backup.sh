#!/bin/bash
# استعادة النسخة الاحتياطية — سراج القرآن
# الاستخدام: bash deploy/restore-backup.sh

set -e
APP_DIR="/opt/siraj-alquran"
BACKUP="$APP_DIR/deploy/backup-seed.json"

cd "$APP_DIR"

# تحميل .env
set -a
source "$APP_DIR/.env"
set +a

echo "═══════════════════════════════════════"
echo "  استعادة النسخة الاحتياطية"
echo "═══════════════════════════════════════"

if [ ! -f "$BACKUP" ]; then
    echo "❌ ملف الـ backup غير موجود: $BACKUP"
    exit 1
fi

echo "الملف: $BACKUP"
echo "DATABASE_URL: $(echo $DATABASE_URL | head -c 40)..."
echo ""

node -e "
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function restore() {
  const backup = JSON.parse(fs.readFileSync('$BACKUP', 'utf8'));
  console.log('الجداول:', Object.keys(backup.data).length);
  console.log('السجلات:', backup.metadata.totalRecords);
  console.log('');

  // ترتيب الجداول — الجداول المرجعية أولاً
  const priority = ['mosques', 'users', 'courses', 'courseStudents', 'courseTeachers'];
  const tables = Object.entries(backup.data).sort((a, b) => {
    const ai = priority.indexOf(a[0]);
    const bi = priority.indexOf(b[0]);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });

  let totalInserted = 0;

  for (const [table, records] of tables) {
    if (!Array.isArray(records) || records.length === 0) continue;

    const cols = Object.keys(records[0]);
    let inserted = 0;

    for (const row of records) {
      const vals = cols.map(c => {
        const v = row[c];
        if (v === null || v === undefined) return null;
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      });
      const placeholders = cols.map((_, i) => '\$' + (i + 1)).join(',');
      const colNames = cols.map(c => '\"' + c + '\"').join(',');
      try {
        await pool.query(
          'INSERT INTO \"' + table + '\" (' + colNames + ') VALUES (' + placeholders + ') ON CONFLICT DO NOTHING',
          vals
        );
        inserted++;
      } catch (e) {
        // تخطي الأخطاء (foreign key, etc)
      }
    }

    if (inserted > 0) {
      console.log('  ✅ ' + table + ': ' + inserted + '/' + records.length);
      totalInserted += inserted;
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  ✅ تم استيراد ' + totalInserted + ' سجل');
  console.log('═══════════════════════════════════════');

  await pool.end();
}

restore().catch(e => { console.error('❌', e.message); process.exit(1); });
"
