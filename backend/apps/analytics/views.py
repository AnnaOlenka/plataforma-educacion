"""
Dashboard de progreso: métricas y exportación PDF.
"""
from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cursos.models import Curso
from apps.cursos.permissions import usuario_inscrito

from .pdf import build_dashboard_pdf
from .services import metricas_estudiante, metricas_instructor


@extend_schema(responses={200: OpenApiTypes.OBJECT})
class EstudianteDashboardView(APIView):
    """
    GET /api/analytics/dashboard/
    Métricas: % completado, tiempo, desempeño (evaluaciones).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = metricas_estudiante(request.user)
        return Response(data)


@extend_schema(responses={200: OpenApiTypes.OBJECT})
class EstudianteCursoDashboardView(APIView):
    """GET /api/analytics/dashboard/curso/{slug}/"""

    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        try:
            curso = Curso.objects.get(slug=slug)
        except Curso.DoesNotExist:
            return Response({"detail": "Curso no encontrado"}, status=404)
        if not usuario_inscrito(request.user, curso):
            return Response(
                {"detail": "Debes estar inscrito para ver este dashboard."},
                status=403,
            )
        data = metricas_estudiante(request.user, curso=curso)
        return Response(data)


@extend_schema(responses={(200, "application/pdf"): OpenApiTypes.BINARY})
class DashboardExportPDFView(APIView):
    """
    GET /api/analytics/dashboard/exportar.pdf
    GET /api/analytics/dashboard/curso/{slug}/exportar.pdf
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, slug=None):
        curso = None
        titulo = "Dashboard general de progreso"
        if slug:
            try:
                curso = Curso.objects.get(slug=slug)
            except Curso.DoesNotExist:
                return Response({"detail": "Curso no encontrado"}, status=404)
            if not usuario_inscrito(request.user, curso):
                return Response(
                    {"detail": "Debes estar inscrito para exportar este informe."},
                    status=403,
                )
            titulo = f"Progreso — {curso.titulo}"

        metricas = metricas_estudiante(request.user, curso=curso)
        pdf_bytes = build_dashboard_pdf(metricas, titulo=titulo)

        filename = "dashboard-progreso.pdf"
        if curso:
            filename = f"progreso-{curso.slug}.pdf"

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["Content-Length"] = str(len(pdf_bytes))
        return response


@extend_schema(responses={200: OpenApiTypes.OBJECT})
class InstructorAnalyticsView(APIView):
    """GET /api/analytics/instructor/ — métricas agregadas por curso."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not getattr(user, "es_instructor", False):
            return Response({"detail": "Solo instructores"}, status=403)
        return Response(metricas_instructor(user))


@extend_schema(responses={(200, "application/pdf"): OpenApiTypes.BINARY})
class InstructorExportPDFView(APIView):
    """GET /api/analytics/instructor/exportar.pdf"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not getattr(user, "es_instructor", False):
            return Response({"detail": "Solo instructores"}, status=403)

        data = metricas_instructor(user)
        metricas = {
            "estudiante": {
                "id": user.id,
                "username": user.username,
                "nombre": user.get_full_name() or user.username,
            },
            "resumen": {
                "porcentaje_completado": round(
                    sum(c["promedio_progreso"] for c in data["cursos"])
                    / len(data["cursos"])
                    if data["cursos"]
                    else 0,
                    2,
                ),
                "lecciones_completadas": sum(c["completados"] for c in data["cursos"]),
                "lecciones_totales": sum(c["inscritos"] for c in data["cursos"]),
                "lecciones_en_progreso": 0,
                "tiempo_segundos": sum(
                    c["tiempo_total_estudiantes_seg"] for c in data["cursos"]
                ),
                "tiempo_formato": _fmt_sum(data["cursos"]),
                "desempeno": {
                    "promedio_puntaje": round(
                        sum(c["desempeno_promedio"] for c in data["cursos"])
                        / len(data["cursos"])
                        if data["cursos"]
                        else 0,
                        2,
                    ),
                    "intentos": sum(c["intentos_evaluacion"] for c in data["cursos"]),
                    "aprobados": sum(c["aprobados"] for c in data["cursos"]),
                    "tasa_aprobacion_pct": 0,
                },
                "cursos_inscritos": len(data["cursos"]),
            },
            "cursos": [
                {
                    "curso_titulo": c["titulo"],
                    "porcentaje_completado": c["promedio_progreso"],
                    "tiempo_formato": c["tiempo_formato"],
                    "desempeno_promedio": c["desempeno_promedio"],
                    "estado_inscripcion": f"{c['completados']}/{c['inscritos']} ok",
                }
                for c in data["cursos"]
            ],
        }
        intentos = metricas["resumen"]["desempeno"]["intentos"]
        aprobados = metricas["resumen"]["desempeno"]["aprobados"]
        metricas["resumen"]["desempeno"]["tasa_aprobacion_pct"] = (
            round(aprobados / intentos * 100, 2) if intentos else 0.0
        )

        pdf_bytes = build_dashboard_pdf(
            metricas, titulo="Dashboard instructor — métricas de cursos"
        )
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            'attachment; filename="dashboard-instructor.pdf"'
        )
        response["Content-Length"] = str(len(pdf_bytes))
        return response


def _fmt_sum(cursos):
    from .services import formatear_tiempo

    return formatear_tiempo(
        sum(c.get("tiempo_total_estudiantes_seg", 0) for c in cursos)
    )
