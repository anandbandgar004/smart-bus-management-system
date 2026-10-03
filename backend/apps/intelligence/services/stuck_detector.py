"""Python port of aiService.js stuck bus detection."""

from datetime import datetime, timezone
import logging
from apps.fleet.models import Bus

logger = logging.getLogger(__name__)

STUCK_DURATION_MS = 3 * 60 * 1000  # 3 minutes
SPEED_THRESHOLD_KMH = 1.0

_stuck_since: dict[str, int] = (
    {}
)  # bus_id -> epoch_ms when it stopped moving (< 1 km/h)


def evaluate_stuck_buses() -> list[dict]:
    """Detects active buses that haven't moved for over 3 minutes."""
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    incidents = []

    for bus in Bus.objects.filter(status="active").select_related(
        "current_route"
    ):
        speed = float(bus.last_speed_kmh or 0)
        if speed <= SPEED_THRESHOLD_KMH:
            _stuck_since.setdefault(bus.id, now_ms)
            elapsed_ms = now_ms - _stuck_since[bus.id]
            if elapsed_ms >= STUCK_DURATION_MS:
                elapsed_min = round(elapsed_ms / 60_000)
                incidents.append(
                    {
                        "incident_type": "stuck_bus",
                        "severity": "high",
                        "primary_bus_id": bus.id,
                        "route_id": bus.current_route_id,
                        "title": f"Possible incident: Bus {bus.id} stationary",
                        "description": (
                            f"Bus {bus.id} has been stationary for {elapsed_min} min "
                            f"on Route {bus.current_route_id or 'UNKNOWN'}."
                        ),
                    }
                )
                if len(incidents) >= 4:
                    break
        else:
            _stuck_since.pop(bus.id, None)

    return incidents
