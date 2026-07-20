"""
Panel instructor: contenido, quizzes, calificación manual y analíticas.
"""
from django.db import transaction
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.administracion.models import AuditLogCalificacion
from apps.analytics.services import metricas_instructor
from apps.cursos.models import Curso, Inscripcion, Leccion, Modulo
from apps.cursos.permissions import EsInstructor, es_dueno_curso
from apps.evaluaciones.models import Evaluacion, IntentoEvaluacion, Pregunta
from apps.progreso.models import ProgresoLeccion

from .serializers import (
    CalificacionManualSerializer,
    InstructorCursoResumenSerializer,
    InstructorEvaluacionSerializer,
    InstructorIntentoSerializer,
    InstructorLeccionSerializer,
    InstructorModuloSerializer,
    InstructorPreguntaSerializer,
)


class InstructorCursoViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    permission_classes = [EsInstructor]
    serializer_class = InstructorCursoResumenSerializer
    lookup_field = "slug"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Curso.objects.none()
        user = self.request.user
        qs = Curso.objects.all()
        if not getattr(user, "es_admin", False):
            qs = qs.filter(instructor=user)
        return qs.annotate(
            inscritos=Count(
                "inscripciones",
                filter=Q(
                    inscripciones__estado__in=[
                        Inscripcion.Estado.ACTIVA,
                        Inscripcion.Estado.COMPLETADA,
                    ]
                ),
                distinct=True,
            ),
            modulos_count=Count("modulos", distinct=True),
            lecciones_count=Count("modulos__lecciones", distinct=True),
        ).order_by("-creado_en")

    @action(detail=True, methods=["post"], url_path="solicitar-aprobacion")
    def solicitar_aprobacion(self, request, slug=None):
        """Pasa el curso a pendiente_aprobacion para revisión del admin."""
        curso = self.get_object()
        if not es_dueno_curso(request.user, curso):
            return Response({"detail": "No autorizado"}, status=403)
        if curso.estado not in (
            Curso.Estado.BORRADOR,
            Curso.Estado.RECHAZADO,
        ):
            return Response(
                {
                    "detail": f"Solo borrador/rechazado pueden solicitar aprobación (actual: {curso.estado})."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not curso.modulos.exists():
            return Response(
                {"detail": "El curso debe tener al menos un módulo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        curso.estado = Curso.Estado.PENDIENTE_APROBACION
        curso.solicitado_en = timezone.now()
        curso.motivo_rechazo = ""
        curso.save(update_fields=["estado", "solicitado_en", "motivo_rechazo", "actualizado_en"])
        return Response(
            {
                "detail": "Curso enviado a aprobación.",
                "slug": curso.slug,
                "estado": curso.estado,
                "solicitado_en": curso.solicitado_en,
            }
        )


class InstructorModuloViewSet(viewsets.ModelViewSet):
    permission_classes = [EsInstructor]
    serializer_class = InstructorModuloSerializer
    filterset_fields = ("curso",)
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Modulo.objects.none()
        user = self.request.user
        qs = Modulo.objects.select_related("curso")
        if getattr(user, "es_admin", False):
            return qs
        return qs.filter(curso__instructor=user)


class InstructorLeccionViewSet(viewsets.ModelViewSet):
    permission_classes = [EsInstructor]
    serializer_class = InstructorLeccionSerializer
    filterset_fields = ("modulo", "tipo", "modulo__curso")
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Leccion.objects.none()
        user = self.request.user
        qs = Leccion.objects.select_related("modulo", "modulo__curso")
        if getattr(user, "es_admin", False):
            return qs
        return qs.filter(modulo__curso__instructor=user)

    @action(detail=True, methods=["post"], url_path="subir-archivo")
    def subir_archivo(self, request, pk=None):
        leccion = self.get_object()
        archivo = request.FILES.get("archivo")
        if not archivo:
            return Response(
                {"detail": "Campo 'archivo' requerido (multipart)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        leccion.archivo = archivo
        if request.data.get("recurso_url"):
            leccion.recurso_url = request.data.get("recurso_url")
        leccion.save()
        return Response(InstructorLeccionSerializer(leccion).data)


class InstructorEvaluacionViewSet(viewsets.ModelViewSet):
    permission_classes = [EsInstructor]
    serializer_class = InstructorEvaluacionSerializer
    filterset_fields = ("leccion", "activo", "leccion__modulo__curso")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Evaluacion.objects.none()
        user = self.request.user
        qs = Evaluacion.objects.prefetch_related("preguntas").select_related(
            "leccion", "leccion__modulo", "leccion__modulo__curso"
        )
        if getattr(user, "es_admin", False):
            return qs
        return qs.filter(leccion__modulo__curso__instructor=user)


class InstructorPreguntaViewSet(viewsets.ModelViewSet):
    permission_classes = [EsInstructor]
    serializer_class = InstructorPreguntaSerializer
    filterset_fields = ("evaluacion", "tipo")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Pregunta.objects.none()
        user = self.request.user
        qs = Pregunta.objects.select_related(
            "evaluacion", "evaluacion__leccion__modulo__curso"
        )
        if getattr(user, "es_admin", False):
            return qs
        return qs.filter(evaluacion__leccion__modulo__curso__instructor=user)


class InstructorIntentoViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    permission_classes = [EsInstructor]
    serializer_class = InstructorIntentoSerializer
    filterset_fields = ("estado", "evaluacion", "aprobado")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return IntentoEvaluacion.objects.none()
        user = self.request.user
        qs = IntentoEvaluacion.objects.select_related(
            "estudiante",
            "evaluacion",
            "evaluacion__leccion__modulo__curso",
            "calificado_por",
        ).exclude(estado=IntentoEvaluacion.Estado.EN_CURSO)
        if not getattr(user, "es_admin", False):
            qs = qs.filter(evaluacion__leccion__modulo__curso__instructor=user)

        curso = self.request.query_params.get("curso")
        if curso:
            if str(curso).isdigit():
                qs = qs.filter(evaluacion__leccion__modulo__curso_id=curso)
            else:
                qs = qs.filter(evaluacion__leccion__modulo__curso__slug=curso)

        pendientes = self.request.query_params.get("pendientes")
        if pendientes in ("1", "true", "True"):
            qs = qs.filter(estado=IntentoEvaluacion.Estado.PENDIENTE_REVISION)
        return qs

    @action(detail=True, methods=["post", "patch"], url_path="calificar")
    def calificar(self, request, pk=None):
        ser = CalificacionManualSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        with transaction.atomic():
            intento = (
                IntentoEvaluacion.objects.select_for_update()
                .select_related("evaluacion")
                .get(pk=self.get_object().pk)
            )
            anterior = {
                "puntaje": intento.puntaje,
                "aprobado": intento.aprobado,
                "feedback": intento.feedback_instructor,
                "detalle": list(intento.detalle_calificacion or []),
            }

            intento.puntaje = data["puntaje"]
            if "aprobado" in data:
                intento.aprobado = data["aprobado"]
            else:
                intento.aprobado = (
                    float(data["puntaje"]) >= intento.evaluacion.puntaje_aprobacion
                )
            if "feedback_instructor" in data:
                intento.feedback_instructor = data["feedback_instructor"]
            if "detalle_calificacion" in data:
                intento.detalle_calificacion = data["detalle_calificacion"]
            intento.estado = IntentoEvaluacion.Estado.REVISADO
            intento.calificado_por = request.user
            intento.calificado_en = timezone.now()
            if not intento.finalizado_en:
                intento.finalizado_en = timezone.now()
            intento.save()

            AuditLogCalificacion.objects.create(
                intento=intento,
                actor=request.user,
                accion=AuditLogCalificacion.Accion.CALIFICACION_MANUAL,
                puntaje_anterior=anterior["puntaje"],
                puntaje_nuevo=intento.puntaje,
                aprobado_anterior=anterior["aprobado"],
                aprobado_nuevo=intento.aprobado,
                feedback_anterior=anterior["feedback"],
                feedback_nuevo=intento.feedback_instructor,
                detalle_anterior=anterior["detalle"],
                detalle_nuevo=list(intento.detalle_calificacion or []),
                motivo=data.get("feedback_instructor", "")[:500],
            )

        return Response(InstructorIntentoSerializer(intento).data)


@extend_schema(responses={200: OpenApiTypes.OBJECT})
class InstructorAnalyticsCursoView(APIView):
    permission_classes = [EsInstructor]

    def get(self, request, slug):
        try:
            curso = Curso.objects.get(slug=slug)
        except Curso.DoesNotExist:
            return Response({"detail": "Curso no encontrado"}, status=404)
        if not es_dueno_curso(request.user, curso):
            return Response({"detail": "No autorizado"}, status=403)

        inscritos = Inscripcion.objects.filter(curso=curso).exclude(
            estado=Inscripcion.Estado.CANCELADA
        )
        progreso_agg = inscritos.aggregate(promedio=Avg("progreso_pct"))
        tiempo = (
            ProgresoLeccion.objects.filter(leccion__modulo__curso=curso).aggregate(
                t=Sum("tiempo_segundos")
            )["t"]
            or 0
        )
        intentos = IntentoEvaluacion.objects.filter(
            evaluacion__leccion__modulo__curso=curso
        ).exclude(estado=IntentoEvaluacion.Estado.EN_CURSO)
        intentos_agg = intentos.aggregate(
            promedio=Avg("puntaje"),
            total=Count("id"),
            aprobados=Count("id", filter=Q(aprobado=True)),
            pendientes=Count(
                "id", filter=Q(estado=IntentoEvaluacion.Estado.PENDIENTE_REVISION)
            ),
        )

        estudiantes = []
        for insc in inscritos.select_related("estudiante").order_by("-progreso_pct"):
            est = insc.estudiante
            t_est = (
                ProgresoLeccion.objects.filter(
                    estudiante=est, leccion__modulo__curso=curso
                ).aggregate(t=Sum("tiempo_segundos"))["t"]
                or 0
            )
            avg_quiz = (
                intentos.filter(estudiante=est).aggregate(p=Avg("puntaje"))["p"] or 0
            )
            estudiantes.append(
                {
                    "id": est.id,
                    "username": est.username,
                    "nombre": est.get_full_name() or est.username,
                    "estado_inscripcion": insc.estado,
                    "progreso_pct": float(insc.progreso_pct),
                    "tiempo_segundos": int(t_est),
                    "desempeno_promedio": round(float(avg_quiz), 2),
                }
            )

        evaluaciones = []
        for ev in Evaluacion.objects.filter(leccion__modulo__curso=curso):
            qs = intentos.filter(evaluacion=ev)
            agg = qs.aggregate(
                total=Count("id"),
                aprobados=Count("id", filter=Q(aprobado=True)),
                promedio=Avg("puntaje"),
                pendientes=Count(
                    "id",
                    filter=Q(estado=IntentoEvaluacion.Estado.PENDIENTE_REVISION),
                ),
            )
            evaluaciones.append(
                {
                    "id": ev.id,
                    "titulo": ev.titulo,
                    "leccion_id": ev.leccion_id,
                    "total_intentos": agg["total"] or 0,
                    "aprobados": agg["aprobados"] or 0,
                    "promedio_puntaje": round(float(agg["promedio"] or 0), 2),
                    "pendientes_revision": agg["pendientes"] or 0,
                }
            )

        return Response(
            {
                "curso": {
                    "id": curso.id,
                    "slug": curso.slug,
                    "titulo": curso.titulo,
                    "estado": curso.estado,
                },
                "metricas": {
                    "inscritos": inscritos.count(),
                    "completados": inscritos.filter(
                        estado=Inscripcion.Estado.COMPLETADA
                    ).count(),
                    "promedio_progreso": round(float(progreso_agg["promedio"] or 0), 2),
                    "tiempo_total_segundos": int(tiempo),
                    "desempeno_promedio": round(float(intentos_agg["promedio"] or 0), 2),
                    "intentos": intentos_agg["total"] or 0,
                    "aprobados": intentos_agg["aprobados"] or 0,
                    "pendientes_revision": intentos_agg["pendientes"] or 0,
                },
                "estudiantes": estudiantes,
                "evaluaciones": evaluaciones,
            }
        )


@extend_schema(responses={200: OpenApiTypes.OBJECT})
class InstructorPanelResumenView(APIView):
    permission_classes = [EsInstructor]

    def get(self, request):
        data = metricas_instructor(request.user)
        pendientes = IntentoEvaluacion.objects.filter(
            estado=IntentoEvaluacion.Estado.PENDIENTE_REVISION
        )
        if not getattr(request.user, "es_admin", False):
            pendientes = pendientes.filter(
                evaluacion__leccion__modulo__curso__instructor=request.user
            )
        data["pendientes_revision"] = pendientes.count()
        data["enlaces"] = {
            "cursos": "/api/instructor/cursos/",
            "modulos": "/api/instructor/modulos/",
            "lecciones": "/api/instructor/lecciones/",
            "evaluaciones": "/api/instructor/evaluaciones/",
            "preguntas": "/api/instructor/preguntas/",
            "intentos": "/api/instructor/intentos/",
            "intentos_pendientes": "/api/instructor/intentos/?pendientes=1",
            "analytics": "/api/analytics/instructor/",
        }
        return Response(data)
