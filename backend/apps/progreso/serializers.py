from rest_framework import serializers

from .models import ProgresoLeccion


class ProgresoLeccionSerializer(serializers.ModelSerializer):
    leccion_titulo = serializers.CharField(source="leccion.titulo", read_only=True)
    curso_id = serializers.IntegerField(
        source="leccion.modulo.curso_id", read_only=True
    )

    class Meta:
        model = ProgresoLeccion
        fields = (
            "id",
            "leccion",
            "leccion_titulo",
            "curso_id",
            "estado",
            "porcentaje",
            "tiempo_segundos",
            "actualizado_en",
        )
        read_only_fields = ("id", "actualizado_en", "leccion_titulo", "curso_id")


class MarcadorSerializer(serializers.Serializer):
    leccion_id = serializers.IntegerField()
    titulo = serializers.CharField()
    tipo = serializers.CharField()
    modulo_id = serializers.IntegerField()
    modulo_titulo = serializers.CharField()
    orden_global = serializers.IntegerField()
    es_obligatoria = serializers.BooleanField()
    estado = serializers.CharField()
    porcentaje = serializers.IntegerField()
    tiempo_segundos = serializers.IntegerField()


class ResumenProgresoCursoSerializer(serializers.Serializer):
    curso_id = serializers.IntegerField()
    curso_slug = serializers.CharField()
    curso_titulo = serializers.CharField()
    progreso_pct = serializers.FloatField()
    completadas_obligatorias = serializers.IntegerField()
    total_obligatorias = serializers.IntegerField()
    marcadores = MarcadorSerializer(many=True)
