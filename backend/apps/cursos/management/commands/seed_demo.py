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

        # Curso 2: Docker
        curso_docker, _ = Curso.objects.get_or_create(
            slug="introduccion-docker",
            defaults={
                "titulo": "Introducción a Docker",
                "descripcion": "Aprende los conceptos fundamentales de containerización y Docker.",
                "instructor": instructor,
                "estado": Curso.Estado.PUBLICADO,
                "nivel": "principiante",
            },
        )

        mod_docker_1, _ = Modulo.objects.get_or_create(
            curso=curso_docker, orden=1, defaults={"titulo": "Conceptos Básicos", "descripcion": "Qué es Docker y contenedores"}
        )
        Leccion.objects.get_or_create(
            modulo=mod_docker_1,
            orden=1,
            defaults={
                "titulo": "Introducción a Contenedores",
                "tipo": Leccion.Tipo.CONTENIDO,
                "contenido": "Un contenedor es una unidad de software ligera que empaqueta código y dependencias...",
                "duracion_minutos": 20,
            },
        )
        lec_docker_quiz, _ = Leccion.objects.get_or_create(
            modulo=mod_docker_1,
            orden=2,
            defaults={
                "titulo": "Quiz: Conceptos Docker",
                "tipo": Leccion.Tipo.QUIZ,
                "contenido": "",
                "duracion_minutos": 15,
            },
        )

        eval_docker, created_eval = Evaluacion.objects.get_or_create(
            leccion=lec_docker_quiz,
            defaults={
                "titulo": "Quiz: Conceptos Docker",
                "puntaje_aprobacion": 70,
                "tiempo_limite_seg": 600,
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_docker,
            orden=1,
            defaults={
                "enunciado": "Docker es un sistema de virtualización que proporciona máquinas virtuales completas.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": False},
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_docker,
            orden=2,
            defaults={
                "enunciado": "Un contenedor de Docker es más ligero que una máquina virtual.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_docker,
            orden=3,
            defaults={
                "enunciado": "Docker Compose se utiliza para orquestar múltiples contenedores.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_docker,
            orden=4,
            defaults={
                "enunciado": "La imagen de Docker es un archivo inmutable que define cómo construir un contenedor.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )

        Inscripcion.objects.get_or_create(
            estudiante=estudiante, curso=curso_docker, defaults={"origen": "web"}
        )

        # Curso 3: Kubernetes
        curso_k8s, _ = Curso.objects.get_or_create(
            slug="introduccion-kubernetes",
            defaults={
                "titulo": "Introducción a Kubernetes",
                "descripcion": "Orquestación de contenedores con Kubernetes. Pods, servicios y despliegues.",
                "instructor": instructor,
                "estado": Curso.Estado.PUBLICADO,
                "nivel": "intermedio",
            },
        )

        mod_k8s_1, _ = Modulo.objects.get_or_create(
            curso=curso_k8s, orden=1, defaults={"titulo": "Fundamentos K8s", "descripcion": "Arquitectura y componentes"}
        )
        Leccion.objects.get_or_create(
            modulo=mod_k8s_1,
            orden=1,
            defaults={
                "titulo": "Arquitectura de Kubernetes",
                "tipo": Leccion.Tipo.CONTENIDO,
                "contenido": "Kubernetes es una plataforma de orquestación de contenedores. Su arquitectura consta de...",
                "duracion_minutos": 25,
            },
        )
        lec_k8s_quiz, _ = Leccion.objects.get_or_create(
            modulo=mod_k8s_1,
            orden=2,
            defaults={
                "titulo": "Quiz: Conceptos K8s",
                "tipo": Leccion.Tipo.QUIZ,
                "contenido": "",
                "duracion_minutos": 15,
            },
        )

        eval_k8s, _ = Evaluacion.objects.get_or_create(
            leccion=lec_k8s_quiz,
            defaults={
                "titulo": "Quiz: Conceptos Kubernetes",
                "puntaje_aprobacion": 70,
                "tiempo_limite_seg": 600,
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_k8s,
            orden=1,
            defaults={
                "enunciado": "Un Pod es la unidad más pequeña que se puede desplegar en Kubernetes.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_k8s,
            orden=2,
            defaults={
                "enunciado": "Un nodo master ejecuta las aplicaciones de los usuarios.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": False},
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_k8s,
            orden=3,
            defaults={
                "enunciado": "Un Deployment en Kubernetes puede gestionar múltiples réplicas de Pods.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_k8s,
            orden=4,
            defaults={
                "enunciado": "Los Services en Kubernetes exponen los Pods a la red.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )

        Inscripcion.objects.get_or_create(
            estudiante=estudiante, curso=curso_k8s, defaults={"origen": "web"}
        )

        # Curso 4: PHP - Laravel
        curso_laravel, _ = Curso.objects.get_or_create(
            slug="introduccion-laravel",
            defaults={
                "titulo": "Introducción a PHP - Laravel",
                "descripcion": "Framework moderno de PHP para desarrollo web. Routing, modelos y migraciones.",
                "instructor": instructor,
                "estado": Curso.Estado.PUBLICADO,
                "nivel": "principiante",
            },
        )

        mod_laravel_1, _ = Modulo.objects.get_or_create(
            curso=curso_laravel, orden=1, defaults={"titulo": "Fundamentos Laravel", "descripcion": "Inicio rápido"}
        )
        Leccion.objects.get_or_create(
            modulo=mod_laravel_1,
            orden=1,
            defaults={
                "titulo": "Qué es Laravel",
                "tipo": Leccion.Tipo.CONTENIDO,
                "contenido": "Laravel es un framework PHP elegante que facilita el desarrollo de aplicaciones web...",
                "duracion_minutos": 20,
            },
        )
        lec_laravel_quiz, _ = Leccion.objects.get_or_create(
            modulo=mod_laravel_1,
            orden=2,
            defaults={
                "titulo": "Quiz: Laravel Basics",
                "tipo": Leccion.Tipo.QUIZ,
                "contenido": "",
                "duracion_minutos": 15,
            },
        )

        eval_laravel, _ = Evaluacion.objects.get_or_create(
            leccion=lec_laravel_quiz,
            defaults={
                "titulo": "Quiz: Conceptos Laravel",
                "puntaje_aprobacion": 70,
                "tiempo_limite_seg": 600,
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_laravel,
            orden=1,
            defaults={
                "enunciado": "Laravel implementa el patrón arquitectónico MVC.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_laravel,
            orden=2,
            defaults={
                "enunciado": "Las migraciones en Laravel se utilizan para versionar el esquema de la base de datos.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_laravel,
            orden=3,
            defaults={
                "enunciado": "Los Controladores en Laravel procesan las solicitudes HTTP.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_laravel,
            orden=4,
            defaults={
                "enunciado": "Eloquent es el ORM de Laravel para interactuar con bases de datos.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )

        Inscripcion.objects.get_or_create(
            estudiante=estudiante, curso=curso_laravel, defaults={"origen": "web"}
        )

        # Curso 5: Python - Django
        curso_django, _ = Curso.objects.get_or_create(
            slug="introduccion-django",
            defaults={
                "titulo": "Introducción a Python - Django",
                "descripcion": "Framework de Python de alto nivel para desarrollo web rápido y limpio.",
                "instructor": instructor,
                "estado": Curso.Estado.PUBLICADO,
                "nivel": "principiante",
            },
        )

        mod_django_1, _ = Modulo.objects.get_or_create(
            curso=curso_django, orden=1, defaults={"titulo": "Django Basics", "descripcion": "Estructura y configuración"}
        )
        Leccion.objects.get_or_create(
            modulo=mod_django_1,
            orden=1,
            defaults={
                "titulo": "Introducción a Django",
                "tipo": Leccion.Tipo.CONTENIDO,
                "contenido": "Django es un framework web de Python que sigue el patrón MVT (Modelo-Vista-Template)...",
                "duracion_minutos": 25,
            },
        )
        lec_django_quiz, _ = Leccion.objects.get_or_create(
            modulo=mod_django_1,
            orden=2,
            defaults={
                "titulo": "Quiz: Django Concepts",
                "tipo": Leccion.Tipo.QUIZ,
                "contenido": "",
                "duracion_minutos": 15,
            },
        )

        eval_django, _ = Evaluacion.objects.get_or_create(
            leccion=lec_django_quiz,
            defaults={
                "titulo": "Quiz: Conceptos Django",
                "puntaje_aprobacion": 70,
                "tiempo_limite_seg": 600,
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_django,
            orden=1,
            defaults={
                "enunciado": "Django sigue el patrón de diseño MVT (Modelo-Vista-Template).",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_django,
            orden=2,
            defaults={
                "enunciado": "Los modelos en Django representan la estructura de los datos.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_django,
            orden=3,
            defaults={
                "enunciado": "Django ORM permite interactuar con bases de datos sin escribir SQL.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_django,
            orden=4,
            defaults={
                "enunciado": "El admin de Django se genera automáticamente a partir de los modelos.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )

        Inscripcion.objects.get_or_create(
            estudiante=estudiante, curso=curso_django, defaults={"origen": "web"}
        )

        # Curso 6: Python - Django REST Framework
        curso_drf, _ = Curso.objects.get_or_create(
            slug="introduccion-django-rest-framework",
            defaults={
                "titulo": "Introducción a Python - Django REST Framework",
                "descripcion": "Construye APIs REST potentes y flexibles con Django REST Framework.",
                "instructor": instructor,
                "estado": Curso.Estado.PUBLICADO,
                "nivel": "intermedio",
            },
        )

        mod_drf_1, _ = Modulo.objects.get_or_create(
            curso=curso_drf, orden=1, defaults={"titulo": "REST API Basics", "descripcion": "Conceptos de API REST"}
        )
        Leccion.objects.get_or_create(
            modulo=mod_drf_1,
            orden=1,
            defaults={
                "titulo": "Introducción a REST",
                "tipo": Leccion.Tipo.CONTENIDO,
                "contenido": "REST (Representational State Transfer) es un estilo arquitectónico para diseñar redes...",
                "duracion_minutos": 25,
            },
        )
        lec_drf_quiz, _ = Leccion.objects.get_or_create(
            modulo=mod_drf_1,
            orden=2,
            defaults={
                "titulo": "Quiz: Django REST Framework",
                "tipo": Leccion.Tipo.QUIZ,
                "contenido": "",
                "duracion_minutos": 20,
            },
        )

        eval_drf, _ = Evaluacion.objects.get_or_create(
            leccion=lec_drf_quiz,
            defaults={
                "titulo": "Quiz: Django REST Framework",
                "puntaje_aprobacion": 70,
                "tiempo_limite_seg": 600,
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_drf,
            orden=1,
            defaults={
                "enunciado": "Un Serializer en DRF convierte objetos de modelo a JSON y viceversa.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_drf,
            orden=2,
            defaults={
                "enunciado": "Un ViewSet proporciona automáticamente acciones CRUD completas.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_drf,
            orden=3,
            defaults={
                "enunciado": "La autenticación en DRF se configura mediante classes de autenticación.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )
        Pregunta.objects.update_or_create(
            evaluacion=eval_drf,
            orden=4,
            defaults={
                "enunciado": "Los Permissions en DRF controlan el acceso a las API endpoints.",
                "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                "puntaje": 25,
                "opciones": [True, False],
                "respuesta_correcta": {"valor": True},
            },
        )

        Inscripcion.objects.get_or_create(
            estudiante=estudiante, curso=curso_drf, defaults={"origen": "web"}
        )

        self.stdout.write(self.style.SUCCESS("Demo lista."))
        self.stdout.write("  admin / admin123")
        self.stdout.write("  instructor / instructor123")
        self.stdout.write("  estudiante / estudiante123")
        self.stdout.write(f"  6 cursos creados: web, docker, k8s, laravel, django, drf")
