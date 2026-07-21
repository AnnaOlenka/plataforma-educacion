from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.cursos.models import Curso, Inscripcion, Leccion
from apps.cursos.permissions import usuario_inscrito

from .models import ProgresoLeccion, recalcular_progreso_curso
from .serializers import ProgresoLeccionSerializer, ResumenProgresoCursoSerializer


class ProgresoViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """Marcadores de progreso por lección y resumen por curso."""

    serializer_class = ProgresoLeccionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ("estado", "leccion")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ProgresoLeccion.objects.none()
        qs = ProgresoLeccion.objects.filter(
            estudiante=self.request.user
        ).select_related("leccion", "leccion__modulo", "leccion__modulo__curso")
        curso = self.request.query_params.get("curso")
        if curso:
            if str(curso).isdigit():
                qs = qs.filter(leccion__modulo__curso_id=curso)
            else:
                qs = qs.filter(leccion__modulo__curso__slug=curso)
        return qs

    @action(detail=False, methods=["post"], url_path="heartbeat")
    def heartbeat(self, request):
        """
        Actualización casi en tiempo real (useProgressTracker).
        Body: { leccion_id, porcentaje, tiempo_segundos, estado? }
        """
        leccion_id = request.data.get("leccion_id")
        if not leccion_id:
            return Response(
                {"detail": "leccion_id requerido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            leccion = Leccion.objects.select_related("modulo", "modulo__curso").get(
                pk=leccion_id
            )
        except Leccion.DoesNotExist:
            return Response(
                {"detail": "Lección no encontrada"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not usuario_inscrito(request.user, leccion.modulo.curso):
            return Response(
                {"detail": "Debes estar inscrito para registrar progreso."},
                status=status.HTTP_403_FORBIDDEN,
            )

        porcentaje = min(100, max(0, int(request.data.get("porcentaje", 0))))
        estado = request.data.get("estado")
        if not estado:
            if porcentaje >= 100:
                estado = ProgresoLeccion.Estado.COMPLETADA
            elif porcentaje > 0:
                estado = ProgresoLeccion.Estado.EN_PROGRESO
            else:
                estado = ProgresoLeccion.Estado.NO_INICIADA

        prog, _ = ProgresoLeccion.objects.update_or_create(
            estudiante=request.user,
            leccion=leccion,
            defaults={
                "porcentaje": porcentaje,
                "estado": estado,
                "tiempo_segundos": int(request.data.get("tiempo_segundos", 0)),
            },
        )
        curso_pct = recalcular_progreso_curso(
            request.user.id, leccion.modulo.curso_id
        )
        if curso_pct >= 100:
            Inscripcion.objects.filter(
                estudiante=request.user,
                curso_id=leccion.modulo.curso_id,
                estado=Inscripcion.Estado.ACTIVA,
            ).update(estado=Inscripcion.Estado.COMPLETADA)

        data = ProgresoLeccionSerializer(prog).data
        data["curso_progreso_pct"] = curso_pct
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="completar")
    def completar(self, request):
        """Marca una lección como completada (marcador 100%)."""
        leccion_id = request.data.get("leccion_id")
        if not leccion_id:
            return Response(
                {"detail": "leccion_id requerido"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            leccion = Leccion.objects.select_related("modulo", "modulo__curso").get(
                pk=leccion_id
            )
        except Leccion.DoesNotExist:
            return Response(
                {"detail": "Lección no encontrada"},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not usuario_inscrito(request.user, leccion.modulo.curso):
            return Response(
                {"detail": "Debes estar inscrito para registrar progreso."},
                status=status.HTTP_403_FORBIDDEN,
            )

        existente = ProgresoLeccion.objects.filter(
            estudiante=request.user, leccion=leccion
        ).first()
        tiempo = int(
            request.data.get(
                "tiempo_segundos",
                existente.tiempo_segundos if existente else 0,
            )
        )
        prog, _ = ProgresoLeccion.objects.update_or_create(
            estudiante=request.user,
            leccion=leccion,
            defaults={
                "porcentaje": 100,
                "estado": ProgresoLeccion.Estado.COMPLETADA,
                "tiempo_segundos": tiempo,
            },
        )
        curso_pct = recalcular_progreso_curso(
            request.user.id, leccion.modulo.curso_id
        )
        if curso_pct >= 100:
            Inscripcion.objects.filter(
                estudiante=request.user,
                curso_id=leccion.modulo.curso_id,
                estado=Inscripcion.Estado.ACTIVA,
            ).update(estado=Inscripcion.Estado.COMPLETADA)

        data = ProgresoLeccionSerializer(prog).data
        data["curso_progreso_pct"] = curso_pct
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="curso/(?P<curso_ref>[^/.]+)")
    def resumen_curso(self, request, curso_ref=None):
        """
        Marcadores de progreso de todas las lecciones de un curso.
        curso_ref: id numérico o slug.
        """
        try:
            if str(curso_ref).isdigit():
                curso = Curso.objects.get(pk=curso_ref)
            else:
                curso = Curso.objects.get(slug=curso_ref)
        except Curso.DoesNotExist:
            return Response(
                {"detail": "Curso no encontrado"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not usuario_inscrito(request.user, curso):
            return Response(
                {"detail": "Debes estar inscrito para ver el progreso."},
                status=status.HTTP_403_FORBIDDEN,
            )

        lecciones = (
            Leccion.objects.filter(modulo__curso=curso)
            .select_related("modulo")
            .order_by("modulo__orden", "orden")
        )
        progresos = {
            p.leccion_id: p
            for p in ProgresoLeccion.objects.filter(
                estudiante=request.user, leccion__modulo__curso=curso
            )
        }

        marcadores = []
        completadas = 0
        total_obl = 0
        for i, lec in enumerate(lecciones, start=1):
            prog = progresos.get(lec.id)
            estado = prog.estado if prog else ProgresoLeccion.Estado.NO_INICIADA
            porcentaje = prog.porcentaje if prog else 0
            tiempo = prog.tiempo_segundos if prog else 0
            if lec.es_obligatoria:
                total_obl += 1
                if estado == ProgresoLeccion.Estado.COMPLETADA:
                    completadas += 1
            marcadores.append(
                {
                    "leccion_id": lec.id,
                    "titulo": lec.titulo,
                    "tipo": lec.tipo,
                    "modulo_id": lec.modulo_id,
                    "modulo_titulo": lec.modulo.titulo,
                    "orden_global": i,
                    "es_obligatoria": lec.es_obligatoria,
                    "estado": estado,
                    "porcentaje": porcentaje,
                    "tiempo_segundos": tiempo,
                }
            )

        insc = Inscripcion.objects.filter(
            estudiante=request.user, curso=curso
        ).first()
        progreso_pct = (
            float(insc.progreso_pct)
            if insc
            else (round(completadas / total_obl * 100, 2) if total_obl else 0)
        )

        payload = {
            "curso_id": curso.id,
            "curso_slug": curso.slug,
            "curso_titulo": curso.titulo,
            "progreso_pct": progreso_pct,
            "completadas_obligatorias": completadas,
            "total_obligatorias": total_obl,
            "marcadores": marcadores,
        }
        serializer = ResumenProgresoCursoSerializer(payload)
        return Response(serializer.data)
