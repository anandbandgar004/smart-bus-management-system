import os
import django
import threading
import time
import logging
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

logger = logging.getLogger(__name__)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.development")
django.setup()

from apps.fleet.routing import websocket_urlpatterns  # noqa: E402


def _start_background_telemetry_loop():
    """Background ingestion loop that runs inside the Daphne process.
    Ensures telemetry updates continue streaming even when Celery workers
    are not running (e.g. on Render Free Tier).
    """
    def loop():
        time.sleep(3)  # brief wait for ASGI bind
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        from apps.fleet.services.gtfs_ingestion import fetch_and_process_bus_data

        while True:
            try:
                summary = fetch_and_process_bus_data()
                channel_layer = get_channel_layer()
                if channel_layer and summary and "buses" in summary:
                    buses_list = [
                        {
                            "id": bus["id"],
                            "route_id": bus.get("route_id") or "DTC",
                            "lat": bus["lat"],
                            "lng": bus["lng"],
                            "speed_kmh": bus["speed_kmh"],
                            "delay_min": bus["delay_min"],
                            "timestamp": (
                                bus["timestamp"].isoformat()
                                if hasattr(bus["timestamp"], "isoformat")
                                else str(bus["timestamp"])
                            ),
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
            except Exception as e:
                logger.warning("Background telemetry loop error: %s", e)

            time.sleep(15)

    thread = threading.Thread(
        target=loop, daemon=True, name="TelemetryIngestionThread"
    )
    thread.start()


_start_background_telemetry_loop()

application = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "websocket": AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    }
)
