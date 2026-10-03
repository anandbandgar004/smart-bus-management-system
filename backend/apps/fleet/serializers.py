from rest_framework import serializers
from .models import Bus, BusTelemetryHistory


class BusSerializer(serializers.ModelSerializer):
    lat = serializers.SerializerMethodField()
    lng = serializers.SerializerMethodField()
    route_id = serializers.CharField(
        source="current_route.id", read_only=True, default=None
    )

    class Meta:
        model = Bus
        fields = [
            "id",
            "route_id",
            "current_trip_id",
            "status",
            "last_speed_kmh",
            "last_delay_min",
            "lat",
            "lng",
            "last_telemetry_at",
            "updated_at",
        ]

    def get_lat(self, obj):
        return obj.last_location.y if obj.last_location else None

    def get_lng(self, obj):
        return obj.last_location.x if obj.last_location else None


class BusTelemetryHistorySerializer(serializers.ModelSerializer):
    lat = serializers.SerializerMethodField()
    lng = serializers.SerializerMethodField()

    class Meta:
        model = BusTelemetryHistory
        fields = [
            "id",
            "bus_id",
            "route_id",
            "speed_kmh",
            "delay_min",
            "lat",
            "lng",
            "recorded_at",
        ]

    def get_lat(self, obj):
        return obj.location.y if obj.location else None

    def get_lng(self, obj):
        return obj.location.x if obj.location else None
