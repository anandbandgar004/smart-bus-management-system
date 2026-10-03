from django.contrib.gis.db import models


class Route(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    short_name = models.CharField(max_length=32, blank=True)
    long_name = models.CharField(max_length=255, blank=True)
    color = models.CharField(max_length=7, default="#3B82F6")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"Route {self.id}: {self.short_name or self.long_name}"


class Stop(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=255)
    location = models.PointField(srid=4326, spatial_index=True)  # PostGIS Point
    zone_id = models.CharField(max_length=64, blank=True)

    def __str__(self):
        return self.name


class RouteStop(models.Model):
    """Ordered stop sequence for a given route."""

    route = models.ForeignKey(
        Route, on_delete=models.CASCADE, related_name="route_stops"
    )
    stop = models.ForeignKey(Stop, on_delete=models.CASCADE)
    stop_sequence = models.PositiveSmallIntegerField()

    class Meta:
        unique_together = ("route", "stop_sequence")
        ordering = ["stop_sequence"]

    def __str__(self):
        return f"{self.route_id} - Stop #{self.stop_sequence}: {self.stop.name}"
