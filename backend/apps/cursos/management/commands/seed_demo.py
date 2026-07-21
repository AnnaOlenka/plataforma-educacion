from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.cursos.models import Curso, Inscripcion, Leccion, Modulo
from apps.evaluaciones.models import Evaluacion, Pregunta

Usuario = get_user_model()


class Command(BaseCommand):
    help = "Carga datos demo: instructor, curso, módulos, lección quiz Canvas"

    def handle(self, *args, **options):
        admin, created = Usuario.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@edupath.local",
                "rol": Usuario.Rol.ADMIN,
                "first_name": "Admin",
                "last_name": "EduPath",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin.set_password("admin123")
            admin.save()

        instructor, created = Usuario.objects.get_or_create(
            username="instructor",
            defaults={
                "email": "instructor@edupath.local",
                "rol": Usuario.Rol.INSTRUCTOR,
                "first_name": "Inés",
                "last_name": "Torres",
                "is_staff": True,
            },
        )
        if created:
            instructor.set_password("instructor123")
            instructor.save()

        estudiante, created = Usuario.objects.get_or_create(
            username="estudiante",
            defaults={
                "email": "estudiante@edupath.local",
                "rol": Usuario.Rol.ESTUDIANTE,
                "first_name": "Esteban",
                "last_name": "Vega",
            },
        )
        if created:
            estudiante.set_password("estudiante123")
            estudiante.save()

        curso, _ = Curso.objects.get_or_create(
            slug="introduccion-web",
            defaults={
                "titulo": "Introducción al Desarrollo Web",
                "descripcion": "HTML, CSS, accesibilidad y primera evaluación Canvas.",
                "instructor": instructor,
                "estado": Curso.Estado.PUBLICADO,
                "nivel": "principiante",
            },
        )

        mod1, _ = Modulo.objects.get_or_create(
            curso=curso, orden=1, defaults={"titulo": "Fundamentos", "descripcion": "Base web"}
        )
        lec1, _ = Leccion.objects.get_or_create(
            modulo=mod1,
            orden=1,
            defaults={
                "titulo": "Qué es la web",
                "tipo": Leccion.Tipo.CONTENIDO,
                "contenido": "La web es un sistema de documentos hipertexto...",
                "duracion_minutos": 15,
            },
        )
        lec_quiz, _ = Leccion.objects.get_or_create(
            modulo=mod1,
            orden=2,
            defaults={
                "titulo": "Quiz interactivo Canvas",
                "tipo": Leccion.Tipo.QUIZ,
                "contenido": "",
                "duracion_minutos": 20,
            },
        )

        eval_, _ = Evaluacion.objects.get_or_create(
            leccion=lec_quiz,
            defaults={
                "titulo": "Identifica el hotspot correcto",
                "puntaje_aprobacion": 70,
                "canvas_schema": {
                    "hotspots": [
                        {"id": "a", "x": 160, "y": 180, "r": 36, "label": "Zona A"},
                        {"id": "b", "x": 320, "y": 160, "r": 36, "label": "Zona B"},
                        {"id": "c", "x": 480, "y": 200, "r": 36, "label": "Zona C"},
                    ]
                },
            },
        )
        Pregunta.objects.get_or_create(
            evaluacion=eval_,
            orden=1,
            defaults={
                "enunciado": "Selecciona la Zona B en el lienzo.",
                "tipo": Pregunta.Tipo.CANVAS_HOTSPOT,
                "puntaje": 10,
                "respuesta_correcta": {"hotspot_id": "b"},
                "canvas_config": eval_.canvas_schema,
            },
        )

        Inscripcion.objects.get_or_create(
            estudiante=estudiante, curso=curso, defaults={"origen": "web"}
        )

        self.stdout.write(self.style.SUCCESS("Demo lista."))
        self.stdout.write("  admin / admin123")
        self.stdout.write("  instructor / instructor123")
        self.stdout.write("  estudiante / estudiante123")
        self.stdout.write(f"  curso: {curso.slug} · lecciones: {lec1.id}, quiz: {lec_quiz.id}")
