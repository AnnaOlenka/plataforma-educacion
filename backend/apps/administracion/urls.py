from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminAuditoriaCalificacionViewSet,
    AdminCursoViewSet,
    AdminPanelResumenView,
    AdminRegistroAuditoriaViewSet,
    AdminUsuarioViewSet,
)

router = DefaultRouter()
router.register("usuarios", AdminUsuarioViewSet, basename="admin-usuario")
router.register("cursos", AdminCursoViewSet, basename="admin-curso")
router.register(
    "auditoria/calificaciones",
    AdminAuditoriaCalificacionViewSet,
    basename="admin-auditoria-calificacion",
)
router.register(
    "auditoria/registros",
    AdminRegistroAuditoriaViewSet,
    basename="admin-registro-auditoria",
)

urlpatterns = [
    path("panel/", AdminPanelResumenView.as_view(), name="admin-panel"),
    path("", include(router.urls)),
]
