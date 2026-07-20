from django.contrib import admin

from .models import AuditLogCalificacion


@admin.register(AuditLogCalificacion)
class AuditLogCalificacionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "intento",
        "actor",
        "accion",
        "puntaje_anterior",
        "puntaje_nuevo",
        "creado_en",
    )
    list_filter = ("accion", "creado_en")
    search_fields = ("actor__username", "intento__id", "motivo")
    readonly_fields = (
        "intento",
        "actor",
        "accion",
        "puntaje_anterior",
        "puntaje_nuevo",
        "aprobado_anterior",
        "aprobado_nuevo",
        "feedback_anterior",
        "feedback_nuevo",
        "detalle_anterior",
        "detalle_nuevo",
        "motivo",
        "creado_en",
    )
