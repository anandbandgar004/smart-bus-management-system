import math
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.contrib.gis.db.models.functions import Distance
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Route, Stop, RouteStop
from .serializers import RouteSerializer, StopSerializer
from .services.network_seeder import seed_delhi_transit_network
from apps.fleet.models import Bus


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance in kilometers."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    return R * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.prefetch_related("route_stops__stop").all()
    serializer_class = RouteSerializer
    filterset_fields = ["is_active"]
    search_fields = ["id", "short_name", "long_name"]

    @action(detail=False, methods=["post"], url_path="seed")
    def seed_network(self, request):
        """Seeds Delhi routes, stops, and sequences into PostGIS."""
        result = seed_delhi_transit_network()
        return Response(
            {"message": "Delhi transit network seeded successfully", "data": result},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="path")
    def get_route_path(self, request, pk=None):
        """Returns the ordered stops, polyline coordinates, and active buses for this route."""
        if Stop.objects.count() == 0:
            seed_delhi_transit_network()

        route = self.get_object()
        route_stops = (
            RouteStop.objects.filter(route=route)
            .select_related("stop")
            .order_by("stop_sequence")
        )

        stops_list = []
        polyline = []
        for rs in route_stops:
            st = rs.stop
            lat = st.location.y if st.location else None
            lng = st.location.x if st.location else None
            stops_list.append({
                "id": st.id,
                "name": st.name,
                "sequence": rs.stop_sequence,
                "lat": lat,
                "lng": lng,
                "zone_id": st.zone_id,
            })
            if lat is not None and lng is not None:
                polyline.append([lat, lng])

        active_buses = []
        buses = Bus.objects.filter(current_route=route, status="active")
        for b in buses:
            b_lat = b.last_location.y if b.last_location else None
            b_lng = b.last_location.x if b.last_location else None
            if b_lat is not None and b_lng is not None:
                active_buses.append({
                    "id": b.id,
                    "lat": b_lat,
                    "lng": b_lng,
                    "speed_kmh": float(b.last_speed_kmh),
                    "delay_min": b.last_delay_min,
                    "last_telemetry_at": b.last_telemetry_at,
                })

        return Response({
            "id": route.id,
            "short_name": route.short_name,
            "long_name": route.long_name,
            "color": route.color,
            "stops": stops_list,
            "polyline": polyline,
            "active_buses": active_buses,
            "total_buses": len(active_buses),
        })

    @action(detail=False, methods=["get"], url_path="search")
    def search_transit(self, request):
        """Unified search across routes and stops."""
        q = request.query_params.get("q", "").strip()
        if not q:
            return Response({"routes": [], "stops": []})

        if Stop.objects.count() == 0:
            seed_delhi_transit_network()

        route_qs = Route.objects.filter(
            Q(id__icontains=q)
            | Q(short_name__icontains=q)
            | Q(long_name__icontains=q)
        )[:10]

        matched_routes = []
        for r in route_qs:
            bus_count = Bus.objects.filter(current_route=r, status="active").count()
            stop_count = r.route_stops.count()
            matched_routes.append({
                "id": r.id,
                "short_name": r.short_name,
                "long_name": r.long_name,
                "color": r.color,
                "active_buses_count": bus_count,
                "stop_count": stop_count,
            })

        stop_qs = Stop.objects.filter(
            Q(name__icontains=q) | Q(id__icontains=q) | Q(zone_id__icontains=q)
        )[:15]

        matched_stops = []
        for s in stop_qs:
            servicing_routes = list(
                RouteStop.objects.filter(stop=s)
                .values_list("route_id", flat=True)
                .distinct()
            )
            matched_stops.append({
                "id": s.id,
                "name": s.name,
                "lat": s.location.y if s.location else None,
                "lng": s.location.x if s.location else None,
                "zone_id": s.zone_id,
                "servicing_routes": servicing_routes,
            })

        return Response({
            "routes": matched_routes,
            "stops": matched_stops,
        })


