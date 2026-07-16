from rest_framework.permissions import BasePermission


class EsAdmin(BasePermission):
    """Solo usuarios con rol admin o superusuario."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "es_admin", False)
        )


class EsInstructorOAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "es_instructor", False)
        )
