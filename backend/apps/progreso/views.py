from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.cursos.models import Leccion

from .models import ProgresoLeccion, recalcular_progreso_curso
from .serializers import ProgresoLeccionSerializer


class ProgresoViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = ProgresoLeccionSerializer

    def get_queryset(self):
        qs = ProgresoLeccion.objects.filter(estudiante=self.request.user).select_related(
            "leccion"
        )
        curso = self.request.query_params.get("curso")
        if curso:
            qs = qs.filter(leccion__modulo__curso_id=curso)
        return qs

    @action(detail=False, methods=["post"], url_path="heartbeat")
    def heartbeat(self, request):
        """
        Actualización en tiempo (casi) real desde useProgressTracker.
        Body: { leccion_id, porcentaje, tiempo_segundos, estado? }
        """
        leccion_id = request.data.get("leccion_id")
        if not leccion_id:
            return Response({"detail": "leccion_id requerido"}, status=400)

        try:
            leccion = Leccion.objects.select_related("modulo").get(pk=leccion_id)
        except Leccion.DoesNotExist:
            return Response({"detail": "Lección no encontrada"}, status=404)

        porcentaje = min(100, int(request.data.get("porcentaje", 0)))
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
        curso_pct = recalcular_progreso_curso(request.user.id, leccion.modulo.curso_id)
        data = ProgresoLeccionSerializer(prog).data
        data["curso_progreso_pct"] = curso_pct
        return Response(data, status=status.HTTP_200_OK)
