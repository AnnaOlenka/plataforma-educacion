from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CursoViewSet, InscripcionViewSet, LeccionViewSet, ModuloViewSet

router = DefaultRouter()
router.register("cursos", CursoViewSet, basename="curso")
router.register("modulos", ModuloViewSet, basename="modulo")
router.register("lecciones", LeccionViewSet, basename="leccion")
router.register("inscripciones", InscripcionViewSet, basename="inscripcion")

urlpatterns = [
    path("", include(router.urls)),
]
