import uuid
from django.db import models
from apps.transit.models import Route
from apps.fleet.models import Bus


class Incident(models.Model):
    TYPE_CHOICES = [
        ("stuck_bus", "Stuck Bus / Possible Incident"),
        ("headway_risk", "Headway Gap / Bus Bunching"),
        ("coverage_gap", "Spatial Coverage Gap"),
    ]
    SEVERITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("acknowledged", "Acknowledged"),
        ("dispatched", "Dispatched"),
        ("resolved", "Resolved"),
        ("dismissed", "Dismissed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident_type = models.CharField(max_length=32, choices=TYPE_CHOICES)
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES)
    route = models.ForeignKey(
        Route, on_delete=models.SET_NULL, null=True, blank=True
    )
    primary_bus = models.ForeignKey(
        Bus,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidents",
    )
    recommended_bus = models.ForeignKey(
        Bus,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="divert_recommendations",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    suggested_action = models.TextField(blank=True)
    status = models.CharField(
        max_length=32, choices=STATUS_CHOICES, default="pending"
    )
    detected_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-detected_at"]
        indexes = [
            models.Index(fields=["status", "severity"]),
            models.Index(fields=["incident_type"]),
        ]

    def __str__(self):
        return f"[{self.severity.upper()}] {self.title}"
