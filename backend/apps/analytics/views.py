"""
Panel de analíticas para instructores — agregaciones ORM annotate/Count.
"""
from django.db.models import Avg, Count, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cursos.models import Curso, Inscripcion
from apps.evaluaciones.models import IntentoEvaluacion
from apps.progreso.models import ProgresoLeccion


class InstructorAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.es_instructor:
            return Response({"detail": "Solo instructores"}, status=403)

        cursos = (
            Curso.objects.filter(instructor=user)
            .annotate(
                inscritos=Count("inscripciones", distinct=True),
                completados=Count(
                    "inscripciones",
                    filter=Q(inscripciones__estado=Inscripcion.Estado.COMPLETADA),
                    distinct=True,
                ),
                promedio_progreso=Avg("inscripciones__progreso_pct"),
                lecciones=Count("modulos__lecciones", distinct=True),
            )
            .values(
                "id",
                "titulo",
                "slug",
                "inscritos",
                "completados",
                "promedio_progreso",
                "lecciones",
            )
        )

        intentos = (
            IntentoEvaluacion.objects.filter(evaluacion__leccion__modulo__curso__instructor=user)
            .values("evaluacion__titulo")
            .annotate(
                total_intentos=Count("id"),
                aprobados=Count("id", filter=Q(aprobado=True)),
                promedio_puntaje=Avg("puntaje"),
            )
            .order_by("-total_intentos")[:20]
        )

        progreso_reciente = (
            ProgresoLeccion.objects.filter(leccion__modulo__curso__instructor=user)
            .select_related("estudiante", "leccion")
            .order_by("-actualizado_en")[:15]
            .values(
                "estudiante__username",
                "leccion__titulo",
                "estado",
                "porcentaje",
                "actualizado_en",
            )
        )

        return Response(
            {
                "cursos": list(cursos),
                "evaluaciones": list(intentos),
                "actividad_reciente": list(progreso_reciente),
            }
        )
