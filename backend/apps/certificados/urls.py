from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CertificadoViewSet, VerificarCertificadoView

router = DefaultRouter()
router.register("certificados", CertificadoViewSet, basename="certificado")

urlpatterns = [
    path(
        "certificados/verificar/<uuid:codigo>/",
        VerificarCertificadoView.as_view(),
        name="certificado-verificar",
    ),
    path("", include(router.urls)),
]
