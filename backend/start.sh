#!/bin/sh
set -e

echo "▶ Running database migrations..."
npx prisma migrate deploy

echo "✅ Migrations complete. Starting BusBnB API..."
exec node dist/index.js
