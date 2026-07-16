from rest_framework import serializers

from .models import Certificado


class CertificadoSerializer(serializers.ModelSerializer):
    curso_titulo = serializers.CharField(source="curso.titulo", read_only=True)
    estudiante_nombre = serializers.SerializerMethodField()
    valido = serializers.SerializerMethodField()

    class Meta:
        model = Certificado
        fields = (
            "codigo",
            "estudiante",
            "estudiante_nombre",
            "curso",
            "curso_titulo",
            "emitido_en",
            "firma_hmac",
            "revocado",
            "valido",
            "metadata",
        )
        read_only_fields = fields

    def get_estudiante_nombre(self, obj):
        return obj.estudiante.get_full_name() or obj.estudiante.username

    def get_valido(self, obj):
        return obj.verificar()
