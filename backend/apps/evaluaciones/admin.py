from django.contrib import admin

from .models import Evaluacion, IntentoEvaluacion, Pregunta


class PreguntaInline(admin.TabularInline):
    model = Pregunta
    extra = 1
    ordering = ("orden",)


@admin.register(Evaluacion)
class EvaluacionAdmin(admin.ModelAdmin):
    list_display = ("titulo", "leccion", "puntaje_aprobacion", "tiempo_limite_seg", "activo")
    list_filter = ("activo",)
    search_fields = ("titulo", "leccion__titulo")
    inlines = [PreguntaInline]


@admin.register(IntentoEvaluacion)
class IntentoAdmin(admin.ModelAdmin):
    list_display = ("evaluacion", "estudiante", "puntaje", "aprobado", "iniciado_en")
    list_filter = ("aprobado", "evaluacion")
    search_fields = ("estudiante__username",)
    readonly_fields = ("iniciado_en", "finalizado_en")
