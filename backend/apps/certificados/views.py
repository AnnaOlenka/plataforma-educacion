from django.http import HttpResponse
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Certificado
from .pdf import build_certificado_pdf
from .qr import (
    hash_corto,
    qr_verificacion_png,
    url_verificacion_api,
    url_verificacion_frontend,
)
from .serializers import CertificadoSerializer
from .services import EmisionError, emitir_certificado


class CertificadoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Certificados del estudiante autenticado.
    Emisión con hash HMAC-SHA256; QR y PDF incluidos en la respuesta.
    """

    serializer_class = CertificadoSerializer
    lookup_field = "codigo"
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Certificado.objects.select_related("curso", "estudiante")
        if getattr(user, "es_admin", False):
            return qs
        return qs.filter(estudiante=user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=False, methods=["post"], url_path="emitir/(?P<curso_ref>[^/.]+)")
    def emitir(self, request, curso_ref=None):
        """
        Emite certificado digital si el curso está al 100%.
        curso_ref: id numérico o slug.
        """
        try:
            cert, created = emitir_certificado(request.user, curso_ref)
        except EmisionError as exc:
            payload = {"detail": exc.detail, **exc.extra}
            return Response(payload, status=exc.status)

        data = CertificadoSerializer(cert, context={"request": request}).data
        return Response(
            data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, codigo=None):
        """PDF del certificado con hash y QR (dueño o admin)."""
        cert = self.get_object()
        pdf_bytes = build_certificado_pdf(cert)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="certificado-{cert.codigo}.pdf"'
        )
        return response

    @action(detail=True, methods=["get"], url_path="qr")
    def qr(self, request, codigo=None):
        """PNG del QR de verificación (dueño o admin)."""
        cert = self.get_object()
        png = qr_verificacion_png(cert.codigo)
        return HttpResponse(png, content_type="image/png")


class VerificarCertificadoView(APIView):
    """
    Verificación pública criptográfica — sin login.
    GET /api/certificados/verificar/<uuid>/
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, codigo):
        try:
            cert = Certificado.objects.select_related("curso", "estudiante").get(
                codigo=codigo
            )
        except Certificado.DoesNotExist:
            return Response(
                {
                    "valido": False,
                    "mensaje": "Certificado no encontrado",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        firma_ok = cert.verificar()
        valido = firma_ok and not cert.revocado
        if cert.revocado:
            mensaje = "Certificado revocado"
        elif not firma_ok:
            mensaje = "Firma HMAC inválida — posible adulteración"
        else:
            mensaje = "Certificado válido"

        qr_path = request.build_absolute_uri(
            f"/api/certificados/verificar/{cert.codigo}/qr.png"
        )
        return Response(
            {
                "valido": valido,
                "codigo": str(cert.codigo),
                "estudiante": cert.estudiante.get_full_name()
                or cert.estudiante.username,
                "curso": cert.curso.titulo,
                "curso_slug": cert.curso.slug,
                "emitido_en": cert.emitido_en,
                "hash_hmac": cert.firma_hmac,
                "hash_corto": hash_corto(cert.firma_hmac),
                "firma_integra": firma_ok,
                "revocado": cert.revocado,
                "algoritmo": "HMAC-SHA256",
                "url_verificacion": url_verificacion_frontend(cert.codigo),
                "url_verificacion_api": url_verificacion_api(cert.codigo),
                "url_qr": qr_path,
                "mensaje": mensaje,
            }
        )


class VerificarCertificadoQRView(APIView):
    """PNG del QR público — sin login."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, codigo):
        if not Certificado.objects.filter(codigo=codigo).exists():
            return Response({"detail": "No encontrado"}, status=404)
        png = qr_verificacion_png(codigo)
        response = HttpResponse(png, content_type="image/png")
        response["Cache-Control"] = "public, max-age=86400"
        return response


class VerificarPorHashView(APIView):
    """
    POST público: verificar por codigo y/o hash_hmac.
    Útil si el frontend escanea QR o pega el hash.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        codigo = request.data.get("codigo")
        hash_hmac = (request.data.get("hash_hmac") or request.data.get("firma_hmac") or "").strip().lower()
        hash_short = (request.data.get("hash_corto") or "").strip().upper()

        cert = None
        if codigo:
            cert = (
                Certificado.objects.select_related("curso", "estudiante")
                .filter(codigo=codigo)
                .first()
            )
        elif hash_hmac:
            cert = (
                Certificado.objects.select_related("curso", "estudiante")
                .filter(firma_hmac__iexact=hash_hmac)
                .first()
            )
        elif hash_short and len(hash_short) >= 8:
            cert = (
                Certificado.objects.select_related("curso", "estudiante")
                .filter(firma_hmac__istartswith=hash_short.lower())
                .first()
            )

        if cert is None:
            return Response(
                {"valido": False, "mensaje": "No se encontró certificado con esos datos"},
                status=404,
            )

        # Si enviaron hash, debe coincidir
        if hash_hmac and cert.firma_hmac.lower() != hash_hmac:
            return Response(
                {
                    "valido": False,
                    "mensaje": "El hash no coincide con el certificado",
                    "codigo": str(cert.codigo),
                }
            )

        firma_ok = cert.verificar()
        valido = firma_ok and not cert.revocado
        return Response(
            {
                "valido": valido,
                "codigo": str(cert.codigo),
                "estudiante": cert.estudiante.get_full_name()
                or cert.estudiante.username,
                "curso": cert.curso.titulo,
                "hash_hmac": cert.firma_hmac,
                "hash_corto": hash_corto(cert.firma_hmac),
                "firma_integra": firma_ok,
                "revocado": cert.revocado,
                "mensaje": "Certificado válido" if valido else "Certificado no válido",
                "url_verificacion": url_verificacion_frontend(cert.codigo),
            }
        )
