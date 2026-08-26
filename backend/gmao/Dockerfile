FROM php:8.4-fpm-alpine AS base

# System dependencies
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    oniguruma-dev \
    icu-dev \
    mysql-client \
    shadow

# PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
        opcache

# Composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Install dependencies first (better layer caching)
# Dev dependencies included so the vendor in the named volume matches local bootstrap cache
COPY composer.json composer.lock ./
RUN composer install --no-scripts --prefer-dist --no-interaction

# Copy source code (vendor is excluded via .dockerignore)
COPY . .

# Dummy env so artisan commands work during build
ENV APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
ENV DB_CONNECTION=sqlite
ENV DB_DATABASE=/tmp/build.sqlite

# Optimise autoloader + discover packages
RUN composer dump-autoload --optimize \
    && touch /tmp/build.sqlite \
    && php artisan package:discover --ansi 2>/dev/null || true \
    && rm -f /tmp/build.sqlite

# Create required storage directories
RUN mkdir -p \
    storage/framework/sessions \
    storage/framework/views \
    storage/framework/cache/data \
    storage/logs \
    bootstrap/cache

# Permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

# PHP config
COPY docker/php/php.ini $PHP_INI_DIR/conf.d/app.ini

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["php-fpm"]
