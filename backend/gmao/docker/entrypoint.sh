#!/bin/sh

echo "Waiting for database..."
until php artisan db:show > /dev/null 2>&1; do
    sleep 2
done

echo "Running migrations..."
php artisan migrate --force || echo "Migration warning (may be ok on fresh install)"

php artisan storage:link --force 2>/dev/null || true

# Regenerate package discovery cache to match the actual vendor
php artisan package:discover --ansi 2>/dev/null || true

if [ "$APP_ENV" = "production" ]; then
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
fi

exec "$@"
