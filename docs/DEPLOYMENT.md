# دليل نشر مُتْقِن على VPS

## المتطلبات
- VPS بـ 2GB RAM على الأقل (Ubuntu 22.04+)
- نطاق (domain) يشير للسيرفر
- وصول SSH

## الخطوات

### 1. إعداد السيرفر (مرة واحدة)
```bash
bash script/setup-server.sh
```

### 2. نسخ الملفات
```bash
scp docker-compose.yml .env.example user@server:/opt/mutqin/
ssh user@server "cd /opt/mutqin && cp .env.example .env"
```

### 3. تعديل المتغيرات
```bash
ssh user@server "nano /opt/mutqin/.env"
```
عدّل:
- `SESSION_SECRET` — ولّد بـ: `openssl rand -hex 64`
- `DB_PASSWORD` — كلمة مرور قوية
- `MINIO_SECRET_KEY` — كلمة مرور MinIO

### 4. تشغيل النظام
```bash
ssh user@server "cd /opt/mutqin && docker compose up -d"
```

### 5. إعداد SSL
```bash
ssh user@server "sudo certbot --nginx -d yourdomain.com"
```

### 6. إعداد النسخ الاحتياطي
```bash
ssh user@server "crontab -e"
# أضف: 0 */6 * * * /opt/mutqin/script/backup.sh >> /opt/mutqin/logs/backup.log 2>&1
```

## التحديث
```bash
cd /opt/mutqin
docker compose pull app
docker compose up -d --no-deps app
```

## الاستعادة
```bash
bash script/restore.sh /opt/mutqin/backups/mutqin_YYYYMMDD_HHMMSS.sql.gz
```
