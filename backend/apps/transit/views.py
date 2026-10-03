from rest_framework import viewsets
from .models import Route, Stop
from .serializers import RouteSerializer, StopSerializer


class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.prefetch_related("route_stops__stop").all()
    serializer_class = RouteSerializer
    filterset_fields = ["is_active"]
    search_fields = ["id", "short_name", "long_name"]


class StopViewSet(viewsets.ModelViewSet):
    queryset = Stop.objects.all()
    serializer_class = StopSerializer
    search_fields = ["id", "name", "zone_id"]
