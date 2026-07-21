from django.contrib.auth import get_user_model
from django.db.models import Q
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
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


@extend_schema(request=LoginSerializer, responses={200: LoginSerializer})
class LoginView(APIView):
    """POST /api/auth/login/ — JWT access + refresh + perfil."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthAnonThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


@extend_schema(request=LogoutSerializer, responses={200: OpenApiTypes.OBJECT})
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


@extend_schema(responses=UsuarioSerializer)
class MeView(APIView):
    """GET/PATCH /api/auth/me/ — perfil del usuario autenticado."""

    throttle_classes = [AuthUserThrottle]

    def get(self, request):
        return Response(UsuarioSerializer(request.user).data)

    @extend_schema(request=UsuarioSerializer, responses=UsuarioSerializer)
    def patch(self, request):
        serializer = UsuarioSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


@extend_schema(request=ChangePasswordSerializer, responses={200: OpenApiTypes.OBJECT})
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


@extend_schema(request=PasswordResetRequestSerializer, responses={200: OpenApiTypes.OBJECT})
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


@extend_schema(request=PasswordResetConfirmSerializer, responses={200: OpenApiTypes.OBJECT})
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


class UsuarioAdminListView(generics.ListAPIView):
    """GET /api/auth/users/ — lista todos los usuarios (solo admin). Preferir /api/admin/usuarios/."""

    serializer_class = None  # set below
    permission_classes = [EsAdmin]

    def get_serializer_class(self):
        from apps.administracion.serializers import AdminUsuarioSerializer

        return AdminUsuarioSerializer

    def get_queryset(self):
        qs = Usuario.objects.all().order_by("fecha_registro")
        rol = self.request.query_params.get("rol")
        search = self.request.query_params.get("search")
        activo = self.request.query_params.get("is_active")
        if rol:
            qs = qs.filter(rol=rol)
        if activo is not None:
            qs = qs.filter(is_active=activo.lower() in ("1", "true", "yes"))
        if search:
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )
        return qs


class UsuarioAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/auth/users/{id}/ — alias de /api/admin/usuarios/."""

    permission_classes = [EsAdmin]
    queryset = Usuario.objects.all()

    def get_serializer_class(self):
        from apps.administracion.serializers import AdminUsuarioSerializer

        return AdminUsuarioSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response(
                {"detail": "No puedes eliminar tu propia cuenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        return Response({"detail": "Usuario desactivado."}, status=status.HTTP_200_OK)
