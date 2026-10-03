from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ("commuter", "Commuter"),
        ("operator", "Fleet Operator"),
        ("admin", "Administrator"),
    ]

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="profile"
    )
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default="commuter", db_index=True
    )
    phone_number = models.CharField(max_length=20, blank=True, default="")
    favorite_routes = models.JSONField(default=list, blank=True)
    is_verified_operator = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self):
        return f"{self.user.username} ({self.role})"
