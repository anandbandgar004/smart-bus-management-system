from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    UserSerializer,
    UserProfileUpdateSerializer,
)
from .models import UserProfile


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user.refresh_from_db()

        # Generate JWT tokens for immediate login
        refresh = RefreshToken.for_user(user)
        role = getattr(user, "profile", None).role if hasattr(user, "profile") else "commuter"
        refresh["username"] = user.username
        refresh["email"] = user.email
        refresh["role"] = role
        refresh["first_name"] = user.first_name

        user_data = UserSerializer(user).data

        return Response(
            {
                "message": "User registered successfully.",
                "user": user_data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class UserMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class ToggleFavoriteRouteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        route_id = str(request.data.get("route_id", "")).strip()
        if not route_id:
            return Response(
                {"error": "route_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        favs = list(profile.favorite_routes or [])

        if route_id in favs:
            favs.remove(route_id)
            action = "removed"
        else:
            favs.append(route_id)
            action = "added"

        profile.favorite_routes = favs
        profile.save()

        return Response(
            {
                "action": action,
                "route_id": route_id,
                "favorite_routes": favs,
            }
        )


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            # Token may already be expired or blacklisting not strictly enforced
            pass
        return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)
