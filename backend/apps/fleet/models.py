from django.contrib.gis.db import models
from django.utils import timezone
from apps.transit.models import Route


class Bus(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("maintenance", "Maintenance"),
        ("idle", "Idle"),
        ("out_of_service", "Out of Service"),
    ]

    id = models.CharField(max_length=64, primary_key=True)  # e.g. "DL1PD5041"
    current_route = models.ForeignKey(
        Route,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="buses",
    )
    current_trip_id = models.CharField(max_length=128, blank=True)
    status = models.CharField(
        max_length=32, choices=STATUS_CHOICES, default="active"
    )
    last_speed_kmh = models.DecimalField(
        max_digits=5, decimal_places=2, default=0
    )
    last_delay_min = models.IntegerField(default=0)
    last_location = models.PointField(
        srid=4326, null=True, blank=True, spatial_index=True
    )
    last_telemetry_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Buses"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["current_route"]),
        ]

    def __str__(self):
        return f"Bus {self.id} ({self.status})"


class BusTelemetryHistory(models.Model):
    """Time-series log — sampled once per bus per minute to limit growth."""

    bus = models.ForeignKey(
        Bus, on_delete=models.CASCADE, related_name="history"
    )
    route = models.ForeignKey(
        Route, on_delete=models.SET_NULL, null=True, blank=True
    )
    speed_kmh = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    delay_min = models.IntegerField(default=0)
    location = models.PointField(srid=4326, spatial_index=True)
    recorded_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["bus", "recorded_at"])]

    def __str__(self):
        return f"Telemetry {self.bus_id} at {self.recorded_at}"
