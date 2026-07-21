"""
Panel admin: aprobación de cursos, gestión de usuarios, auditoría.
"""
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cursos.models import Curso
from apps.usuarios.permissions import EsAdmin

from .models import AuditLogCalificacion, RegistroAuditoria
from .serializers import (
    AdminCursoSerializer,
    AdminUsuarioSerializer,
    AuditLogCalificacionSerializer,
    RechazoCursoSerializer,
    RegistroAuditoriaSerializer,
)

Usuario = get_user_model()


@extend_schema(responses={200: OpenApiTypes.OBJECT})
class AdminPanelResumenView(APIView):
    """GET /api/admin/panel/"""

    permission_classes = [EsAdmin]

    def get(self, request):
        return Response(
            {
                "usuarios_total": Usuario.objects.count(),
                "usuarios_activos": Usuario.objects.filter(is_active=True).count(),
                "cursos_pendientes": Curso.objects.filter(
                    estado=Curso.Estado.PENDIENTE_APROBACION
                ).count(),
                "cursos_publicados": Curso.objects.filter(
                    estado=Curso.Estado.PUBLICADO
                ).count(),
                "auditorias_calificacion": AuditLogCalificacion.objects.count(),
                "registros_auditoria": RegistroAuditoria.objects.count(),
                "enlaces": {
                    "usuarios": "/api/admin/usuarios/",
                    "cursos_pendientes": "/api/admin/cursos/?estado=pendiente_aprobacion",
                    "auditoria": "/api/admin/auditoria/calificaciones/",
                    "auditoria_general": "/api/admin/auditoria/registros/",
                },
            }
        )


class AdminUsuarioViewSet(viewsets.ModelViewSet):
    """Gestión de usuarios (listar, editar rol/activo, desactivar)."""

    permission_classes = [EsAdmin]
    serializer_class = AdminUsuarioSerializer
    filterset_fields = ("rol", "is_active")
    search_fields = ("username", "email", "first_name", "last_name")
    ordering_fields = ("fecha_registro", "username", "rol")
    http_method_names = ["get", "patch", "put", "delete", "head", "options"]

    def get_queryset(self):
        return Usuario.objects.all().order_by("-fecha_registro")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.pk == request.user.pk:
            return Response(
                {"detail": "No puedes eliminar tu propia cuenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if request.query_params.get("hard") == "1" and request.user.is_superuser:
            return super().destroy(request, *args, **kwargs)
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        return Response(
            {
                "detail": "Usuario desactivado.",
                "user": AdminUsuarioSerializer(instance).data,
            }
        )

    def update(self, request, *args, **kwargs):
        if (
            int(kwargs.get("pk")) == request.user.pk
            and request.data.get("is_active") is False
        ):
            return Response(
                {"detail": "No puedes desactivar tu propia cuenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)


class AdminCursoViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Cola de aprobación y gestión de estado de cursos."""

    permission_classes = [EsAdmin]
    serializer_class = AdminCursoSerializer
    lookup_field = "slug"
    filterset_fields = ("estado", "nivel", "instructor")
    search_fields = ("titulo", "slug", "instructor__username")
    ordering_fields = ("solicitado_en", "creado_en", "titulo")

    def get_queryset(self):
        return Curso.objects.select_related("instructor", "revisado_por").all()

    @action(detail=True, methods=["post"])
    def aprobar(self, request, slug=None):
        curso = self.get_object()
        if curso.estado not in (
            Curso.Estado.PENDIENTE_APROBACION,
            Curso.Estado.RECHAZADO,
            Curso.Estado.BORRADOR,
        ):
            return Response(
                {
                    "detail": f"No se puede aprobar un curso en estado '{curso.estado}'.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        curso.estado = Curso.Estado.PUBLICADO
        curso.revisado_por = request.user
        curso.revisado_en = timezone.now()
        curso.motivo_rechazo = ""
        curso.save(
            update_fields=["estado", "revisado_por", "revisado_en", "motivo_rechazo", "actualizado_en"]
        )
        return Response(AdminCursoSerializer(curso).data)

    @action(detail=True, methods=["post"])
    def rechazar(self, request, slug=None):
        curso = self.get_object()
        ser = RechazoCursoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if curso.estado not in (
            Curso.Estado.PENDIENTE_APROBACION,
            Curso.Estado.PUBLICADO,
            Curso.Estado.BORRADOR,
        ):
            return Response(
                {"detail": f"No se puede rechazar un curso en estado '{curso.estado}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        curso.estado = Curso.Estado.RECHAZADO
        curso.motivo_rechazo = ser.validated_data["motivo"]
        curso.revisado_por = request.user
        curso.revisado_en = timezone.now()
        curso.save(
            update_fields=[
                "estado",
                "motivo_rechazo",
                "revisado_por",
                "revisado_en",
                "actualizado_en",
            ]
        )
        return Response(AdminCursoSerializer(curso).data)

    @action(detail=True, methods=["post"])
    def archivar(self, request, slug=None):
        curso = self.get_object()
        curso.estado = Curso.Estado.ARCHIVADO
        curso.revisado_por = request.user
        curso.revisado_en = timezone.now()
        curso.save(update_fields=["estado", "revisado_por", "revisado_en", "actualizado_en"])
        return Response(AdminCursoSerializer(curso).data)


class AdminAuditoriaCalificacionViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Auditoría de cambios de calificaciones."""

    permission_classes = [EsAdmin]
    serializer_class = AuditLogCalificacionSerializer
    filterset_fields = ("accion", "actor", "intento")
    ordering_fields = ("creado_en",)

    def get_queryset(self):
        qs = AuditLogCalificacion.objects.select_related(
            "actor",
            "intento",
            "intento__estudiante",
            "intento__evaluacion",
            "intento__evaluacion__leccion__modulo__curso",
        )
        curso = self.request.query_params.get("curso")
        if curso:
            if str(curso).isdigit():
                qs = qs.filter(
                    intento__evaluacion__leccion__modulo__curso_id=curso
                )
            else:
                qs = qs.filter(
                    intento__evaluacion__leccion__modulo__curso__slug=curso
                )
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(actor__username__icontains=search)
                | Q(intento__estudiante__username__icontains=search)
                | Q(intento__evaluacion__titulo__icontains=search)
                | Q(motivo__icontains=search)
            )
        return qs


class AdminRegistroAuditoriaViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Auditoría general: accesos a contenido y emisión de certificados (RNF05)."""

    permission_classes = [EsAdmin]
    serializer_class = RegistroAuditoriaSerializer
    filterset_fields = ("accion", "usuario", "objeto_tipo")
    search_fields = ("usuario__username", "objeto_tipo", "objeto_id", "ruta")
    ordering_fields = ("creado_en",)

    def get_queryset(self):
        return RegistroAuditoria.objects.select_related("usuario")
