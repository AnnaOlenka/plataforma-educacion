"""
Auditoría de cambios de calificaciones (panel admin).
"""
from django.conf import settings
from django.db import models

from apps.evaluaciones.models import IntentoEvaluacion


class AuditLogCalificacion(models.Model):
    class Accion(models.TextChoices):
        CALIFICACION_MANUAL = "calificacion_manual", "Calificación manual"
        AJUSTE = "ajuste", "Ajuste de puntaje"
        REVOCACION = "revocacion", "Revocación / anulación"

    intento = models.ForeignKey(
        IntentoEvaluacion,
        on_delete=models.CASCADE,
        related_name="auditorias",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="auditorias_calificacion",
    )
    accion = models.CharField(
        max_length=40, choices=Accion.choices, default=Accion.CALIFICACION_MANUAL
    )
    puntaje_anterior = models.DecimalField(max_digits=5, decimal_places=2)
    puntaje_nuevo = models.DecimalField(max_digits=5, decimal_places=2)
    aprobado_anterior = models.BooleanField()
    aprobado_nuevo = models.BooleanField()
    feedback_anterior = models.TextField(blank=True)
    feedback_nuevo = models.TextField(blank=True)
    detalle_anterior = models.JSONField(default=list, blank=True)
    detalle_nuevo = models.JSONField(default=list, blank=True)
    motivo = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado_en"]
        verbose_name = "Auditoría de calificación"
        verbose_name_plural = "Auditorías de calificación"

    def __str__(self):
        return f"{self.accion} intento={self.intento_id} by={self.actor_id}"


class RegistroAuditoria(models.Model):
    """Trazabilidad general: accesos a contenido y emisión de certificados (RNF05)."""

    class Accion(models.TextChoices):
        ACCESO_CONTENIDO = "acceso_contenido", "Acceso a contenido"
        EMISION_CERTIFICADO = "emision_certificado", "Emisión de certificado"

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registros_auditoria",
    )
    accion = models.CharField(max_length=40, choices=Accion.choices)
    objeto_tipo = models.CharField(max_length=100, blank=True)
    objeto_id = models.CharField(max_length=50, blank=True)
    ruta = models.CharField(max_length=255, blank=True)
    metodo = models.CharField(max_length=10, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    detalle = models.JSONField(default=dict, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado_en"]
        verbose_name = "Registro de auditoría"
        verbose_name_plural = "Registros de auditoría"
        indexes = [
            models.Index(fields=["accion", "-creado_en"]),
            models.Index(fields=["usuario", "-creado_en"]),
        ]

    def __str__(self):
        return f"{self.accion} · {self.objeto_tipo}#{self.objeto_id} by={self.usuario_id}"
