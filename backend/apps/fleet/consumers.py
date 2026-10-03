import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class FleetConsumer(AsyncWebsocketConsumer):
    GROUP_NAME = "fleet_updates"

    @database_sync_to_async
    def get_initial_fleet(self):
        from apps.fleet.models import Bus
        qs = (
            Bus.objects.filter(status="active", last_location__isnull=False)
            .select_related("current_route")
            .order_by("-last_telemetry_at")[:200]
        )
        return [
            {
                "id": b.id,
                "route_id": b.current_route_id,
                "lat": b.last_location.y,
                "lng": b.last_location.x,
                "speed_kmh": float(b.last_speed_kmh),
                "delay_min": b.last_delay_min,
                "timestamp": b.last_telemetry_at.isoformat() if b.last_telemetry_at else None,
            }
            for b in qs
        ]

    @database_sync_to_async
    def get_initial_incidents(self):
        from apps.intelligence.models import Incident
        qs = Incident.objects.filter(status="pending").order_by("-detected_at")[:15]
        return [
            {
                "type": inc.incident_type,
                "severity": inc.severity,
                "title": inc.title,
                "description": inc.description,
                "solution": inc.suggested_action,
            }
            for inc in qs
        ]

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()

        try:
            buses = await self.get_initial_fleet()
            if buses:
                await self.send(
                    json.dumps({"type": "fleet_snapshot", "buses": buses})
                )
            incidents = await self.get_initial_incidents()
            if incidents:
                await self.send(
                    json.dumps({"type": "ai_suggestions", "data": {"items": incidents}})
                )
        except Exception as e:
            logger.warning("Error sending initial WebSocket snapshot: %s", e)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.GROUP_NAME, self.channel_name
        )

    async def receive(self, text_data):
        try:
            # Client messages (e.g. route subscription filters) can be parsed here
            data = json.loads(text_data)
        except json.JSONDecodeError:
            pass

    # ── Handlers called by Celery via channel_layer.group_send ──

    async def fleet_snapshot(self, event):
        await self.send(
            json.dumps({"type": "fleet_snapshot", "buses": event["buses"]})
        )

    async def bus_location_update(self, event):
        await self.send(
            json.dumps({"type": "bus_location_update", "bus": event["bus"]})
        )

    async def analytics_summary(self, event):
        await self.send(
            json.dumps({"type": "analytics_summary", "data": event["data"]})
        )

    async def ai_suggestions(self, event):
        await self.send(
            json.dumps({"type": "ai_suggestions", "data": event["data"]})
        )
