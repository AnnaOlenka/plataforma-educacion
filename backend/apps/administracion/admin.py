from django.contrib import admin

from .models import AuditLogCalificacion, RegistroAuditoria


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


@admin.register(RegistroAuditoria)
class RegistroAuditoriaAdmin(admin.ModelAdmin):
    list_display = ("id", "accion", "usuario", "objeto_tipo", "objeto_id", "ip", "creado_en")
    list_filter = ("accion", "objeto_tipo", "creado_en")
    search_fields = ("usuario__username", "objeto_tipo", "objeto_id", "ruta")
    readonly_fields = (
        "usuario",
        "accion",
        "objeto_tipo",
        "objeto_id",
        "ruta",
        "metodo",
        "ip",
        "detalle",
        "creado_en",
    )
