#!/usr/bin/env bash
# SSL через certbot (после того как HTTP уже отвечает на домене)
set -euo pipefail

DOMAIN="${1:-mail.dealercms.ru}"
EMAIL="${2:-fydorzbinyakov@gmail.com}"

cd "$(dirname "$0")/.."

mkdir -p deploy/certbot/www deploy/certbot/conf

docker compose -f docker-compose.prod.yml run --rm --entrypoint certbot \
  -v "$(pwd)/deploy/certbot/www:/var/www/certbot" \
  -v "$(pwd)/deploy/certbot/conf:/etc/letsencrypt" \
  nginx \
  certonly --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email

cp deploy/nginx.ssl.conf deploy/nginx.conf
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "SSL готов: https://$DOMAIN"
