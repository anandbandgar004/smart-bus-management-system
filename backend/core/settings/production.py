from .base import *  # noqa: F403, F401
from decouple import config
import dj_database_url

DEBUG = False
ALLOWED_HOSTS = [
    host.strip()
    for host in config("ALLOWED_HOSTS", default="").split(",")
    if host.strip()
]

# ── Database (parse DATABASE_URL from Neon / Render / Railway) ────────
database_url = config("DATABASE_URL", default=None)
if database_url:
    DATABASES["default"] = dj_database_url.parse(  # noqa: F405
        database_url,
        engine="django.contrib.gis.db.backends.postgis",
    )
    # Neon requires SSL
    if "neon.tech" in database_url:
        DATABASES["default"]["OPTIONS"] = {"sslmode": "require"}

# ── Redis / Channels (parse REDIS_URL from Upstash / Render / Railway) ──
redis_url = config("REDIS_URL", default="").strip()
CELERY_BROKER_URL = redis_url if redis_url else "redis://localhost:6379/0"  # noqa: F405

if redis_url and not redis_url.startswith("redis://localhost"):
    CHANNEL_LAYERS = {  # noqa: F405
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [redis_url],
            },
        }
    }
else:
    redis_host = config("REDIS_HOST", default="localhost")
    redis_port = config("REDIS_PORT", default=6379, cast=int)
    if redis_host != "localhost":
        CHANNEL_LAYERS = {  # noqa: F405
            "default": {
                "BACKEND": "channels_redis.core.RedisChannelLayer",
                "CONFIG": {
                    "hosts": [(redis_host, redis_port)],
                },
            }
        }
    else:
        # In-memory channel layer fallback for single-instance free tiers
        CHANNEL_LAYERS = {  # noqa: F405
            "default": {
                "BACKEND": "channels.layers.InMemoryChannelLayer",
            }
        }

# ── Security Hardening ────────────────────────────────────────────────
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Trust proxy headers from Render/Railway
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# ── Static Files (WhiteNoise — no need for separate static hosting) ──
MIDDLEWARE.insert(2, "whitenoise.middleware.WhiteNoiseMiddleware")  # noqa: F405
STATIC_ROOT = BASE_DIR / "staticfiles"  # noqa: F405
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# ── CORS (allow frontend domain) ─────────────────────────────────────
CORS_ALLOWED_ORIGINS = [  # noqa: F405
    origin.strip()
    for origin in config(
        "CORS_ALLOWED_ORIGINS",
        default="",
    ).split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True  # noqa: F405

# ── Logging ───────────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "apps": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
