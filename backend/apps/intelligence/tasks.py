import logging
from asgiref.sync import async_to_sync
from celery import shared_task
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


@shared_task(name="apps.intelligence.tasks.run_ai_analytics_task")
def run_ai_analytics_task():
    """Recurring Celery Beat task (every 60s) evaluating stuck buses, headway, and spatial coverage."""
    from apps.fleet.models import Bus
    from apps.intelligence.models import Incident
    from apps.intelligence.services.coverage_grid import (
        evaluate_coverage_gaps,
    )
    from apps.intelligence.services.divert_optimizer import (
        find_best_bus_to_divert,
    )
    from apps.intelligence.services.headway_analyzer import (
        evaluate_headway_risks,
    )
    from apps.intelligence.services.stuck_detector import (
        evaluate_stuck_buses,
    )

    all_incidents = []

    # 1 — Stuck buses (with automated divert candidate query)
    for inc in evaluate_stuck_buses():
        bus = Bus.objects.filter(id=inc.get("primary_bus_id")).first()
        if bus and bus.last_location:
            candidate = find_best_bus_to_divert(
                bus.last_location.y,
                bus.last_location.x,
                exclude_route_id=inc.get("route_id"),
            )
            if candidate:
                inc["suggested_action"] = (
                    f"DIVERT & REROUTE: Send bus {candidate['bus_id']} "
                    f"(Route {candidate['route_id']}) to cover Route {inc['route_id']}."
                )
                inc["recommended_bus_id"] = candidate["bus_id"]
            else:
                inc["suggested_action"] = (
                    f"DEPOT ACTION: Dispatch standby unit to cover Route {inc.get('route_id') or 'fleet'}."
                )
        all_incidents.append(inc)

    # 2 — Headway risks & bunching
    all_incidents.extend(evaluate_headway_risks())

    # 3 — Spatial coverage gaps
    all_incidents.extend(evaluate_coverage_gaps())

    # Prune old pending incidents to avoid ballooning the DB
    Incident.objects.filter(status="pending").delete()

    # Persist current fresh incidents to database
    for item in all_incidents:
        Incident.objects.create(
            incident_type=item["incident_type"],
            severity=item["severity"],
            title=item["title"],
            description=item.get("description", ""),
            suggested_action=item.get("suggested_action", ""),
            primary_bus_id=item.get("primary_bus_id"),
            recommended_bus_id=item.get("recommended_bus_id"),
            route_id=item.get("route_id"),
        )

    # Broadcast via WebSocket group
    channel_layer = get_channel_layer()
    if channel_layer and all_incidents:
        async_to_sync(channel_layer.group_send)(
            "fleet_updates",
            {
                "type": "ai.suggestions",
                "data": {
                    "items": [
                        {
                            "type": d["incident_type"],
                            "severity": d["severity"],
                            "title": d["title"],
                            "description": d.get("description"),
                            "solution": d.get("suggested_action"),
                        }
                        for d in all_incidents
                    ]
                },
            },
        )
    logger.info("AI analytics task completed: %d incidents found", len(all_incidents))
    return {"incidents_count": len(all_incidents)}
