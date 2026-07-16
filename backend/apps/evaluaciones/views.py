from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .models import Evaluacion, IntentoEvaluacion, Pregunta
from .serializers import EvaluacionSerializer, IntentoSerializer


class EvaluacionThrottle(UserRateThrottle):
    scope = "evaluacion"


class EvaluacionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EvaluacionSerializer
    queryset = Evaluacion.objects.filter(activo=True).prefetch_related("preguntas")

    def get_throttles(self):
        if self.action == "enviar":
            return [EvaluacionThrottle()]
        return super().get_throttles()

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def enviar(self, request, pk=None):
        """Califica intento; throttling estricto en picos de evaluación."""
        evaluacion = self.get_object()
        respuestas = request.data.get("respuestas", {})
        canvas_payload = request.data.get("canvas_payload", {})

        total = 0
        obtenidos = 0
        for pregunta in evaluacion.preguntas.all():
            total += pregunta.puntaje
            resp = respuestas.get(str(pregunta.id)) or respuestas.get(pregunta.id)
            if resp is not None and self._es_correcta(pregunta, resp, canvas_payload):
                obtenidos += pregunta.puntaje

        pct = (obtenidos / total * 100) if total else 0
        aprobado = pct >= evaluacion.puntaje_aprobacion

        intento = IntentoEvaluacion.objects.create(
            evaluacion=evaluacion,
            estudiante=request.user,
            respuestas=respuestas,
            canvas_payload=canvas_payload,
            puntaje=round(pct, 2),
            aprobado=aprobado,
            finalizado_en=timezone.now(),
        )
        return Response(IntentoSerializer(intento).data, status=status.HTTP_201_CREATED)

    @staticmethod
    def _es_correcta(pregunta: Pregunta, resp, canvas_payload) -> bool:
        correcta = pregunta.respuesta_correcta
        if pregunta.tipo == Pregunta.Tipo.CANVAS_HOTSPOT:
            expected = correcta.get("hotspot_id")
            got = (canvas_payload.get(str(pregunta.id)) or {}).get("hotspot_id")
            return expected == got
        if isinstance(correcta, dict) and "valor" in correcta:
            return resp == correcta["valor"]
        return resp == correcta


class EvaluacionByLeccionView(APIView):
    """Named route usada por HATEOAS en ruta-aprendizaje."""

    def get(self, request, leccion_id):
        try:
            evaluacion = Evaluacion.objects.prefetch_related("preguntas").get(
                leccion_id=leccion_id, activo=True
            )
        except Evaluacion.DoesNotExist:
            return Response({"detail": "No encontrada"}, status=status.HTTP_404_NOT_FOUND)
        return Response(EvaluacionSerializer(evaluacion).data)
