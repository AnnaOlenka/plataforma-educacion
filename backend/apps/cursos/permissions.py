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
        estado=Inscripcion.Estado.ACTIVA,
    ).exists()