class StopViewSet(viewsets.ModelViewSet):
    queryset = Stop.objects.all()
    serializer_class = StopSerializer
    search_fields = ["id", "name", "zone_id"]

    @action(detail=False, methods=["get"], url_path="nearby")
    def nearby_stops(self, request):
        """Returns stops within walking distance of specified coordinates."""
        try:
            lat = float(request.query_params.get("lat", 28.6139))
            lng = float(request.query_params.get("lng", 77.2090))
            radius_m = float(request.query_params.get("radius_m", 1500))
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid lat, lng, or radius_m parameter"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Stop.objects.count() == 0:
            seed_delhi_transit_network()

        user_point = Point(lng, lat, srid=4326)
        stops = (
            Stop.objects.filter(location__distance_lte=(user_point, D(m=radius_m)))
            .annotate(distance=Distance("location", user_point))
            .order_by("distance")[:8]
        )

        results = []
        for s in stops:
            servicing_routes = list(
                RouteStop.objects.filter(stop=s)
                .values_list("route_id", flat=True)
                .distinct()
            )
            dist_meters = round(s.distance.m) if hasattr(s, "distance") else 0
            results.append({
                "id": s.id,
                "name": s.name,
                "lat": s.location.y if s.location else None,
                "lng": s.location.x if s.location else None,
                "zone_id": s.zone_id,
                "distance_m": dist_meters,
                "walking_time_min": max(1, round(dist_meters / 80)),
                "servicing_routes": servicing_routes,
            })

        return Response({"stops": results, "user_lat": lat, "user_lng": lng})

    @action(detail=True, methods=["get"], url_path="arrivals")
    def next_arrivals(self, request, pk=None):
        """Computes real-time ETAs for upcoming buses approaching this stop."""
        stop = self.get_object()
        if not stop.location:
            return Response({"arrivals": []})

        stop_lat, stop_lng = stop.location.y, stop.location.x

        servicing_route_stops = RouteStop.objects.filter(stop=stop).select_related("route")
        route_sequence_map = {rs.route_id: rs.stop_sequence for rs in servicing_route_stops}

        arrivals = []
        buses = Bus.objects.filter(
            current_route_id__in=route_sequence_map.keys(),
            status="active",
        ).select_related("current_route")

        for b in buses:
            if not b.last_location:
                continue
            b_lat, b_lng = b.last_location.y, b.last_location.x
            dist_km = haversine_km(b_lat, b_lng, stop_lat, stop_lng)

            if dist_km <= 8.0:
                speed = float(b.last_speed_kmh)
                effective_speed = max(speed, 12.0)
                eta_minutes = round((dist_km / effective_speed) * 60) + max(0, b.last_delay_min)

                occupancy = "low"
                if b.last_delay_min > 8 or speed < 15:
                    occupancy = "high"
                elif b.last_delay_min > 3:
                    occupancy = "medium"

                arrivals.append({
                    "bus_id": b.id,
                    "route_id": b.current_route_id,
                    "route_name": b.current_route.short_name or b.current_route_id,
                    "route_color": b.current_route.color,
                    "eta_minutes": max(1, eta_minutes),
                    "distance_km": round(dist_km, 1),
                    "speed_kmh": round(speed, 1),
                    "delay_min": b.last_delay_min,
                    "occupancy": occupancy,
                })

        arrivals.sort(key=lambda a: a["eta_minutes"])

        return Response({
            "stop_id": stop.id,
            "stop_name": stop.name,
            "lat": stop_lat,
            "lng": stop_lng,
            "zone_id": stop.zone_id,
            "arrivals": arrivals[:6],
        })

    @action(detail=False, methods=["get"], url_path="plan-journey")
    def plan_journey(self, request):
        """
        A-to-B transit journey planner.
        Finds direct routes connecting origin and destination stops,
        with single-transfer fallback.
        """
        origin_id = request.query_params.get("origin_id", "").strip()
        destination_id = request.query_params.get("destination_id", "").strip()

        if not origin_id or not destination_id:
            return Response(
                {"error": "Both origin_id and destination_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if origin_id == destination_id:
            return Response(
                {"error": "Origin and destination cannot be the same stop."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            origin_stop = Stop.objects.get(id=origin_id)
            dest_stop = Stop.objects.get(id=destination_id)
        except Stop.DoesNotExist:
            return Response(
                {"error": "One or both stops not found. Check stop IDs."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Find routes that serve BOTH stops
        origin_route_stops = RouteStop.objects.filter(stop=origin_stop).select_related("route")
        dest_route_stops = RouteStop.objects.filter(stop=dest_stop).select_related("route")

        origin_route_map = {rs.route_id: rs.stop_sequence for rs in origin_route_stops}
        dest_route_map = {rs.route_id: rs.stop_sequence for rs in dest_route_stops}

        direct_routes = []
        for route_id in set(origin_route_map) & set(dest_route_map):
            o_seq = origin_route_map[route_id]
            d_seq = dest_route_map[route_id]

            if o_seq >= d_seq:
                continue  # Origin must come before destination in route sequence

            try:
                route = Route.objects.get(id=route_id)
            except Route.DoesNotExist:
                continue

            stops_between = d_seq - o_seq
            estimated_minutes = (stops_between * 4) + 5  # ~4 min/stop + 5 min buffer

            # Find next approaching bus at origin stop
            active_buses = Bus.objects.filter(
                current_route=route, status="active"
            )
            next_buses = []
            if origin_stop.location:
                o_lat, o_lng = origin_stop.location.y, origin_stop.location.x
                for b in active_buses:
                    if not b.last_location:
                        continue
                    dist_km = haversine_km(b.last_location.y, b.last_location.x, o_lat, o_lng)
                    if dist_km <= 10.0:
                        speed = max(float(b.last_speed_kmh), 12.0)
                        eta = round((dist_km / speed) * 60) + max(0, b.last_delay_min)
                        next_buses.append({
                            "bus_id": b.id,
                            "eta_minutes": max(1, eta),
                            "distance_km": round(dist_km, 1),
                        })

            next_buses.sort(key=lambda x: x["eta_minutes"])

            direct_routes.append({
                "route_id": route.id,
                "route_name": route.short_name or route.id,
                "route_long_name": route.long_name,
                "route_color": route.color,
                "origin_stop": {
                    "id": origin_stop.id,
                    "name": origin_stop.name,
                    "sequence": o_seq,
                },
                "destination_stop": {
                    "id": dest_stop.id,
                    "name": dest_stop.name,
                    "sequence": d_seq,
                },
                "stops_count": stops_between,
                "estimated_minutes": estimated_minutes,
                "next_buses": next_buses[:3],
                "has_direct_service": True,
            })

        # Build single-transfer results if no direct routes found
        transfer_options = []
        if not direct_routes:
            for o_route_id, o_seq in origin_route_map.items():
                for d_route_id, d_seq in dest_route_map.items():
                    if o_route_id == d_route_id:
                        continue
                    # Find interchange stops common to both routes
                    o_route_stop_ids = set(
                        RouteStop.objects.filter(route_id=o_route_id)
                        .values_list("stop_id", flat=True)
                    )
                    d_route_stop_ids = set(
                        RouteStop.objects.filter(route_id=d_route_id)
                        .values_list("stop_id", flat=True)
                    )
                    interchange_ids = o_route_stop_ids & d_route_stop_ids
                    for iid in list(interchange_ids)[:1]:
                        try:
                            interchange_stop = Stop.objects.get(id=iid)
                            i_seq_on_o = RouteStop.objects.get(
                                route_id=o_route_id, stop_id=iid
                            ).stop_sequence
                            i_seq_on_d = RouteStop.objects.get(
                                route_id=d_route_id, stop_id=iid
                            ).stop_sequence
                            if o_seq < i_seq_on_o and i_seq_on_d < d_seq:
                                leg1_stops = i_seq_on_o - o_seq
                                leg2_stops = d_seq - i_seq_on_d
                                transfer_options.append({
                                    "type": "single_transfer",
                                    "leg1": {
                                        "route_id": o_route_id,
                                        "from_stop": origin_stop.name,
                                        "to_stop": interchange_stop.name,
                                        "stops_count": leg1_stops,
                                    },
                                    "leg2": {
                                        "route_id": d_route_id,
                                        "from_stop": interchange_stop.name,
                                        "to_stop": dest_stop.name,
                                        "stops_count": leg2_stops,
                                    },
                                    "interchange_stop": interchange_stop.name,
                                    "total_stops": leg1_stops + leg2_stops,
                                    "estimated_minutes": (leg1_stops + leg2_stops) * 4 + 15,
                                })
                        except (Stop.DoesNotExist, RouteStop.DoesNotExist):
                            continue

        o_lat = origin_stop.location.y if origin_stop.location else None
        o_lng = origin_stop.location.x if origin_stop.location else None
        d_lat = dest_stop.location.y if dest_stop.location else None
        d_lng = dest_stop.location.x if dest_stop.location else None

        return Response({
            "origin": {
                "id": origin_stop.id,
                "name": origin_stop.name,
                "lat": o_lat,
                "lng": o_lng,
            },
            "destination": {
                "id": dest_stop.id,
                "name": dest_stop.name,
                "lat": d_lat,
                "lng": d_lng,
            },
            "direct_routes": direct_routes,
            "transfer_options": transfer_options[:3],
            "has_direct_service": len(direct_routes) > 0,
        })
