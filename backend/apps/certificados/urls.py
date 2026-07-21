from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CertificadoViewSet,
    VerificarCertificadoQRView,
    VerificarCertificadoView,
    VerificarPorHashView,
)

router = DefaultRouter()
router.register("certificados", CertificadoViewSet, basename="certificado")

urlpatterns = [
    # Rutas públicas ANTES del router (evitar colisión con lookup uuid)
    path(
        "certificados/verificar/<uuid:codigo>/",
        VerificarCertificadoView.as_view(),
        name="certificado-verificar",
    ),
    path(
        "certificados/verificar/<uuid:codigo>/qr.png",
        VerificarCertificadoQRView.as_view(),
        name="certificado-verificar-qr",
    ),
    path(
        "certificados/verificar/",
        VerificarPorHashView.as_view(),
        name="certificado-verificar-hash",
    ),
    path("", include(router.urls)),
]
