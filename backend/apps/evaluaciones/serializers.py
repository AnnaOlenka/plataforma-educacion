from rest_framework import serializers

from .models import Evaluacion, IntentoEvaluacion, Pregunta


class PreguntaPublicSerializer(serializers.ModelSerializer):
    """Sin respuesta_correcta — para el Canvas del estudiante."""

    class Meta:
        model = Pregunta
        fields = (
            "id",
            "enunciado",
            "tipo",
            "orden",
            "puntaje",
            "opciones",
            "canvas_config",
        )


class PreguntaWriteSerializer(serializers.ModelSerializer):
    """Instructor: incluye respuesta_correcta."""

    class Meta:
        model = Pregunta
        fields = (
            "id",
            "enunciado",
            "tipo",
            "orden",
            "puntaje",
            "opciones",
            "respuesta_correcta",
            "canvas_config",
        )


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
            "activo",
            "preguntas",
        )
        read_only_fields = ("id",)


class EvaluacionInstructorSerializer(serializers.ModelSerializer):
    preguntas = PreguntaWriteSerializer(many=True, required=False)

    class Meta:
        model = Evaluacion
        fields = (
            "id",
            "leccion",
            "titulo",
            "tiempo_limite_seg",
            "puntaje_aprobacion",
            "canvas_schema",
            "activo",
            "preguntas",
        )

    def create(self, validated_data):
        preguntas_data = validated_data.pop("preguntas", [])
        evaluacion = Evaluacion.objects.create(**validated_data)
        for p in preguntas_data:
            Pregunta.objects.create(evaluacion=evaluacion, **p)
        return evaluacion

    def update(self, instance, validated_data):
        preguntas_data = validated_data.pop("preguntas", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if preguntas_data is not None:
            instance.preguntas.all().delete()
            for p in preguntas_data:
                Pregunta.objects.create(evaluacion=instance, **p)
        return instance


class ValidarRespuestaSerializer(serializers.Serializer):
    pregunta_id = serializers.IntegerField()
    respuesta = serializers.JSONField(required=False, allow_null=True)
    canvas_payload = serializers.JSONField(required=False, default=dict)


class EnviarIntentoSerializer(serializers.Serializer):
    respuestas = serializers.DictField(child=serializers.JSONField(), required=False, default=dict)
    canvas_payload = serializers.DictField(
        child=serializers.JSONField(), required=False, default=dict
    )


class IntentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntentoEvaluacion
        fields = (
            "id",
            "evaluacion",
            "respuestas",
            "canvas_payload",
            "detalle_calificacion",
            "puntaje",
            "puntaje_automatico",
            "aprobado",
            "estado",
            "feedback_instructor",
            "calificado_en",
            "iniciado_en",
            "finalizado_en",
        )
        read_only_fields = fields
