"""
Certificados digitales con verificación criptográfica (HMAC-SHA256).
"""
import hashlib
import hmac
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.cursos.models import Curso


class Certificado(models.Model):
    codigo = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    estudiante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="certificados",
    )
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name="certificados")
    emitido_en = models.DateTimeField(default=timezone.now)
    firma_hmac = models.CharField(max_length=128, editable=False)
    metadata = models.JSONField(default=dict, blank=True)
    revocado = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Certificado"
        verbose_name_plural = "Certificados"
        unique_together = ("estudiante", "curso")
        ordering = ["-emitido_en"]

    def __str__(self):
        return f"{self.codigo} — {self.estudiante} / {self.curso}"

    def payload_canonico(self) -> str:
        return (
            f"{self.codigo}|{self.estudiante_id}|{self.curso_id}|"
            f"{self.emitido_en.isoformat()}"
        )

    def firmar(self):
        secret = settings.CERT_SIGNING_SECRET.encode()
        digest = hmac.new(secret, self.payload_canonico().encode(), hashlib.sha256)
        self.firma_hmac = digest.hexdigest()

    def verificar(self) -> bool:
        if self.revocado:
            return False
        secret = settings.CERT_SIGNING_SECRET.encode()
        esperado = hmac.new(
            secret, self.payload_canonico().encode(), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(esperado, self.firma_hmac)

    def save(self, *args, **kwargs):
        if not self.firma_hmac:
            # emitir_en debe existir antes de firmar
            if self.emitido_en is None:
                self.emitido_en = timezone.now()
            self.firmar()
        super().save(*args, **kwargs)
