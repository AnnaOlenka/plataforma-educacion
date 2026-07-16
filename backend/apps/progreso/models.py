"""
Seguimiento de progreso por lección (alimenta useProgressTracker).
"""
from django.conf import settings
from django.db import models

from apps.cursos.models import Inscripcion, Leccion


class ProgresoLeccion(models.Model):
    class Estado(models.TextChoices):
        NO_INICIADA = "no_iniciada", "No iniciada"
        EN_PROGRESO = "en_progreso", "En progreso"
        COMPLETADA = "completada", "Completada"

    estudiante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="progresos",
    )
    leccion = models.ForeignKey(Leccion, on_delete=models.CASCADE, related_name="progresos")
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.NO_INICIADA)
    porcentaje = models.PositiveIntegerField(default=0)
    tiempo_segundos = models.PositiveIntegerField(default=0)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("estudiante", "leccion")
        verbose_name = "Progreso de lección"
        verbose_name_plural = "Progresos de lección"

    def __str__(self):
        return f"{self.estudiante} · {self.leccion} ({self.porcentaje}%)"


def recalcular_progreso_curso(estudiante_id: int, curso_id: int) -> float:
    """Agrega progreso de lecciones obligatorias y actualiza Inscripcion."""
    total = Leccion.objects.filter(modulo__curso_id=curso_id, es_obligatoria=True).count()
    if total == 0:
        pct = 100.0
    else:
        done = ProgresoLeccion.objects.filter(
            estudiante_id=estudiante_id,
            leccion__modulo__curso_id=curso_id,
            leccion__es_obligatoria=True,
            estado=ProgresoLeccion.Estado.COMPLETADA,
        ).count()
        pct = round(done / total * 100, 2)

    Inscripcion.objects.filter(estudiante_id=estudiante_id, curso_id=curso_id).update(
        progreso_pct=pct
    )
    return pct
