from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EvaluacionByLeccionView, EvaluacionViewSet

router = DefaultRouter()
router.register("evaluaciones", EvaluacionViewSet, basename="evaluacion")

urlpatterns = [
    path(
        "lecciones/<int:leccion_id>/evaluacion/",
        EvaluacionByLeccionView.as_view(),
        name="evaluacion-by-leccion",
    ),
    path("", include(router.urls)),
]
