from django.db.models import Avg, Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.fleet.models import Bus
from apps.intelligence.models import Incident
from apps.transit.models import Route
from .models import RoutePerformanceDaily
from .serializers import RoutePerformanceDailySerializer


class AnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RoutePerformanceDaily.objects.select_related("route").all()
    serializer_class = RoutePerformanceDailySerializer
    filterset_fields = ["route", "date"]

    @action(detail=False, methods=["get"])
    def overview(self, request):
        total_routes = Route.objects.filter(is_active=True).count()
        total_buses = Bus.objects.count()
        active_buses = Bus.objects.filter(status="active").count()
        avg_speed = (
            Bus.objects.filter(status="active").aggregate(
                avg=Avg("last_speed_kmh")
            )["avg"]
            or 0
        )
        avg_delay = (
            Bus.objects.filter(status="active").aggregate(
                avg=Avg("last_delay_min")
            )["avg"]
            or 0
        )
        active_incidents = Incident.objects.filter(
            status__in=["pending", "acknowledged", "dispatched"]
        ).count()

        return Response(
            {
                "total_routes": total_routes,
                "total_buses": total_buses,
                "active_buses": active_buses,
                "avg_fleet_speed_kmh": round(float(avg_speed), 1),
                "avg_delay_min": round(float(avg_delay), 1),
                "active_incidents": active_incidents,
            }
        )

    @action(detail=False, methods=["get"], url_path="route-history")
    def route_history(self, request):
        """Returns 7-day or 30-day historical performance for a given route."""
        route_id = request.query_params.get("route_id")
        days = int(request.query_params.get("days", 7))
        
        qs = RoutePerformanceDaily.objects.all()
        if route_id:
            qs = qs.filter(route_id=route_id)
        
        # If no records exist yet, auto-run aggregation for today
        if qs.count() == 0:
            from .tasks import aggregate_daily_route_performance
            aggregate_daily_route_performance()
            qs = RoutePerformanceDaily.objects.all()
            if route_id:
                qs = qs.filter(route_id=route_id)

        history = qs.order_by("-date")[:days]
        return Response(RoutePerformanceDailySerializer(history, many=True).data)

    @action(detail=False, methods=["post"], url_path="aggregate-now")
    def trigger_aggregation(self, request):
        """Manually trigger daily analytics rollup."""
        from .tasks import aggregate_daily_route_performance
        msg = aggregate_daily_route_performance()
        return Response({"status": "ok", "result": msg})

