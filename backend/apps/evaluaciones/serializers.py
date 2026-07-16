from rest_framework import serializers

from .models import Evaluacion, IntentoEvaluacion, Pregunta


class PreguntaPublicSerializer(serializers.ModelSerializer):
    """Sin respuesta_correcta — para el Canvas del estudiante."""

    class Meta:
        model = Pregunta
        fields = ("id", "enunciado", "tipo", "orden", "puntaje", "opciones", "canvas_config")


class EvaluacionSerializer(serializers.ModelSerializer):
    preguntas = PreguntaPublicSerializer(many=True, read_only=True)

    class Meta:
        model = Evaluacion
        fields = (
            "id",
            "leccion",
            "titulo",
            "tiempo_limite_seg",
            "puntaje_aprobacion",
            "canvas_schema",
            "preguntas",
        )


class IntentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntentoEvaluacion
        fields = (
            "id",
            "evaluacion",
            "respuestas",
            "canvas_payload",
            "puntaje",
            "aprobado",
            "iniciado_en",
            "finalizado_en",
        )
        read_only_fields = ("puntaje", "aprobado", "iniciado_en", "finalizado_en")
