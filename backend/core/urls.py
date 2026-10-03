from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path("admin/", admin.site.urls),
    # OpenAPI 3 Schema & Interactive Docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # Microservice Apps
    path("api/v1/accounts/", include("apps.accounts.urls")),
    path("api/v1/transit/", include("apps.transit.urls")),
    path("api/v1/fleet/", include("apps.fleet.urls")),
    path("api/v1/intelligence/", include("apps.intelligence.urls")),
    path("api/v1/analytics/", include("apps.analytics.urls")),
]
