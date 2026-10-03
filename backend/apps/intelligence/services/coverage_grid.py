"""Spatial Coverage Grid Analyzer

Uses PostGIS SnapToGrid to aggregate fleet spatial density into ~1.1km grid cells.
"""

import logging
from django.contrib.gis.db.models.functions import SnapToGrid
from django.db.models import Count
from apps.fleet.models import Bus

logger = logging.getLogger(__name__)

GRID_SIZE_DEG = 0.04  # ~4.4 km cells
COVERAGE_LOW = 2  # Flag cells with 2 or fewer buses


def evaluate_coverage_gaps() -> list[dict]:
    """Evaluates spatial coverage density and flags underserved cells."""
    try:
        rows = list(
            Bus.objects.filter(status="active", last_location__isnull=False)
            .annotate(cell=SnapToGrid("last_location", GRID_SIZE_DEG))
            .values("cell")
            .annotate(count=Count("id"))
            .filter(count__lte=COVERAGE_LOW)
            .order_by("count")[:3]
        )
    except Exception as exc:
        logger.debug(
            "Spatial grid aggregation skipped: %s", exc
        )
        rows = []

    incidents = []
    for r in rows:
        cell = r.get("cell")
        if not cell:
            continue
        lat = round(cell.y, 3)
        lng = round(cell.x, 3)
        count = r["count"]
        incidents.append(
            {
                "incident_type": "coverage_gap",
                "severity": "medium",
                "title": f"Coverage deficit near ({lat}N, {lng}E)",
                "description": f"Sector around ({lat}, {lng}) has only {count} active bus(es) operating.",
                "suggested_action": f"REPOSITION: Route a nearby idle or low-occupancy bus toward sector ({lat}, {lng}) to balance coverage.",
                "details": {"lat": lat, "lng": lng, "count": count},
            }
        )
    return incidents
