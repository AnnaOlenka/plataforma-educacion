"""
Evaluaciones interactivas (datos para Canvas en el frontend).
"""
from django.conf import settings
from django.db import models

from apps.cursos.models import Leccion


class Evaluacion(models.Model):
    leccion = models.OneToOneField(Leccion, on_delete=models.CASCADE, related_name="evaluacion")
    titulo = models.CharField(max_length=200)
    tiempo_limite_seg = models.PositiveIntegerField(default=600)
    puntaje_aprobacion = models.PositiveIntegerField(default=70)
    # Payload Canvas: shapes, hotspots, opciones — consumido por el SPA
    canvas_schema = models.JSONField(default=dict, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Evaluación"
        verbose_name_plural = "Evaluaciones"

    def __str__(self):
        return self.titulo


class Pregunta(models.Model):
    class Tipo(models.TextChoices):
        OPCION_MULTIPLE = "opcion_multiple", "Opción múltiple"
        VERDADERO_FALSO = "verdadero_falso", "Verdadero/Falso"
        CANVAS_HOTSPOT = "canvas_hotspot", "Hotspot Canvas"
        CANVAS_DIBUJO = "canvas_dibujo", "Dibujo Canvas"

    evaluacion = models.ForeignKey(Evaluacion, on_delete=models.CASCADE, related_name="preguntas")
    enunciado = models.TextField()
    tipo = models.CharField(max_length=30, choices=Tipo.choices)
    orden = models.PositiveIntegerField(default=0)
    puntaje = models.PositiveIntegerField(default=1)
    opciones = models.JSONField(default=list, blank=True)
    respuesta_correcta = models.JSONField(default=dict)
    canvas_config = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["orden"]
        verbose_name = "Pregunta"
        verbose_name_plural = "Preguntas"

    def __str__(self):
        return f"{self.evaluacion.titulo} · Q{self.orden}"


class IntentoEvaluacion(models.Model):
    evaluacion = models.ForeignKey(Evaluacion, on_delete=models.CASCADE, related_name="intentos")
    estudiante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="intentos_evaluacion",
    )
    respuestas = models.JSONField(default=dict)
    canvas_payload = models.JSONField(default=dict, blank=True)
    puntaje = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    aprobado = models.BooleanField(default=False)
    iniciado_en = models.DateTimeField(auto_now_add=True)
    finalizado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-iniciado_en"]
        verbose_name = "Intento"
        verbose_name_plural = "Intentos"
