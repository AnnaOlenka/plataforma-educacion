"""
Modelos Curso, Modulo, Leccion e Inscripcion — núcleo académico MTV.
"""
from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Curso(models.Model):
    class Estado(models.TextChoices):
        BORRADOR = "borrador", "Borrador"
        PUBLICADO = "publicado", "Publicado"
        ARCHIVADO = "archivado", "Archivado"

    titulo = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True)
    descripcion = models.TextField()
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="cursos_impartidos",
    )
    portada = models.ImageField(upload_to="cursos/", blank=True, null=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.BORRADOR)
    nivel = models.CharField(max_length=50, default="intermedio")
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Curso"
        verbose_name_plural = "Cursos"
        ordering = ["-creado_en"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.titulo)[:180]
            slug = base
            n = 1
            while Curso.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.titulo


class Modulo(models.Model):
    """Unidad pedagógica; la API pagina lecciones por módulo."""

    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name="modulos")
    titulo = models.CharField(max_length=200)
    orden = models.PositiveIntegerField(default=0)
    descripcion = models.TextField(blank=True)

    class Meta:
        ordering = ["orden", "id"]
        verbose_name = "Módulo"
        verbose_name_plural = "Módulos"
        unique_together = ("curso", "orden")

    def __str__(self):
        return f"{self.curso.titulo} · {self.titulo}"


class Leccion(models.Model):
    class Tipo(models.TextChoices):
        CONTENIDO = "contenido", "Contenido"
        VIDEO = "video", "Video"
        QUIZ = "quiz", "Evaluación"
        RECURSO = "recurso", "Recurso"

    modulo = models.ForeignKey(Modulo, on_delete=models.CASCADE, related_name="lecciones")
    titulo = models.CharField(max_length=200)
    orden = models.PositiveIntegerField(default=0)
    tipo = models.CharField(max_length=20, choices=Tipo.choices, default=Tipo.CONTENIDO)
    contenido = models.TextField(blank=True)
    duracion_minutos = models.PositiveIntegerField(default=10)
    es_obligatoria = models.BooleanField(default=True)

    class Meta:
        ordering = ["orden", "id"]
        verbose_name = "Lección"
        verbose_name_plural = "Lecciones"
        unique_together = ("modulo", "orden")

    def __str__(self):
        return self.titulo

    @property
    def curso(self):
        return self.modulo.curso


class Inscripcion(models.Model):
    class Estado(models.TextChoices):
        ACTIVA = "activa", "Activa"
        COMPLETADA = "completada", "Completada"
        CANCELADA = "cancelada", "Cancelada"

    estudiante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="inscripciones",
    )
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name="inscripciones")
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVA)
    inscrito_en = models.DateTimeField(auto_now_add=True)
    origen = models.CharField(
        max_length=20,
        default="web",
        help_text="web | legacy_csv | api",
    )
    progreso_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        verbose_name = "Inscripción"
        verbose_name_plural = "Inscripciones"
        unique_together = ("estudiante", "curso")
        ordering = ["-inscrito_en"]

    def __str__(self):
        return f"{self.estudiante} → {self.curso}"
