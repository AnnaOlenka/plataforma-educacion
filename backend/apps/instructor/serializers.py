from rest_framework import serializers

from apps.cursos.models import Curso, Leccion, Modulo
from apps.cursos.permissions import es_dueno_curso
from apps.evaluaciones.models import Evaluacion, IntentoEvaluacion, Pregunta


class InstructorModuloSerializer(serializers.ModelSerializer):
    class Meta:
        model = Modulo
        fields = ("id", "curso", "titulo", "orden", "descripcion")

    def validate_curso(self, curso):
        request = self.context.get("request")
        if request and not es_dueno_curso(request.user, curso):
            raise serializers.ValidationError("No eres instructor de este curso.")
        return curso


class InstructorLeccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Leccion
        fields = (
            "id",
            "modulo",
            "titulo",
            "orden",
            "tipo",
            "contenido",
            "recurso_url",
            "archivo",
            "duracion_minutos",
            "es_obligatoria",
        )

    def validate_modulo(self, modulo):
        request = self.context.get("request")
        if request and not es_dueno_curso(request.user, modulo.curso):
            raise serializers.ValidationError("No eres instructor de este módulo.")
        return modulo


class InstructorPreguntaNestedSerializer(serializers.ModelSerializer):
    """Pregunta embebida al crear/editar evaluación (sin FK evaluacion)."""

    class Meta:
        model = Pregunta
        fields = (
            "enunciado",
            "tipo",
            "orden",
            "puntaje",
            "opciones",
            "respuesta_correcta",
            "canvas_config",
        )


class InstructorPreguntaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pregunta
        fields = (
            "id",
            "evaluacion",
            "enunciado",
            "tipo",
            "orden",
            "puntaje",
            "opciones",
            "respuesta_correcta",
            "canvas_config",
        )

    def validate_evaluacion(self, evaluacion):
        request = self.context.get("request")
        curso = evaluacion.leccion.modulo.curso
        if request and not es_dueno_curso(request.user, curso):
            raise serializers.ValidationError("No eres instructor de esta evaluación.")
        return evaluacion


class InstructorEvaluacionSerializer(serializers.ModelSerializer):
    preguntas = InstructorPreguntaNestedSerializer(many=True, required=False)

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

    def validate_leccion(self, leccion):
        request = self.context.get("request")
        if request and not es_dueno_curso(request.user, leccion.modulo.curso):
            raise serializers.ValidationError("No eres instructor de esta lección.")
        return leccion

    def create(self, validated_data):
        preguntas_data = validated_data.pop("preguntas", [])
        leccion = validated_data["leccion"]
        if leccion.tipo != Leccion.Tipo.QUIZ:
            leccion.tipo = Leccion.Tipo.QUIZ
            leccion.save(update_fields=["tipo"])
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


class CalificacionManualSerializer(serializers.Serializer):
    puntaje = serializers.DecimalField(max_digits=5, decimal_places=2)
    aprobado = serializers.BooleanField(required=False)
    feedback_instructor = serializers.CharField(required=False, allow_blank=True)
    detalle_calificacion = serializers.ListField(
        child=serializers.DictField(), required=False
    )

    def validate_puntaje(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("El puntaje debe estar entre 0 y 100.")
        return value


class InstructorIntentoSerializer(serializers.ModelSerializer):
    estudiante_username = serializers.CharField(
        source="estudiante.username", read_only=True
    )
    estudiante_nombre = serializers.SerializerMethodField()
    evaluacion_titulo = serializers.CharField(source="evaluacion.titulo", read_only=True)
    curso_slug = serializers.CharField(
        source="evaluacion.leccion.modulo.curso.slug", read_only=True
    )
    calificado_por_username = serializers.CharField(
        source="calificado_por.username", read_only=True, allow_null=True
    )

    class Meta:
        model = IntentoEvaluacion
        fields = (
            "id",
            "evaluacion",
            "evaluacion_titulo",
            "curso_slug",
            "estudiante",
            "estudiante_username",
            "estudiante_nombre",
            "respuestas",
            "canvas_payload",
            "detalle_calificacion",
            "puntaje",
            "puntaje_automatico",
            "aprobado",
            "estado",
            "feedback_instructor",
            "calificado_por",
            "calificado_por_username",
            "calificado_en",
            "iniciado_en",
            "finalizado_en",
        )
        read_only_fields = (
            "id",
            "evaluacion",
            "estudiante",
            "respuestas",
            "canvas_payload",
            "puntaje_automatico",
            "calificado_por",
            "calificado_en",
            "iniciado_en",
            "finalizado_en",
        )

    def get_estudiante_nombre(self, obj):
        return obj.estudiante.get_full_name() or obj.estudiante.username


class InstructorCursoResumenSerializer(serializers.ModelSerializer):
    inscritos = serializers.IntegerField(read_only=True)
    modulos_count = serializers.IntegerField(read_only=True)
    lecciones_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Curso
        fields = (
            "id",
            "titulo",
            "slug",
            "estado",
            "nivel",
            "inscritos",
            "modulos_count",
            "lecciones_count",
            "creado_en",
            "actualizado_en",
        )
