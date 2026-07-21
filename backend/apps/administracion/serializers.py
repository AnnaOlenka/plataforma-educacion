from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.cursos.models import Curso
from apps.administracion.models import AuditLogCalificacion

Usuario = get_user_model()


class AdminUsuarioSerializer(serializers.ModelSerializer):
    """Gestión de usuarios por admin: puede cambiar rol e is_active."""

    class Meta:
        model = Usuario
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "rol",
            "is_active",
            "is_staff",
            "avatar",
            "bio",
            "fecha_registro",
            "last_login",
            "date_joined",
        )
        read_only_fields = ("id", "fecha_registro", "last_login", "date_joined")

    def validate_rol(self, value):
        if value not in Usuario.Rol.values:
            raise serializers.ValidationError("Rol inválido.")
        return value

    def update(self, instance, validated_data):
        rol = validated_data.get("rol", instance.rol)
        if rol == Usuario.Rol.ADMIN:
            validated_data["is_staff"] = True
        elif "is_staff" not in validated_data and instance.rol == Usuario.Rol.ADMIN:
            # si deja de ser admin, quitar staff salvo superuser
            if rol != Usuario.Rol.ADMIN and not instance.is_superuser:
                validated_data["is_staff"] = False
        return super().update(instance, validated_data)


class AdminCursoSerializer(serializers.ModelSerializer):
    instructor_nombre = serializers.CharField(
        source="instructor.get_full_name", read_only=True
    )
    instructor_username = serializers.CharField(
        source="instructor.username", read_only=True
    )
    revisado_por_username = serializers.CharField(
        source="revisado_por.username", read_only=True, allow_null=True
    )

    class Meta:
        model = Curso
        fields = (
            "id",
            "titulo",
            "slug",
            "descripcion",
            "instructor",
            "instructor_nombre",
            "instructor_username",
            "estado",
            "nivel",
            "portada",
            "solicitado_en",
            "revisado_en",
            "revisado_por",
            "revisado_por_username",
            "motivo_rechazo",
            "creado_en",
            "actualizado_en",
        )
        read_only_fields = fields


class RechazoCursoSerializer(serializers.Serializer):
    motivo = serializers.CharField(min_length=5)


class AuditLogCalificacionSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)
    estudiante_username = serializers.CharField(
        source="intento.estudiante.username", read_only=True
    )
    evaluacion_titulo = serializers.CharField(
        source="intento.evaluacion.titulo", read_only=True
    )
    curso_slug = serializers.CharField(
        source="intento.evaluacion.leccion.modulo.curso.slug", read_only=True
    )

    class Meta:
        model = AuditLogCalificacion
        fields = (
            "id",
            "intento",
            "actor",
            "actor_username",
            "estudiante_username",
            "evaluacion_titulo",
            "curso_slug",
            "accion",
            "puntaje_anterior",
            "puntaje_nuevo",
            "aprobado_anterior",
            "aprobado_nuevo",
            "feedback_anterior",
            "feedback_nuevo",
            "detalle_anterior",
            "detalle_nuevo",
            "motivo",
            "creado_en",
        )
