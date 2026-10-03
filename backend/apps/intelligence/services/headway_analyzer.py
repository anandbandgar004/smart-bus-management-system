"""Python port of aiService.js EWMA headway analysis."""

from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

EWMA_ALPHA = 0.5
HEADWAY_TARGET_MIN = 10.0
HEADWAY_TRIGGER_MULT = 1.5  # Trigger alert when headway > 15 min

_route_ewma: dict[str, dict] = {}


def update_route_counts(buses_payload: list[dict]) -> None:
    """Called after each GTFS ingestion cycle to maintain vehicle frequency windows."""
    now_min = (int(datetime.now(timezone.utc).timestamp()) // 60) * 60
    for bus in buses_payload:
        rid = bus.get("route_id", "UNKNOWN")
        rec = _route_ewma.setdefault(
            rid, {"window": now_min, "count": 0, "ewma": 0.0}
        )
        if rec["window"] != now_min:
            rec["window"] = now_min
            rec["count"] = 0
        rec["count"] += 1


def evaluate_headway_risks() -> list[dict]:
    """Computes EWMA headway and identifies routes with severe gaps or bunching."""
    if not _route_ewma:
        # Fall back to live database route aggregation across active fleet
        try:
            from apps.fleet.models import Bus
            from django.db.models import Count
            route_data = (
                Bus.objects.filter(status="active", current_route__isnull=False)
                .values("current_route_id")
                .annotate(count=Count("id"))
                .filter(count__gt=0)
            )
            for rd in route_data:
                rid = rd["current_route_id"]
                if rid:
                    cnt = rd["count"]
                    _route_ewma[rid] = {"window": 0, "count": cnt, "ewma": float(cnt)}
        except Exception as exc:
            logger.debug("Failed to initialize route counts from DB: %s", exc)

    candidates = []
    for rid, rec in _route_ewma.items():
        ewma = EWMA_ALPHA * rec["count"] + (1 - EWMA_ALPHA) * rec["ewma"]
        rec["ewma"] = ewma
        if ewma <= 0:
            continue
        headway = 60.0 / ewma
        if headway > HEADWAY_TARGET_MIN * HEADWAY_TRIGGER_MULT:
            severity = "high" if headway >= 30.0 else "medium"
            candidates.append(
                {
                    "incident_type": "headway_risk",
                    "severity": severity,
                    "route_id": rid,
                    "title": f"Headway gap on Route {rid}",
                    "description": (
                        f"Estimated headway is {headway:.1f} min "
                        f"(target: {HEADWAY_TARGET_MIN:.0f} min)."
                    ),
                    "suggested_action": (
                        f"FREQUENCY PACING: Dispatch an extra bus on Route {rid} or hold lead bus to restore {HEADWAY_TARGET_MIN:.0f}m interval."
                    ),
                    "details": {
                        "headway_min": round(headway, 1),
                        "ewma": round(ewma, 2),
                    },
                }
            )

    # Return top 4 routes with largest headway gaps
    candidates.sort(key=lambda x: x["details"]["headway_min"], reverse=True)
    return candidates[:4]
