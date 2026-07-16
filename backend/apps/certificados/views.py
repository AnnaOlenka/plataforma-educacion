from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cursos.models import Inscripcion

from .models import Certificado
from .serializers import CertificadoSerializer


class CertificadoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CertificadoSerializer
    lookup_field = "codigo"

    def get_queryset(self):
        return Certificado.objects.filter(estudiante=self.request.user).select_related(
            "curso", "estudiante"
        )

    @action(detail=False, methods=["post"], url_path="emitir/(?P<curso_id>[^/.]+)")
    def emitir(self, request, curso_id=None):
        """Emite certificado si el progreso del curso está completo."""
        try:
            insc = Inscripcion.objects.get(
                estudiante=request.user, curso_id=curso_id, estado=Inscripcion.Estado.ACTIVA
            )
        except Inscripcion.DoesNotExist:
            return Response({"detail": "Sin inscripción"}, status=status.HTTP_400_BAD_REQUEST)

        if insc.progreso_pct < 100:
            return Response(
                {"detail": "Curso incompleto", "progreso_pct": float(insc.progreso_pct)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cert, _ = Certificado.objects.get_or_create(
            estudiante=request.user,
            curso_id=curso_id,
            defaults={"metadata": {"progreso": float(insc.progreso_pct)}},
        )
        insc.estado = Inscripcion.Estado.COMPLETADA
        insc.save(update_fields=["estado"])
        return Response(CertificadoSerializer(cert).data, status=status.HTTP_201_CREATED)


class VerificarCertificadoView(APIView):
    """Verificación pública criptográfica sin autenticación."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, codigo):
        try:
            cert = Certificado.objects.select_related("curso", "estudiante").get(codigo=codigo)
        except Certificado.DoesNotExist:
            return Response({"valido": False, "detail": "No encontrado"}, status=404)
        return Response(
            {
                "valido": cert.verificar(),
                "codigo": str(cert.codigo),
                "estudiante": cert.estudiante.get_full_name() or cert.estudiante.username,
                "curso": cert.curso.titulo,
                "emitido_en": cert.emitido_en,
                "firma_hmac": cert.firma_hmac,
                "revocado": cert.revocado,
            }
        )
