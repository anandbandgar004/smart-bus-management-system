from rest_framework import serializers
from .models import RoutePerformanceDaily


class RoutePerformanceDailySerializer(serializers.ModelSerializer):
    class Meta:
        model = RoutePerformanceDaily
        fields = [
            "id",
            "route_id",
            "date",
            "avg_speed_kmh",
            "avg_delay_min",
            "total_trips",
            "bunching_events_count",
            "on_time_performance_pct",
        ]
