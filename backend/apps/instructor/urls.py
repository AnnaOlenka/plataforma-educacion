from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    InstructorAnalyticsCursoView,
    InstructorCursoViewSet,
    InstructorEvaluacionViewSet,
    InstructorIntentoViewSet,
    InstructorLeccionViewSet,
    InstructorModuloViewSet,
    InstructorPanelResumenView,
    InstructorPreguntaViewSet,
)

router = DefaultRouter()
router.register("cursos", InstructorCursoViewSet, basename="instructor-curso")
router.register("modulos", InstructorModuloViewSet, basename="instructor-modulo")
router.register("lecciones", InstructorLeccionViewSet, basename="instructor-leccion")
router.register(
    "evaluaciones", InstructorEvaluacionViewSet, basename="instructor-evaluacion"
)
router.register("preguntas", InstructorPreguntaViewSet, basename="instructor-pregunta")
router.register("intentos", InstructorIntentoViewSet, basename="instructor-intento")

urlpatterns = [
    path("panel/", InstructorPanelResumenView.as_view(), name="instructor-panel"),
    path(
        "analytics/cursos/<slug:slug>/",
        InstructorAnalyticsCursoView.as_view(),
        name="instructor-analytics-curso",
    ),
    path("", include(router.urls)),
]
