from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        role = "admin" if (instance.is_superuser or instance.is_staff) else "commuter"
        is_verified = True if role in ("admin", "operator") else False
        UserProfile.objects.get_or_create(
            user=instance,
            defaults={"role": role, "is_verified_operator": is_verified},
        )
    else:
        if hasattr(instance, "profile"):
            instance.profile.save()
        else:
            role = "admin" if (instance.is_superuser or instance.is_staff) else "commuter"
            UserProfile.objects.create(
                user=instance,
                role=role,
                is_verified_operator=True if role in ("admin", "operator") else False,
            )
