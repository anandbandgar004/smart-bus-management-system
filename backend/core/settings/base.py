import os
import sys
from pathlib import Path
from datetime import timedelta
from decouple import config

# Windows GDAL & GEOS auto-discovery for GeoDjango
if sys.platform == "win32":
    gdal_candidates = [
        r"C:\Program Files\GDAL",
        r"C:\OSGeo4W\bin",
        r"C:\OSGeo4W64\bin",
        r"C:\Program Files (x86)\GDAL",
    ]
    for gdal_dir in gdal_candidates:
        if os.path.exists(gdal_dir):
            if gdal_dir not in os.environ.get("PATH", ""):
                os.environ["PATH"] = gdal_dir + ";" + os.environ.get("PATH", "")
            gdal_data = os.path.join(gdal_dir, "gdal-data")
            if os.path.exists(gdal_data):
                os.environ.setdefault("GDAL_DATA", gdal_data)
            proj_lib = os.path.join(gdal_dir, "projlib")
            if os.path.exists(proj_lib):
                os.environ.setdefault("PROJ_LIB", proj_lib)
            try:
                for fname in os.listdir(gdal_dir):
                    if fname.startswith("gdal") and fname.endswith(".dll"):
                        os.environ.setdefault("GDAL_LIBRARY_PATH", os.path.join(gdal_dir, fname))
                    if fname.startswith("geos_c") and fname.endswith(".dll"):
                        os.environ.setdefault("GEOS_LIBRARY_PATH", os.path.join(gdal_dir, fname))
            except Exception:
                pass
            break

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config(
    "DJANGO_SECRET_KEY",
    default="dev-secret-key-change-in-production-only-for-local-dev",
)
DEBUG = config("DEBUG", default=True, cast=bool)
ALLOWED_HOSTS = [
    host.strip()
    for host in config("ALLOWED_HOSTS", default="*").split(",")
    if host.strip()
]

DJANGO_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "channels",
    "django_celery_beat",
    "django_celery_results",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.transit",
    "apps.fleet",
    "apps.intelligence",
    "apps.analytics",
    "apps.accounts",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": config("DB_NAME", default="busai_navigator"),
        "USER": config("DB_USER", default="busai_user"),
        "PASSWORD": config("DB_PASSWORD", default="busai_password"),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [
                (
                    config("REDIS_HOST", default="localhost"),
                    config("REDIS_PORT", default=6379, cast=int),
                )
            ],
        },
    }
}

CELERY_BROKER_URL = config("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = "django-db"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_TIMEZONE = "Asia/Kolkata"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 100,
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=12),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

OPERATOR_SECRET_KEY = config("OPERATOR_SECRET_KEY", default="OPERATOR2026")

SPECTACULAR_SETTINGS = {
    "TITLE": "BusAI Navigator API",
    "DESCRIPTION": "Intelligent Transit Management & Telemetry Streaming API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in config(
        "CORS_ALLOWED_ORIGINS",
        default="http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

# GTFS-RT Delhi Open Transit Data
DELHI_GTFS_API_KEY = config("DELHI_GTFS_API_KEY", default="")
BUS_LIMIT = config("BUS_LIMIT", default=200, cast=int)

