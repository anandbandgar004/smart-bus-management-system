from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    UserMeView,
    ToggleFavoriteRouteView,
    LogoutView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", UserMeView.as_view(), name="user_me"),
    path("favorites/toggle/", ToggleFavoriteRouteView.as_view(), name="toggle_favorite"),
    path("logout/", LogoutView.as_view(), name="logout"),
]
