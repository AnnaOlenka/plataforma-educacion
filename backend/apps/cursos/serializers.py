from rest_framework import serializers

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
            "duracion_minutos",
            "es_obligatoria",
            "modulo",
        )


class ModuloSerializer(serializers.ModelSerializer):
    lecciones = LeccionSerializer(many=True, read_only=True)
    lecciones_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Modulo
        fields = ("id", "titulo", "orden", "descripcion", "curso", "lecciones", "lecciones_count")


class CursoListSerializer(serializers.ModelSerializer):
    instructor_nombre = serializers.CharField(source="instructor.get_full_name", read_only=True)
    inscritos_count = serializers.IntegerField(read_only=True)
    lecciones_count = serializers.IntegerField(read_only=True)
    modulos_count = serializers.IntegerField(read_only=True)

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
            "creado_en",
        )


class CursoDetailSerializer(CursoListSerializer):
    modulos = ModuloSerializer(many=True, read_only=True)

    class Meta(CursoListSerializer.Meta):
        fields = CursoListSerializer.Meta.fields + ("modulos", "actualizado_en")


class InscripcionSerializer(serializers.ModelSerializer):
    curso_titulo = serializers.CharField(source="curso.titulo", read_only=True)

    class Meta:
        model = Inscripcion
        fields = (
            "id",
            "estudiante",
            "curso",
            "curso_titulo",
            "estado",
            "progreso_pct",
            "origen",
            "inscrito_en",
        )
        read_only_fields = ("estudiante", "inscrito_en", "progreso_pct")
