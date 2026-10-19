from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Incident
from .serializers import IncidentSerializer
from .services.divert_optimizer import find_best_bus_to_divert


class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.select_related(
        "route", "primary_bus", "recommended_bus"
    ).all()
    serializer_class = IncidentSerializer
    filterset_fields = ["status", "severity", "incident_type", "route"]
    search_fields = ["title", "description"]

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        incident = self.get_object()
        incident.status = "resolved"
        incident.resolved_at = timezone.now()
        incident.save()
        return Response(self.get_serializer(incident).data)

    @action(detail=True, methods=["post"])
    def dispatch(self, request, pk=None):
        incident = self.get_object()
        bus_id = request.data.get("bus_id")
        
        bus = None
        if bus_id:
            try:
                bus = Bus.objects.get(id=bus_id)
            except Bus.DoesNotExist:
                pass
        if not bus and incident.recommended_bus:
            bus = incident.recommended_bus

        if bus:
            incident.recommended_bus = bus
            if incident.route:
                bus.current_route = incident.route
                bus.save(update_fields=["current_route"])

        incident.status = "dispatched"
        incident.save()

        # Try broadcasting WebSocket update to fleet_updates group
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    "fleet_updates",
                    {
                        "type": "operator.dispatch",
                        "data": {
                            "incident_id": str(incident.id),
                            "bus_id": bus.id if bus else None,
                            "route_id": incident.route_id,
                            "status": "dispatched",
                            "message": f"Bus {bus.id if bus else 'Unknown'} dispatched for {incident.title}",
                        },
                    },
                )
        except Exception:
            pass

        return Response({
            "message": f"Intervention dispatched successfully: Bus {bus.id if bus else 'N/A'} assigned to route {incident.route_id or 'incident'}",
            "incident": self.get_serializer(incident).data,
            "dispatched_bus": bus.id if bus else None,
        })

    @action(detail=False, methods=["post"])
    def optimize_divert(self, request):
        lat = request.data.get("lat")
        lng = request.data.get("lng")
        exclude_route = request.data.get("exclude_route")

        if lat is None or lng is None:
            return Response(
                {"error": "Latitude and longitude are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat = float(lat)
            lng = float(lng)
        except ValueError:
            return Response(
                {"error": "Latitude and longitude must be numbers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        candidate = find_best_bus_to_divert(
            lat, lng, exclude_route_id=exclude_route
        )
        if not candidate:
            return Response(
                {"message": "No nearby candidate buses found for diversion."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(candidate)
