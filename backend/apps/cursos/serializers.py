from rest_framework import serializers

from apps.progreso.models import ProgresoLeccion

from .models import Curso, Inscripcion, Leccion, Modulo


class LeccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Leccion
        fields = (
            "id",
            "titulo",
            "orden",
            "tipo",
            "contenido",
            "recurso_url",
            "archivo",
            "duracion_minutos",
            "es_obligatoria",
            "modulo",
        )


class LeccionNavegacionSerializer(serializers.ModelSerializer):
    """Lección en listados de navegación (sin contenido pesado)."""

    progreso_estado = serializers.CharField(read_only=True, required=False)
    progreso_porcentaje = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Leccion
        fields = (
            "id",
            "titulo",
            "orden",
            "tipo",
            "duracion_minutos",
            "es_obligatoria",
            "modulo",
            "progreso_estado",
            "progreso_porcentaje",
        )


class ModuloSerializer(serializers.ModelSerializer):
    lecciones = LeccionSerializer(many=True, read_only=True)
    lecciones_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Modulo
        fields = (
            "id",
            "titulo",
            "orden",
            "descripcion",
            "curso",
            "lecciones",
            "lecciones_count",
        )


class ModuloNavegacionSerializer(serializers.ModelSerializer):
    lecciones = LeccionNavegacionSerializer(many=True, read_only=True)
    lecciones_count = serializers.IntegerField(read_only=True, required=False)
    lecciones_completadas = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Modulo
        fields = (
            "id",
            "titulo",
            "orden",
            "descripcion",
            "curso",
            "lecciones",
            "lecciones_count",
            "lecciones_completadas",
        )


class CursoListSerializer(serializers.ModelSerializer):
    instructor_nombre = serializers.CharField(
        source="instructor.get_full_name", read_only=True
    )
    inscritos_count = serializers.IntegerField(read_only=True)
    lecciones_count = serializers.IntegerField(read_only=True)
    modulos_count = serializers.IntegerField(read_only=True)
    inscrito = serializers.SerializerMethodField()

    class Meta:
        model = Curso
        fields = (
            "id",
            "titulo",
            "slug",
            "descripcion",
            "instructor",
            "instructor_nombre",
            "portada",
            "estado",
            "nivel",
            "inscritos_count",
            "lecciones_count",
            "modulos_count",
            "inscrito",
            "creado_en",
        )

    def get_inscrito(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        ids = self.context.get("inscrito_curso_ids")
        if ids is not None:
            return obj.id in ids
        return Inscripcion.objects.filter(
            estudiante=request.user,
            curso=obj,
            estado=Inscripcion.Estado.ACTIVA,
        ).exists()


class CursoDetailSerializer(CursoListSerializer):
    modulos = ModuloSerializer(many=True, read_only=True)

    class Meta(CursoListSerializer.Meta):
        fields = CursoListSerializer.Meta.fields + ("modulos", "actualizado_en")


class InscripcionSerializer(serializers.ModelSerializer):
    curso_titulo = serializers.CharField(source="curso.titulo", read_only=True)
    curso_slug = serializers.CharField(source="curso.slug", read_only=True)
    curso_nivel = serializers.CharField(source="curso.nivel", read_only=True)

    class Meta:
        model = Inscripcion
        fields = (
            "id",
            "estudiante",
            "curso",
            "curso_titulo",
            "curso_slug",
            "curso_nivel",
            "estado",
            "progreso_pct",
            "origen",
            "inscrito_en",
        )
        read_only_fields = ("estudiante", "inscrito_en", "progreso_pct")


class MarcadorProgresoSerializer(serializers.Serializer):
    """Marcador de progreso por lección dentro de la ruta del curso."""

    leccion_id = serializers.IntegerField()
    titulo = serializers.CharField()
    tipo = serializers.CharField()
    modulo_id = serializers.IntegerField()
    modulo_titulo = serializers.CharField()
    orden_global = serializers.IntegerField()
    es_obligatoria = serializers.BooleanField()
    estado = serializers.ChoiceField(choices=ProgresoLeccion.Estado.choices)
    porcentaje = serializers.IntegerField()
    tiempo_segundos = serializers.IntegerField()
