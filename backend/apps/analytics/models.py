from django.db import models
from apps.transit.models import Route


class RoutePerformanceDaily(models.Model):
    route = models.ForeignKey(
        Route, on_delete=models.CASCADE, related_name="daily_analytics"
    )
    date = models.DateField(db_index=True)
    avg_speed_kmh = models.DecimalField(
        max_digits=5, decimal_places=2, default=0
    )
    avg_delay_min = models.DecimalField(
        max_digits=5, decimal_places=2, default=0
    )
    total_trips = models.PositiveIntegerField(default=0)
    bunching_events_count = models.PositiveIntegerField(default=0)
    on_time_performance_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=100.0
    )

    class Meta:
        unique_together = ("route", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.route_id} - {self.date}"
