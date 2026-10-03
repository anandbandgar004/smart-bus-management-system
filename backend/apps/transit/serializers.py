from rest_framework import serializers
from .models import Route, Stop, RouteStop


class StopSerializer(serializers.ModelSerializer):
    lat = serializers.SerializerMethodField()
    lng = serializers.SerializerMethodField()

    class Meta:
        model = Stop
        fields = ["id", "name", "lat", "lng", "zone_id"]

    def get_lat(self, obj):
        return obj.location.y if obj.location else None

    def get_lng(self, obj):
        return obj.location.x if obj.location else None


class RouteStopSerializer(serializers.ModelSerializer):
    stop = StopSerializer(read_only=True)

    class Meta:
        model = RouteStop
        fields = ["stop", "stop_sequence"]


class RouteSerializer(serializers.ModelSerializer):
    route_stops = RouteStopSerializer(many=True, read_only=True)

    class Meta:
        model = Route
        fields = [
            "id",
            "short_name",
            "long_name",
            "color",
            "is_active",
            "route_stops",
            "created_at",
            "updated_at",
        ]
