from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.cursos.models import Curso, Inscripcion, Leccion, Modulo
from apps.evaluaciones.models import Evaluacion, Pregunta

Usuario = get_user_model()


class Command(BaseCommand):
    help = "Carga datos demo: instructor, curso, módulos, lección quiz Canvas"

    def handle(self, *args, **options):
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

        admin_user, created = Usuario.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@edupath.local",
                "rol": Usuario.Rol.ADMIN,
                "first_name": "Ada",
                "last_name": "Admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin_user.set_password("admin123")
            admin_user.save()
        elif admin_user.rol != Usuario.Rol.ADMIN:
            admin_user.rol = Usuario.Rol.ADMIN
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.save(update_fields=["rol", "is_staff", "is_superuser"])

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

        eval_, created_eval = Evaluacion.objects.get_or_create(
            leccion=lec_quiz,
            defaults={
                "titulo": "Quiz interactivo Canvas",
                "puntaje_aprobacion": 70,
                "tiempo_limite_seg": 600,
                "canvas_schema": {
                    "width": 640,
                    "height": 360,
                    "background": "#0f172a",
                    "hotspots": [
                        {"id": "a", "x": 160, "y": 180, "r": 36, "label": "Zona A"},
                        {"id": "b", "x": 320, "y": 160, "r": 36, "label": "Zona B"},
                        {"id": "c", "x": 480, "y": 200, "r": 36, "label": "Zona C"},
                    ],
                    "items": [
                        {"id": "html", "label": "HTML", "x": 40, "y": 40},
                        {"id": "css", "label": "CSS", "x": 40, "y": 100},
                    ],
                    "targets": [
                        {"id": "markup", "label": "Marcato", "x": 400, "y": 40, "w": 160, "h": 48},
                        {"id": "estilo", "label": "Estilos", "x": 400, "y": 100, "w": 160, "h": 48},
                    ],
                },
            },
        )
        if not created_eval:
            eval_.titulo = "Quiz interactivo Canvas"
            eval_.canvas_schema = {
                "width": 640,
                "height": 360,
                "background": "#0f172a",
                "hotspots": [
                    {"id": "a", "x": 160, "y": 180, "r": 36, "label": "Zona A"},
                    {"id": "b", "x": 320, "y": 160, "r": 36, "label": "Zona B"},
                    {"id": "c", "x": 480, "y": 200, "r": 36, "label": "Zona C"},
                ],
                "items": [
                    {"id": "html", "label": "HTML", "x": 40, "y": 40},
                    {"id": "css", "label": "CSS", "x": 40, "y": 100},
                ],
                "targets": [
                    {"id": "markup", "label": "Marcato", "x": 400, "y": 40, "w": 160, "h": 48},
                    {"id": "estilo", "label": "Estilos", "x": 400, "y": 100, "w": 160, "h": 48},
                ],
            }
            eval_.save()

        Pregunta.objects.update_or_create(
            evaluacion=eval_,
            orden=1,
            defaults={
                "enunciado": "Selecciona la Zona B en el lienzo.",
                "tipo": Pregunta.Tipo.CANVAS_HOTSPOT,
                "puntaje": 40,
                "opciones": [],
                "respuesta_correcta": {"hotspot_id": "b"},
                "canvas_config": {
                    "hotspots": eval_.canvas_schema["hotspots"],
                    "feedback_ok": "Correcto: Zona B seleccionada.",
                    "feedback_fail": "Esa no es la Zona B. Prueba otra área.",
                },
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_,
            orden=2,
            defaults={
                "enunciado": "Arrastra cada tecnología a su categoría.",
                "tipo": Pregunta.Tipo.CANVAS_ARRASTRAR,
                "puntaje": 40,
                "opciones": [],
                "respuesta_correcta": {
                    "asignaciones": {"html": "markup", "css": "estilo"}
                },
                "canvas_config": {
                    "items": eval_.canvas_schema["items"],
                    "targets": eval_.canvas_schema["targets"],
                    "feedback_ok": "¡Todas las asignaciones son correctas!",
                    "feedback_fail": "Revisa el emparejamiento HTML/CSS.",
                },
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_,
            orden=3,
            defaults={
                "enunciado": "Canvas se usa en el frontend para gráficos interactivos.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 20,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
                "canvas_config": {
                    "feedback_ok": "Así es.",
                    "feedback_fail": "Canvas sí se usa para gráficos interactivos.",
                },
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
