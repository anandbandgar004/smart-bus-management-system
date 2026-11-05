#!/bin/sh
set -e

echo "==> [1/3] Running database migrations..."
python manage.py migrate --noinput

echo "==> [2/3] Seeding Delhi Transit Network..."
# Populates Delhi transit corridors, routes, and stops
python manage.py seed_delhi_network || true

echo "==> [3/3] Setting up superuser..."
python -c "
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', os.environ.get('DJANGO_SETTINGS_MODULE', 'core.settings.production'))
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', '')

if password:
    if not User.objects.filter(username=username).exists():
        User.objects.create_superuser(username=username, email=email, password=password)
        print(f'==> Superuser \"{username}\" created successfully.')
    else:
        print(f'==> Superuser \"{username}\" already exists.')
else:
    print('==> DJANGO_SUPERUSER_PASSWORD not set. Skipping automatic superuser creation.')
" || true

echo "==> [4/4] Fetching initial GTFS fleet snapshot..."
python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', os.environ.get('DJANGO_SETTINGS_MODULE', 'core.settings.production'))
django.setup()
from apps.fleet.services.gtfs_ingestion import fetch_and_process_bus_data
try:
    res = fetch_and_process_bus_data()
    print(f'==> Ingested {len(res.get(\"buses\", []))} live buses into PostGIS.')
except Exception as e:
    print(f'==> Warning: Initial GTFS ingest failed ({e}), simulator fallback will be used.')
" || true

echo "==> Starting Daphne ASGI server..."
exec daphne -b 0.0.0.0 -p 8000 core.asgi:application

