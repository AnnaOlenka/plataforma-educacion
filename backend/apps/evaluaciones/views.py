from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.cursos.models import Leccion
from apps.cursos.permissions import IsInstructorOrReadOnly, usuario_inscrito

from .models import Evaluacion, IntentoEvaluacion, Pregunta
from .serializers import (
    EnviarIntentoSerializer,
    EvaluacionInstructorSerializer,
    EvaluacionSerializer,
    IntentoSerializer,
    ValidarRespuestaSerializer,
)
from .services import calificar_intento, validar_pregunta


class EvaluacionThrottle(UserRateThrottle):
    scope = "evaluacion"


class EvaluacionViewSet(viewsets.ModelViewSet):
    """
    Evaluaciones interactivas Canvas:
    - Lectura pública de activas (sin respuestas correctas).
    - Escritura: instructor.
    - validar: feedback en tiempo real (arrastrar / seleccionar).
    - enviar: calificación final del intento.
    """

    queryset = Evaluacion.objects.filter(activo=True).prefetch_related("preguntas")
    permission_classes = [IsInstructorOrReadOnly]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Evaluacion.objects.none()
        qs = Evaluacion.objects.prefetch_related("preguntas")
        user = self.request.user
        if self.action in ("list", "retrieve", "validar", "enviar", "iniciar", "intentos"):
            return qs.filter(activo=True)
        if user.is_authenticated and getattr(user, "es_instructor", False):
            if getattr(user, "es_admin", False):
                return qs
            return qs.filter(leccion__modulo__curso__instructor=user)
        return qs.filter(activo=True)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return EvaluacionInstructorSerializer
        return EvaluacionSerializer

    def get_throttles(self):
        if self.action in ("enviar", "validar"):
            return [EvaluacionThrottle()]
        return super().get_throttles()

    def _require_inscrito(self, request, evaluacion):
        curso = evaluacion.leccion.modulo.curso
        if not usuario_inscrito(request.user, curso):
            return Response(
                {"detail": "Debes estar inscrito en el curso para esta evaluación."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated],
        url_path="iniciar",
    )
    def iniciar(self, request, pk=None):
        """Abre un intento en curso (cronómetro del Canvas)."""
        evaluacion = self.get_object()
        denied = self._require_inscrito(request, evaluacion)
        if denied:
            return denied

        intento = IntentoEvaluacion.objects.create(
            evaluacion=evaluacion,
            estudiante=request.user,
            estado=IntentoEvaluacion.Estado.EN_CURSO,
            respuestas={},
            canvas_payload={},
        )
        return Response(
            {
                "intento_id": intento.id,
                "evaluacion_id": evaluacion.id,
                "tiempo_limite_seg": evaluacion.tiempo_limite_seg,
                "iniciado_en": intento.iniciado_en,
                "canvas_schema": evaluacion.canvas_schema,
                "preguntas": EvaluacionSerializer(evaluacion).data["preguntas"],
            },
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated],
        url_path="validar",
    )
    def validar(self, request, pk=None):
        """
        Validación en tiempo real de una respuesta Canvas
        (selección, arrastre o click) sin finalizar el intento.
        """
        evaluacion = self.get_object()
        denied = self._require_inscrito(request, evaluacion)
        if denied:
            return denied

        ser = ValidarRespuestaSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        pregunta_id = ser.validated_data["pregunta_id"]
        try:
            pregunta = evaluacion.preguntas.get(pk=pregunta_id)
        except Exception:
            return Response(
                {"detail": "Pregunta no pertenece a esta evaluación."},
                status=status.HTTP_404_NOT_FOUND,
            )

        canvas_payload = ser.validated_data.get("canvas_payload") or {}
        canvas_item = canvas_payload
        if str(pregunta_id) in canvas_payload or pregunta_id in canvas_payload:
            canvas_item = canvas_payload.get(str(pregunta_id), canvas_payload.get(pregunta_id))

        resultado = validar_pregunta(
            pregunta,
            ser.validated_data.get("respuesta"),
            canvas_item if isinstance(canvas_item, dict) else {},
        )
        return Response(
            {
                **resultado,
                "validacion_tiempo_real": True,
            }
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated],
    )
    def enviar(self, request, pk=None):
        """Califica y cierra el intento (throttling en picos)."""
        evaluacion = self.get_object()
        denied = self._require_inscrito(request, evaluacion)
        if denied:
            return denied

        ser = EnviarIntentoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        respuestas = ser.validated_data.get("respuestas") or {}
        canvas_payload = ser.validated_data.get("canvas_payload") or {}
        intento_id = request.data.get("intento_id")

        resultado = calificar_intento(evaluacion, respuestas, canvas_payload)
        requiere_revision = evaluacion.preguntas.filter(
            tipo=Pregunta.Tipo.CANVAS_DIBUJO
        ).exists()
        estado_final = (
            IntentoEvaluacion.Estado.PENDIENTE_REVISION
            if requiere_revision
            else IntentoEvaluacion.Estado.FINALIZADO
        )

        if intento_id:
            try:
                intento = IntentoEvaluacion.objects.get(
                    pk=intento_id,
                    estudiante=request.user,
                    evaluacion=evaluacion,
                    estado=IntentoEvaluacion.Estado.EN_CURSO,
                )
            except IntentoEvaluacion.DoesNotExist:
                return Response(
                    {"detail": "Intento en curso no encontrado."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            intento.respuestas = respuestas
            intento.canvas_payload = canvas_payload
            intento.detalle_calificacion = resultado["detalle_calificacion"]
            intento.puntaje = resultado["puntaje"]
            intento.puntaje_automatico = resultado["puntaje"]
            intento.aprobado = resultado["aprobado"]
            intento.estado = estado_final
            intento.finalizado_en = timezone.now()
            intento.save()
        else:
            intento = IntentoEvaluacion.objects.create(
                evaluacion=evaluacion,
                estudiante=request.user,
                respuestas=respuestas,
                canvas_payload=canvas_payload,
                detalle_calificacion=resultado["detalle_calificacion"],
                puntaje=resultado["puntaje"],
                puntaje_automatico=resultado["puntaje"],
                aprobado=resultado["aprobado"],
                estado=estado_final,
                finalizado_en=timezone.now(),
            )

        data = IntentoSerializer(intento).data
        data["puntos_obtenidos"] = resultado["puntos_obtenidos"]
        data["puntos_totales"] = resultado["puntos_totales"]
        data["requiere_revision"] = requiere_revision
        return Response(data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[permissions.IsAuthenticated],
        url_path="intentos",
    )
    def intentos(self, request, pk=None):
        evaluacion = self.get_object()
        qs = IntentoEvaluacion.objects.filter(
            evaluacion=evaluacion, estudiante=request.user
        )
        return Response(IntentoSerializer(qs, many=True).data)


@extend_schema(responses=EvaluacionSerializer)
class EvaluacionByLeccionView(APIView):
    """Named route usada por HATEOAS en ruta-aprendizaje."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, leccion_id):
        try:
            leccion = Leccion.objects.select_related("modulo__curso").get(pk=leccion_id)
            evaluacion = Evaluacion.objects.prefetch_related("preguntas").get(
                leccion=leccion, activo=True
            )
        except (Leccion.DoesNotExist, Evaluacion.DoesNotExist):
            return Response(
                {"detail": "No encontrada"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(EvaluacionSerializer(evaluacion).data)
