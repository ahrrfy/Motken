#!/bin/bash
# إعداد VPS أول مرة — يُشغّل مرة واحدة فقط
# Usage: bash script/setup-server.sh

set -euo pipefail

echo "=== إعداد خادم مُتْقِن ==="

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER
  echo "Docker installed. Please log out and log in again."
fi

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Create app directory
sudo mkdir -p /opt/mutqin
sudo chown $USER:$USER /opt/mutqin

# Setup firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo ""
echo "=== الإعداد اكتمل ==="
echo "الخطوات التالية:"
echo "1. انسخ docker-compose.yml و .env إلى /opt/mutqin/"
echo "2. عدّل .env بالقيم الحقيقية"
echo "3. شغّل: cd /opt/mutqin && docker compose up -d"
echo "4. أعدّ SSL: sudo certbot --nginx -d yourdomain.com"
