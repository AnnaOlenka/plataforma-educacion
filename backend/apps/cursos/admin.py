from django.contrib import admin
from django.db.models import Count

from .models import Curso, Inscripcion, Leccion, Modulo


class LeccionInline(admin.TabularInline):
    model = Leccion
    extra = 1
    ordering = ("orden",)


@admin.register(Modulo)
class ModuloAdmin(admin.ModelAdmin):
    list_display = ("titulo", "curso", "orden", "num_lecciones")
    list_filter = ("curso",)
    search_fields = ("titulo", "curso__titulo")
    inlines = [LeccionInline]
    ordering = ("curso", "orden")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(_num_lecciones=Count("lecciones"))

    @admin.display(description="Lecciones", ordering="_num_lecciones")
    def num_lecciones(self, obj):
        return obj._num_lecciones


class ModuloInline(admin.StackedInline):
    model = Modulo
    extra = 0
    show_change_link = True
    ordering = ("orden",)


@admin.register(Curso)
class CursoAdmin(admin.ModelAdmin):
    list_display = (
        "titulo",
        "instructor",
        "estado",
        "nivel",
        "num_inscritos",
        "num_modulos",
        "creado_en",
    )
    list_filter = ("estado", "nivel", "creado_en")
    search_fields = ("titulo", "slug", "instructor__username")
    prepopulated_fields = {"slug": ("titulo",)}
    inlines = [ModuloInline]
    date_hierarchy = "creado_en"
    actions = ["publicar_cursos", "archivar_cursos"]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("instructor").annotate(
            _num_inscritos=Count("inscripciones", distinct=True),
            _num_modulos=Count("modulos", distinct=True),
        )

    @admin.display(description="Inscritos", ordering="_num_inscritos")
    def num_inscritos(self, obj):
        return obj._num_inscritos

    @admin.display(description="Módulos", ordering="_num_modulos")
    def num_modulos(self, obj):
        return obj._num_modulos

    @admin.action(description="Publicar cursos seleccionados")
    def publicar_cursos(self, request, queryset):
        updated = queryset.update(estado=Curso.Estado.PUBLICADO)
        self.message_user(request, f"{updated} curso(s) publicado(s).")

    @admin.action(description="Archivar cursos seleccionados")
    def archivar_cursos(self, request, queryset):
        updated = queryset.update(estado=Curso.Estado.ARCHIVADO)
        self.message_user(request, f"{updated} curso(s) archivado(s).")


@admin.register(Leccion)
class LeccionAdmin(admin.ModelAdmin):
    list_display = ("titulo", "modulo", "tipo", "orden", "duracion_minutos", "es_obligatoria")
    list_filter = ("tipo", "es_obligatoria", "modulo__curso")
    search_fields = ("titulo",)
    ordering = ("modulo", "orden")


@admin.register(Inscripcion)
class InscripcionAdmin(admin.ModelAdmin):
    list_display = ("estudiante", "curso", "estado", "progreso_pct", "origen", "inscrito_en")
    list_filter = ("estado", "origen", "inscrito_en")
    search_fields = ("estudiante__username", "estudiante__email", "curso__titulo")
    autocomplete_fields = ("estudiante", "curso")
    date_hierarchy = "inscrito_en"
