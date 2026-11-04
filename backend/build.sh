#!/usr/bin/env bash
# build.sh — Render.com build script for Django backend
# This runs during every deploy on Render

set -o errexit

echo "==> Installing production dependencies..."
pip install --upgrade pip
pip install -r requirements/prod.txt

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Running database migrations..."
python manage.py migrate --noinput

echo "==> Build complete!"
