from rest_framework import serializers

from .models import ProgresoLeccion


class ProgresoLeccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgresoLeccion
        fields = (
            "id",
            "leccion",
            "estado",
            "porcentaje",
            "tiempo_segundos",
            "actualizado_en",
        )
        read_only_fields = ("id", "actualizado_en")
