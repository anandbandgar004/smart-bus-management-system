from rest_framework import serializers
from django.contrib.auth.models import User
from django.conf import settings
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserProfile


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="profile.role", read_only=True)
    phone_number = serializers.CharField(source="profile.phone_number", read_only=True)
    favorite_routes = serializers.ListField(source="profile.favorite_routes", read_only=True)
    is_verified_operator = serializers.BooleanField(source="profile.is_verified_operator", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone_number",
            "favorite_routes",
            "is_verified_operator",
        ]


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    role = serializers.ChoiceField(choices=["commuter", "operator"], default="commuter")
    operator_passcode = serializers.CharField(write_only=True, required=False, allow_blank=True, default="")
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        role = attrs.get("role", "commuter")
        if role == "operator":
            passcode = attrs.get("operator_passcode", "").strip()
            expected_key = getattr(settings, "OPERATOR_SECRET_KEY", "OPERATOR2026")
            if not passcode:
                raise serializers.ValidationError(
                    {"operator_passcode": "Operator Secret Passcode is required for operator registration."}
                )
            if passcode != expected_key:
                raise serializers.ValidationError(
                    {"operator_passcode": "Invalid Operator Secret Passcode. Contact dispatch administration."}
                )
        return attrs

    def create(self, validated_data):
        role = validated_data.pop("role", "commuter")
        validated_data.pop("operator_passcode", None)
        phone_number = validated_data.pop("phone_number", "")

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = role
        profile.phone_number = phone_number
        profile.is_verified_operator = (role == "operator")
        profile.save()

        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        role = getattr(user, "profile", None).role if hasattr(user, "profile") else "commuter"
        token["username"] = user.username
        token["email"] = user.email
        token["role"] = role
        token["first_name"] = user.first_name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        profile = getattr(self.user, "profile", None)
        role = profile.role if profile else "commuter"

        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "role": role,
            "phone_number": profile.phone_number if profile else "",
            "favorite_routes": profile.favorite_routes if profile else [],
            "is_verified_operator": profile.is_verified_operator if profile else False,
        }
        return data


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name", required=False)
    last_name = serializers.CharField(source="user.last_name", required=False)
    email = serializers.EmailField(source="user.email", required=False)

    class Meta:
        model = UserProfile
        fields = ["first_name", "last_name", "email", "phone_number", "favorite_routes"]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        user = instance.user
        for attr, val in user_data.items():
            setattr(user, attr, val)
        user.save()

        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance
