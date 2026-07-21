"""
URLconf principal — MTV + API DRF + métricas Prometheus + OpenAPI.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

admin.site.site_header = "EduPath LMS — Administración"
admin.site.site_title = "EduPath Admin"
admin.site.index_title = "Panel de gestión académica"


def healthz(_request):
    """Probe de liveness/readiness para K8s."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz/", healthz, name="healthz"),
    path("readyz/", healthz, name="readyz"),
    path("", include("django_prometheus.urls")),
    # OpenAPI schema + UIs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
    path("api/auth/", include("apps.usuarios.urls")),
    path("api/admin/", include("apps.administracion.urls")),
    path("api/instructor/", include("apps.instructor.urls")),
    path("api/", include("apps.cursos.urls")),
    path("api/", include("apps.evaluaciones.urls")),
    path("api/", include("apps.certificados.urls")),
    path("api/", include("apps.progreso.urls")),
    path("api/", include("apps.analytics.urls")),
    path("api/legacy/", include("apps.cursos.legacy_urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
