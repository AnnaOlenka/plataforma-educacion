"""Emisión de certificados digitales firmados."""
from __future__ import annotations

from django.db import transaction

from apps.cursos.models import Curso, Inscripcion
from apps.progreso.models import recalcular_progreso_curso

from .models import Certificado


class EmisionError(Exception):
    def __init__(self, detail: str, status: int = 400, extra: dict | None = None):
        self.detail = detail
        self.status = status
        self.extra = extra or {}
        super().__init__(detail)


def resolver_curso(curso_ref) -> Curso:
    if str(curso_ref).isdigit():
        return Curso.objects.get(pk=curso_ref)
    return Curso.objects.get(slug=curso_ref)


@transaction.atomic
def emitir_certificado(estudiante, curso_ref) -> tuple[Certificado, bool]:
    """
    Emite (o reutiliza) certificado si el progreso del curso es 100%.
    Retorna (certificado, creado).
    """
    try:
        curso = resolver_curso(curso_ref)
    except Curso.DoesNotExist as exc:
        raise EmisionError("Curso no encontrado", status=404) from exc

    try:
        insc = Inscripcion.objects.select_for_update().get(
            estudiante=estudiante,
            curso=curso,
        )
    except Inscripcion.DoesNotExist as exc:
        raise EmisionError("Sin inscripción en este curso") from exc

    if insc.estado == Inscripcion.Estado.CANCELADA:
        raise EmisionError("La inscripción está cancelada")

    # Recalcular por si el frontend no actualizó
    pct = recalcular_progreso_curso(estudiante.id, curso.id)
    insc.refresh_from_db()

    if pct < 100 and float(insc.progreso_pct) < 100:
        raise EmisionError(
            "Curso incompleto: se requiere 100% de progreso",
            extra={"progreso_pct": float(insc.progreso_pct)},
        )

    cert, created = Certificado.objects.get_or_create(
        estudiante=estudiante,
        curso=curso,
        defaults={
            "metadata": {
                "progreso": float(insc.progreso_pct),
                "algoritmo": "HMAC-SHA256",
            }
        },
    )
    # Asegurar firma (por si se creó sin save custom path)
    if not cert.firma_hmac:
        cert.firmar()
        cert.save(update_fields=["firma_hmac"])

    if insc.estado != Inscripcion.Estado.COMPLETADA:
        insc.estado = Inscripcion.Estado.COMPLETADA
        insc.progreso_pct = max(float(insc.progreso_pct), 100)
        insc.save(update_fields=["estado", "progreso_pct"])

    return cert, created
