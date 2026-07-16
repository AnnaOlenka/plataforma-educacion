from django.contrib import admin

from .models import ProgresoLeccion


@admin.register(ProgresoLeccion)
class ProgresoLeccionAdmin(admin.ModelAdmin):
    list_display = ("estudiante", "leccion", "estado", "porcentaje", "tiempo_segundos", "actualizado_en")
    list_filter = ("estado",)
    search_fields = ("estudiante__username", "leccion__titulo")
