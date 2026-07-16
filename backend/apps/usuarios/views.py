from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from .permissions import EsAdmin
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegistroAdminSerializer,
    RegistroSerializer,
    UsuarioSerializer,
)
from .services import enviar_correo_recuperacion
from .throttles import AuthAnonThrottle, AuthUserThrottle, PasswordResetThrottle

Usuario = get_user_model()

MENSAJE_RESET = (
    "Si el correo está registrado, enviamos instrucciones para recuperar la cuenta."
)


class RegistroView(generics.CreateAPIView):
    """POST /api/auth/register/ — estudiante o instructor."""

    queryset = Usuario.objects.all()
    serializer_class = RegistroSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthAnonThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "detail": "Cuenta creada correctamente.",
                "user": UsuarioSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class RegistroAdminView(generics.CreateAPIView):
    """POST /api/auth/register/admin/ — solo un admin puede crear otro admin."""

    queryset = Usuario.objects.all()
    serializer_class = RegistroAdminSerializer
    permission_classes = [EsAdmin]
    throttle_classes = [AuthUserThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "detail": "Administrador creado correctamente.",
                "user": UsuarioSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """POST /api/auth/login/ — JWT access + refresh + perfil."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthAnonThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """POST /api/auth/logout/ — revoca refresh token (blacklist)."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthUserThrottle]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Sesión cerrada."}, status=status.HTTP_200_OK)


class RefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthAnonThrottle]


class MeView(APIView):
    """GET/PATCH /api/auth/me/ — perfil del usuario autenticado."""

    throttle_classes = [AuthUserThrottle]

    def get(self, request):
        return Response(UsuarioSerializer(request.user).data)

    def patch(self, request):
        serializer = UsuarioSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """POST /api/auth/change-password/"""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthUserThrottle]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Contraseña actualizada correctamente."},
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(APIView):
    """POST /api/auth/password-reset/ — solicita recuperación (anti-enumeración)."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        user = Usuario.objects.filter(email__iexact=email, is_active=True).first()
        if user is not None and user.has_usable_password():
            enviar_correo_recuperacion(user)
        return Response({"detail": MENSAJE_RESET}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """POST /api/auth/password-reset/confirm/ — confirma nueva contraseña."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Contraseña restablecida. Ya puedes iniciar sesión."},
            status=status.HTTP_200_OK,
        )
