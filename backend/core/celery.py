import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.development")

app = Celery("busai_navigator")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "gtfs-15s": {
        "task": "apps.fleet.tasks.fetch_gtfs_task",
        "schedule": 15.0,
    },
    "ai-60s": {
        "task": "apps.intelligence.tasks.run_ai_analytics_task",
        "schedule": 60.0,
    },
}
