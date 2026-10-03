from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Bus, BusTelemetryHistory
from .serializers import BusSerializer, BusTelemetryHistorySerializer


class BusViewSet(viewsets.ModelViewSet):
    queryset = Bus.objects.select_related("current_route").all()
    serializer_class = BusSerializer
    filterset_fields = ["status", "current_route"]
    search_fields = ["id", "current_trip_id"]

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        bus = self.get_object()
        limit = int(request.query_params.get("limit", 60))
        history_records = BusTelemetryHistory.objects.filter(bus=bus).order_by(
            "-recorded_at"
        )[:limit]
        serializer = BusTelemetryHistorySerializer(history_records, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def active(self, request):
        active_buses = self.get_queryset().filter(status="active")
        serializer = self.get_serializer(active_buses, many=True)
        return Response(serializer.data)
