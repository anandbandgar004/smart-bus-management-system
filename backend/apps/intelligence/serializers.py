from rest_framework import serializers
from .models import Incident


class IncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = [
            "id",
            "incident_type",
            "severity",
            "route",
            "primary_bus",
            "recommended_bus",
            "title",
            "description",
            "suggested_action",
            "status",
            "detected_at",
            "resolved_at",
        ]
