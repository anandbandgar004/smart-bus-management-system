import logging
from celery import shared_task
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


@shared_task(
    name="apps.fleet.tasks.fetch_gtfs_task", bind=True, max_retries=3
)
def fetch_gtfs_task(self):
    """Recurring Celery Beat task that fetches GTFS feeds and streams to WebSockets."""
    try:
        from apps.fleet.services.gtfs_ingestion import (
            fetch_and_process_bus_data,
        )

        summary = fetch_and_process_bus_data()
        channel_layer = get_channel_layer()
        if channel_layer:
            buses_list = [
                {
                    "id": bus["id"],
                    "route_id": bus["route_id"],
                    "lat": bus["lat"],
                    "lng": bus["lng"],
                    "speed_kmh": bus["speed_kmh"],
                    "delay_min": bus["delay_min"],
                    "timestamp": bus["timestamp"].isoformat(),
                }
                for bus in summary.get("buses", [])
            ]
            async_to_sync(channel_layer.group_send)(
                "fleet_updates",
                {
                    "type": "fleet.snapshot",
                    "buses": buses_list,
                },
            )
            async_to_sync(channel_layer.group_send)(
                "fleet_updates",
                {
                    "type": "analytics.summary",
                    "data": {
                        "total_in_feed": summary["total_in_feed"],
                        "emitted": summary["emitted"],
                        "per_route": summary["per_route"],
                    },
                },
            )
        return {"emitted": summary.get("emitted", 0)}
    except Exception as exc:
        logger.error("GTFS task execution failed: %s", exc)
        raise self.retry(exc=exc, countdown=5)
