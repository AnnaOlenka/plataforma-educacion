"""Permisos del catálogo académico."""
from rest_framework import permissions

from .models import Inscripcion


class IsInstructorOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and getattr(
            request.user, "es_instructor", False
        )


class CatalogoPublicoOInstructor(permissions.BasePermission):
    """Catálogo: lectura pública; escritura solo instructor/admin."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and getattr(
            request.user, "es_instructor", False
        )


def usuario_inscrito(user, curso) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "es_instructor", False) and (
        curso.instructor_id == user.id or getattr(user, "es_admin", False)
    ):
        return True
    return Inscripcion.objects.filter(
        estudiante=user,
        curso=curso,
        estado__in=[Inscripcion.Estado.ACTIVA, Inscripcion.Estado.COMPLETADA],
    ).exists()


def es_dueno_curso(user, curso) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "es_admin", False):
        return True
    return getattr(user, "es_instructor", False) and curso.instructor_id == user.id


class EsInstructor(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "es_instructor", False)
        )


class EsDuenoCursoOAdmin(permissions.BasePermission):
    """Para object-level: el objeto debe exponer .curso o ser Curso."""

    def has_object_permission(self, request, view, obj):
        if getattr(request.user, "es_admin", False):
            return True
        curso = obj if hasattr(obj, "instructor_id") else getattr(obj, "curso", None)
        if curso is None and hasattr(obj, "modulo"):
            curso = obj.modulo.curso
        if curso is None and hasattr(obj, "leccion"):
            curso = obj.leccion.modulo.curso
        if curso is None and hasattr(obj, "evaluacion"):
            curso = obj.evaluacion.leccion.modulo.curso
        return es_dueno_curso(request.user, curso)
