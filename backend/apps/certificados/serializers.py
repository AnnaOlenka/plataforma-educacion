from rest_framework import serializers

from .models import Certificado
from .qr import hash_corto, url_verificacion_api, url_verificacion_frontend


class CertificadoSerializer(serializers.ModelSerializer):
    curso_titulo = serializers.CharField(source="curso.titulo", read_only=True)
    curso_slug = serializers.CharField(source="curso.slug", read_only=True)
    estudiante_nombre = serializers.SerializerMethodField()
    valido = serializers.SerializerMethodField()
    hash_hmac = serializers.CharField(source="firma_hmac", read_only=True)
    hash_corto = serializers.SerializerMethodField()
    url_verificacion = serializers.SerializerMethodField()
    url_verificacion_api = serializers.SerializerMethodField()
    url_qr = serializers.SerializerMethodField()
    url_pdf = serializers.SerializerMethodField()

    class Meta:
        model = Certificado
        fields = (
            "codigo",
            "estudiante",
            "estudiante_nombre",
            "curso",
            "curso_slug",
            "curso_titulo",
            "emitido_en",
            "firma_hmac",
            "hash_hmac",
            "hash_corto",
            "revocado",
            "valido",
            "metadata",
            "url_verificacion",
            "url_verificacion_api",
            "url_qr",
            "url_pdf",
        )
        read_only_fields = fields

    def get_estudiante_nombre(self, obj):
        return obj.estudiante.get_full_name() or obj.estudiante.username

    def get_valido(self, obj):
        return obj.verificar()

    def get_hash_corto(self, obj):
        return hash_corto(obj.firma_hmac)

    def get_url_verificacion(self, obj):
        return url_verificacion_frontend(obj.codigo)

    def get_url_verificacion_api(self, obj):
        return url_verificacion_api(obj.codigo)

    def get_url_qr(self, obj):
        request = self.context.get("request")
        path = f"/api/certificados/verificar/{obj.codigo}/qr.png"
        if request:
            return request.build_absolute_uri(path)
        return path

    def get_url_pdf(self, obj):
        request = self.context.get("request")
        path = f"/api/certificados/{obj.codigo}/pdf/"
        if request:
            return request.build_absolute_uri(path)
        return path


class VerificacionPublicaSerializer(serializers.Serializer):
    valido = serializers.BooleanField()
    codigo = serializers.UUIDField()
    estudiante = serializers.CharField()
    curso = serializers.CharField()
    curso_slug = serializers.CharField()
    emitido_en = serializers.DateTimeField()
    hash_hmac = serializers.CharField()
    hash_corto = serializers.CharField()
    firma_integra = serializers.BooleanField()
    revocado = serializers.BooleanField()
    url_verificacion = serializers.CharField()
    url_qr = serializers.CharField(required=False)
    mensaje = serializers.CharField()
