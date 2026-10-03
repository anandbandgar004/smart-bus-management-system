"""Spatial Divert Optimizer

Uses PostGIS ST_DWithin and ST_Distance to find nearby candidates for bus diversion.
"""

from typing import Optional
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance
from apps.fleet.models import Bus

SEARCH_RADIUS_M = 2000  # 2 km search radius
MAX_DELAY_MIN = 10  # Candidate bus must not already be severely delayed


def find_best_bus_to_divert(
    origin_lat: float, origin_lng: float, exclude_route_id: Optional[str] = None
) -> Optional[dict]:
    """Queries candidate buses within SEARCH_RADIUS_M of incident origin."""
    origin = Point(origin_lng, origin_lat, srid=4326)

    radius_deg = SEARCH_RADIUS_M / 111000.0

    qs = Bus.objects.filter(
        status="active",
        last_location__isnull=False,
        last_delay_min__lt=MAX_DELAY_MIN,
        last_location__dwithin=(origin, radius_deg),
    )
    if exclude_route_id:
        qs = qs.exclude(current_route_id=exclude_route_id)

    # Order by spatial distance using PostGIS geography distance (meters)
    qs = qs.extra(
        select={
            "dist_m": "ST_Distance(last_location::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography)"
        },
        select_params=[origin_lng, origin_lat],
    ).order_by("dist_m")

    candidate = qs.first()
    if not candidate:
        return None

    return {
        "bus_id": candidate.id,
        "route_id": candidate.current_route_id,
        "delay_min": candidate.last_delay_min,
        "speed_kmh": float(candidate.last_speed_kmh),
    }
