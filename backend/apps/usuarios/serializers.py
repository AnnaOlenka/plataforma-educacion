from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

Usuario = get_user_model()

ROLES_PUBLICOS = (Usuario.Rol.ESTUDIANTE, Usuario.Rol.INSTRUCTOR)


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "rol",
            "avatar",
            "bio",
            "fecha_registro",
        )
        read_only_fields = ("id", "rol", "fecha_registro")


class RegistroSerializer(serializers.ModelSerializer):
    """Registro público: solo estudiante o instructor. Admin no se autoasigna."""

    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    password_confirm = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )
    rol = serializers.ChoiceField(choices=ROLES_PUBLICOS, default=Usuario.Rol.ESTUDIANTE)

    class Meta:
        model = Usuario
        fields = (
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "rol",
        )

    def validate_email(self, value):
        email = value.strip().lower()
        if Usuario.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Ya existe una cuenta con este correo.")
        return email

    def validate_username(self, value):
        if Usuario.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Este nombre de usuario ya está en uso.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Las contraseñas no coinciden."}
            )
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = Usuario(**validated_data)
        user.set_password(password)
        user.save()
        return user


class RegistroAdminSerializer(RegistroSerializer):
    """Solo un admin autenticado puede crear otro admin."""

    rol = serializers.ChoiceField(choices=[Usuario.Rol.ADMIN], default=Usuario.Rol.ADMIN)

    def create(self, validated_data):
        validated_data["rol"] = Usuario.Rol.ADMIN
        user = super().create(validated_data)
        user.is_staff = True
        user.save(update_fields=["is_staff"])
        return user


class LoginSerializer(serializers.Serializer):
    """Login con username o email + password. Devuelve JWT + perfil."""

    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        username = (attrs.get("username") or "").strip()
        email = (attrs.get("email") or "").strip().lower()
        password = attrs.get("password")

        if not password:
            raise serializers.ValidationError("La contraseña es obligatoria.")
        if not username and not email:
            raise serializers.ValidationError(
                "Indica username o email para iniciar sesión."
            )

        user = None
        if email:
            try:
                candidate = Usuario.objects.get(email__iexact=email)
                user = authenticate(
                    request=self.context.get("request"),
                    username=candidate.username,
                    password=password,
                )
            except Usuario.DoesNotExist:
                user = None
        else:
            user = authenticate(
                request=self.context.get("request"),
                username=username,
                password=password,
            )

        if user is None:
            raise serializers.ValidationError("Credenciales inválidas.")
        if not user.is_active:
            raise serializers.ValidationError("Esta cuenta está desactivada.")

        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UsuarioSerializer(user).data,
        }


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, attrs):
        self.token = attrs["refresh"]
        return attrs

    def save(self, **kwargs):
        try:
            token = RefreshToken(self.token)
            token.blacklist()
        except Exception as exc:
            raise serializers.ValidationError(
                {"refresh": "Token inválido o ya revocado."}
            ) from exc


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError(
                {"current_password": "La contraseña actual no es correcta."}
            )
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Las contraseñas no coinciden."}
            )
        validate_password(attrs["new_password"], user=user)
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Las contraseñas no coinciden."}
            )

        try:
            uid = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = Usuario.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist) as exc:
            raise serializers.ValidationError(
                {"uid": "Identificador de usuario inválido."}
            ) from exc

        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError(
                {"token": "El token es inválido o ha expirado."}
            )

        validate_password(attrs["new_password"], user=user)
        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user
