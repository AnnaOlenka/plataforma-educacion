"""
Seeder completo para probar RF-03 (evaluaciones Canvas: opción múltiple,
V/F, hotspot, arrastrar, dibujo) y RF-07 (aprobación de cursos, gestión de
usuarios, auditoría de calificaciones).

No reemplaza seed_demo.py — se puede correr después, es idempotente
(get_or_create en todo), y agrega usuarios/cursos/evaluaciones/intentos
adicionales sobre lo que ya exista.

Uso:
    python manage.py seed_full
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.administracion.models import AuditLogCalificacion
from apps.cursos.models import Curso, Inscripcion, Leccion, Modulo
from apps.evaluaciones.models import Evaluacion, IntentoEvaluacion, Pregunta
from apps.evaluaciones.services import calificar_intento
from apps.progreso.models import ProgresoLeccion, recalcular_progreso_curso

Usuario = get_user_model()

CANVAS_SCHEMA = {"width": 600, "height": 280, "background": "#0f172a"}


class Command(BaseCommand):
    help = "Seeder completo: cursos en todos los estados + evaluaciones con los 5 tipos de pregunta Canvas + intentos/auditoría, para probar RF-03 y RF-07."

    def handle(self, *args, **options):
        usuarios = self._crear_usuarios()
        self._crear_cursos_variados(usuarios)
        curso = self._crear_curso_laboratorio(usuarios)
        self._sembrar_intentos_y_auditoria(curso, usuarios)

        self.stdout.write(self.style.SUCCESS("\nSeed completo listo.\n"))
        self.stdout.write("Instructores: instructor / instructor2 / instructor3  (pass: instructor123)")
        self.stdout.write("Estudiantes:  estudiante / estudiante2 / estudiante3  (pass: estudiante123)")
        self.stdout.write("Curso de pruebas Canvas: /cursos/laboratorio-evaluaciones-canvas")
        self.stdout.write("Cursos en distintos estados listos para /admin/cursos")
        self.stdout.write("Intentos pendientes/revisados listos para /instructor/calificaciones")
        self.stdout.write("Auditoría con calificacion_manual / ajuste / revocacion en /admin/auditoria")

    # ── Usuarios ──────────────────────────────────────────────────────
    def _crear_usuarios(self):
        def usuario(username, email, rol, nombre, apellido, password, **extra):
            u, created = Usuario.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "rol": rol,
                    "first_name": nombre,
                    "last_name": apellido,
                    **extra,
                },
            )
            if created:
                u.set_password(password)
                u.save()
            return u

        admin = usuario("admin", "admin@edupath.local", Usuario.Rol.ADMIN, "Admin", "EduPath",
                         "admin123", is_staff=True, is_superuser=True)
        instructor1 = usuario("instructor", "instructor@edupath.local", Usuario.Rol.INSTRUCTOR,
                               "Inés", "Torres", "instructor123", is_staff=True)
        instructor2 = usuario("instructor2", "instructor2@edupath.local", Usuario.Rol.INSTRUCTOR,
                               "Carlos", "Ramírez", "instructor123", is_staff=True)
        instructor3 = usuario("instructor3", "instructor3@edupath.local", Usuario.Rol.INSTRUCTOR,
                               "Lucía", "Fernández", "instructor123", is_staff=True)
        estudiante1 = usuario("estudiante", "estudiante@edupath.local", Usuario.Rol.ESTUDIANTE,
                               "Esteban", "Vega", "estudiante123")
        estudiante2 = usuario("estudiante2", "estudiante2@edupath.local", Usuario.Rol.ESTUDIANTE,
                               "Marta", "Quispe", "estudiante123")
        estudiante3 = usuario("estudiante3", "estudiante3@edupath.local", Usuario.Rol.ESTUDIANTE,
                               "Jorge", "Salazar", "estudiante123")

        return {
            "admin": admin,
            "instructor1": instructor1, "instructor2": instructor2, "instructor3": instructor3,
            "estudiante1": estudiante1, "estudiante2": estudiante2, "estudiante3": estudiante3,
        }

    # ── Cursos en todos los estados de aprobación (RF-07) ───────────────
    def _crear_cursos_variados(self, u):
        ahora = timezone.now()

        Curso.objects.get_or_create(
            slug="fundamentos-bases-de-datos",
            defaults={
                "titulo": "Fundamentos de Bases de Datos",
                "descripcion": "Modelo relacional, SQL básico y normalización.",
                "instructor": u["instructor2"],
                "estado": Curso.Estado.PENDIENTE_APROBACION,
                "nivel": "principiante",
                "solicitado_en": ahora,
            },
        )
        Curso.objects.get_or_create(
            slug="introduccion-a-python",
            defaults={
                "titulo": "Introducción a Python",
                "descripcion": "Sintaxis básica, tipos de datos y estructuras de control.",
                "instructor": u["instructor1"],
                "estado": Curso.Estado.BORRADOR,
                "nivel": "principiante",
            },
        )
        Curso.objects.get_or_create(
            slug="marketing-digital-basico",
            defaults={
                "titulo": "Marketing Digital Básico",
                "descripcion": "Redes sociales, SEO y campañas pagadas.",
                "instructor": u["instructor3"],
                "estado": Curso.Estado.RECHAZADO,
                "nivel": "principiante",
                "solicitado_en": ahora,
                "revisado_en": ahora,
                "revisado_por": u["admin"],
                "motivo_rechazo": "Falta contenido audiovisual y al menos una evaluación por módulo.",
            },
        )
        Curso.objects.get_or_create(
            slug="curso-descontinuado-2023",
            defaults={
                "titulo": "Curso Descontinuado 2023",
                "descripcion": "Contenido obsoleto, reemplazado por una versión nueva.",
                "instructor": u["instructor2"],
                "estado": Curso.Estado.ARCHIVADO,
                "nivel": "intermedio",
                "revisado_en": ahora,
                "revisado_por": u["admin"],
            },
        )

    # ── Curso principal: batería completa de evaluaciones Canvas (RF-03) ─
    def _crear_curso_laboratorio(self, u):
        curso, _ = Curso.objects.get_or_create(
            slug="laboratorio-evaluaciones-canvas",
            defaults={
                "titulo": "Laboratorio de Evaluaciones Canvas",
                "descripcion": "Curso de pruebas con los 5 tipos de pregunta: opción múltiple, "
                "verdadero/falso, seleccionar zona, arrastrar y soltar, y dibujo libre.",
                "instructor": u["instructor1"],
                "estado": Curso.Estado.PUBLICADO,
                "nivel": "intermedio",
            },
        )

        mod1, _ = Modulo.objects.get_or_create(
            curso=curso, orden=1, defaults={"titulo": "Fundamentos", "descripcion": "Quiz básico"}
        )
        mod2, _ = Modulo.objects.get_or_create(
            curso=curso, orden=2, defaults={"titulo": "Selección en lienzo", "descripcion": "Hotspot"}
        )
        mod3, _ = Modulo.objects.get_or_create(
            curso=curso, orden=3, defaults={"titulo": "Arrastrar y soltar", "descripcion": "Drag & drop"}
        )
        mod4, _ = Modulo.objects.get_or_create(
            curso=curso, orden=4, defaults={"titulo": "Evaluación mixta", "descripcion": "Los 5 tipos juntos"}
        )

        lec_intro, _ = Leccion.objects.get_or_create(
            modulo=mod1, orden=1,
            defaults={"titulo": "Bienvenida al laboratorio", "tipo": Leccion.Tipo.CONTENIDO,
                      "contenido": "Este curso existe solo para probar los 5 tipos de pregunta Canvas.",
                      "duracion_minutos": 5},
        )
        lec_basica, _ = Leccion.objects.get_or_create(
            modulo=mod1, orden=2,
            defaults={"titulo": "Quiz básico (opción múltiple + V/F)", "tipo": Leccion.Tipo.QUIZ,
                      "duracion_minutos": 10},
        )
        lec_hotspot, _ = Leccion.objects.get_or_create(
            modulo=mod2, orden=1,
            defaults={"titulo": "Quiz de selección en lienzo", "tipo": Leccion.Tipo.QUIZ,
                      "duracion_minutos": 10},
        )
        lec_arrastrar, _ = Leccion.objects.get_or_create(
            modulo=mod3, orden=1,
            defaults={"titulo": "Quiz de arrastrar y soltar", "tipo": Leccion.Tipo.QUIZ,
                      "duracion_minutos": 10},
        )
        lec_mixta, _ = Leccion.objects.get_or_create(
            modulo=mod4, orden=1,
            defaults={"titulo": "Evaluación mixta (los 5 tipos)", "tipo": Leccion.Tipo.QUIZ,
                      "duracion_minutos": 20},
        )

        # ── Evaluación 1: básica (opción múltiple + V/F) ──
        ev_basica, _ = Evaluacion.objects.get_or_create(
            leccion=lec_basica,
            defaults={"titulo": "Quiz básico", "puntaje_aprobacion": 60, "canvas_schema": {}},
        )
        Pregunta.objects.get_or_create(
            evaluacion=ev_basica, orden=1,
            defaults={"enunciado": "¿Qué significa HTML?", "tipo": Pregunta.Tipo.OPCION_MULTIPLE,
                      "puntaje": 50, "opciones": ["HyperText Markup Language", "High Text Machine Language", "Home Tool Markup Language"],
                      "respuesta_correcta": {"valor": "HyperText Markup Language"}},
        )
        Pregunta.objects.get_or_create(
            evaluacion=ev_basica, orden=2,
            defaults={"enunciado": "CSS sirve para dar estilo visual a una página.", "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                      "puntaje": 50, "opciones": [True, False], "respuesta_correcta": {"valor": True}},
        )

        # ── Evaluación 2: hotspot (2 preguntas, varias zonas cada una) ──
        ev_hotspot, _ = Evaluacion.objects.get_or_create(
            leccion=lec_hotspot,
            defaults={"titulo": "Quiz de selección en lienzo", "puntaje_aprobacion": 70, "canvas_schema": CANVAS_SCHEMA},
        )
        Pregunta.objects.get_or_create(
            evaluacion=ev_hotspot, orden=1,
            defaults={
                "enunciado": "Selecciona el botón de 'Agregar al carrito' en el mockup.",
                "tipo": Pregunta.Tipo.CANVAS_HOTSPOT, "puntaje": 50, "opciones": [],
                "respuesta_correcta": {"hotspot_id": "b"},
                "canvas_config": {"hotspots": [
                    {"id": "a", "x": 120, "y": 100, "r": 34, "label": "Logo"},
                    {"id": "b", "x": 320, "y": 180, "r": 34, "label": "Agregar al carrito"},
                    {"id": "c", "x": 500, "y": 80, "r": 34, "label": "Buscar"},
                ]},
            },
        )
        Pregunta.objects.get_or_create(
            evaluacion=ev_hotspot, orden=2,
            defaults={
                "enunciado": "¿Cuál ícono representa 'notificaciones'?",
                "tipo": Pregunta.Tipo.CANVAS_HOTSPOT, "puntaje": 50, "opciones": [],
                "respuesta_correcta": {"hotspot_id": "y"},
                "canvas_config": {"hotspots": [
                    {"id": "x", "x": 150, "y": 150, "r": 30, "label": "Perfil"},
                    {"id": "y", "x": 300, "y": 150, "r": 30, "label": "Campana"},
                    {"id": "z", "x": 450, "y": 150, "r": 30, "label": "Ajustes"},
                ]},
            },
        )

        # ── Evaluación 3: arrastrar (2 preguntas) ──
        ev_arrastrar, _ = Evaluacion.objects.get_or_create(
            leccion=lec_arrastrar,
            defaults={"titulo": "Quiz de arrastrar y soltar", "puntaje_aprobacion": 70, "canvas_schema": CANVAS_SCHEMA},
        )
        Pregunta.objects.get_or_create(
            evaluacion=ev_arrastrar, orden=1,
            defaults={
                "enunciado": "Arrastra cada etiqueta HTML a su categoría semántica.",
                "tipo": Pregunta.Tipo.CANVAS_ARRASTRAR, "puntaje": 50, "opciones": [],
                "respuesta_correcta": {"asignaciones": {"header": "estructura", "strong": "texto"}},
                "canvas_config": {
                    "items": [
                        {"id": "header", "label": "<header>", "x": 40, "y": 40},
                        {"id": "strong", "label": "<strong>", "x": 40, "y": 100},
                    ],
                    "targets": [
                        {"id": "estructura", "label": "Estructura", "x": 380, "y": 40, "w": 160, "h": 48},
                        {"id": "texto", "label": "Texto", "x": 380, "y": 110, "w": 160, "h": 48},
                    ],
                },
            },
        )
        Pregunta.objects.get_or_create(
            evaluacion=ev_arrastrar, orden=2,
            defaults={
                "enunciado": "Asocia cada lenguaje con su propósito principal.",
                "tipo": Pregunta.Tipo.CANVAS_ARRASTRAR, "puntaje": 50, "opciones": [],
                "respuesta_correcta": {"asignaciones": {"py": "backend", "css": "estilos"}},
                "canvas_config": {
                    "items": [
                        {"id": "py", "label": "Python", "x": 40, "y": 40},
                        {"id": "css", "label": "CSS", "x": 40, "y": 100},
                    ],
                    "targets": [
                        {"id": "backend", "label": "Backend", "x": 380, "y": 40, "w": 160, "h": 48},
                        {"id": "estilos", "label": "Estilos", "x": 380, "y": 110, "w": 160, "h": 48},
                    ],
                },
            },
        )

        # ── Evaluación 4: mixta — los 5 tipos en un solo quiz ──
        ev_mixta, _ = Evaluacion.objects.get_or_create(
            leccion=lec_mixta,
            defaults={"titulo": "Evaluación mixta: los 5 tipos", "puntaje_aprobacion": 70, "canvas_schema": CANVAS_SCHEMA},
        )
        Pregunta.objects.get_or_create(
            evaluacion=ev_mixta, orden=1,
            defaults={"enunciado": "¿Qué framework se usa en el backend de este proyecto?",
                      "tipo": Pregunta.Tipo.OPCION_MULTIPLE, "puntaje": 20,
                      "opciones": ["Django", "Laravel", "Express"], "respuesta_correcta": {"valor": "Django"}},
        )
        Pregunta.objects.get_or_create(
            evaluacion=ev_mixta, orden=2,
            defaults={"enunciado": "React usa un DOM virtual.", "tipo": Pregunta.Tipo.VERDADERO_FALSO,
                      "puntaje": 20, "opciones": [True, False], "respuesta_correcta": {"valor": True}},
        )
        Pregunta.objects.get_or_create(
            evaluacion=ev_mixta, orden=3,
            defaults={
                "enunciado": "Selecciona la zona verde en el lienzo.",
                "tipo": Pregunta.Tipo.CANVAS_HOTSPOT, "puntaje": 20, "opciones": [],
                "respuesta_correcta": {"hotspot_id": "verde"},
                "canvas_config": {"hotspots": [
                    {"id": "rojo", "x": 150, "y": 150, "r": 32, "label": "Rojo"},
                    {"id": "verde", "x": 320, "y": 150, "r": 32, "label": "Verde"},
                    {"id": "azul", "x": 480, "y": 150, "r": 32, "label": "Azul"},
                ]},
            },
        )
        Pregunta.objects.get_or_create(
            evaluacion=ev_mixta, orden=4,
            defaults={
                "enunciado": "Arrastra cada archivo a su carpeta.",
                "tipo": Pregunta.Tipo.CANVAS_ARRASTRAR, "puntaje": 20, "opciones": [],
                "respuesta_correcta": {"asignaciones": {"img": "assets", "comp": "src"}},
                "canvas_config": {
                    "items": [
                        {"id": "img", "label": "logo.png", "x": 40, "y": 40},
                        {"id": "comp", "label": "Button.jsx", "x": 40, "y": 100},
                    ],
                    "targets": [
                        {"id": "assets", "label": "assets/", "x": 380, "y": 40, "w": 160, "h": 48},
                        {"id": "src", "label": "src/", "x": 380, "y": 110, "w": 160, "h": 48},
                    ],
                },
            },
        )
        Pregunta.objects.get_or_create(
            evaluacion=ev_mixta, orden=5,
            defaults={
                "enunciado": "Dibuja el diagrama de arquitectura cliente-servidor.",
                "tipo": Pregunta.Tipo.CANVAS_DIBUJO, "puntaje": 20, "opciones": [],
                "respuesta_correcta": {}, "canvas_config": {"requiere_revision": True},
            },
        )

        # ── Inscripciones ──
        for est in ("estudiante1", "estudiante2", "estudiante3"):
            Inscripcion.objects.get_or_create(
                estudiante=u[est], curso=curso, defaults={"origen": "web"}
            )
            ProgresoLeccion.objects.get_or_create(
                estudiante=u[est], leccion=lec_intro,
                defaults={"estado": ProgresoLeccion.Estado.COMPLETADA, "porcentaje": 100},
            )
            recalcular_progreso_curso(u[est].id, curso.id)

        return curso

    # ── Intentos + auditoría (RF-03 calificación / RF-07 auditoría) ─────
    def _sembrar_intentos_y_auditoria(self, curso, u):
        ev_mixta = Evaluacion.objects.get(leccion__modulo__curso=curso, titulo__startswith="Evaluación mixta")
        ev_hotspot = Evaluacion.objects.get(leccion__modulo__curso=curso, titulo="Quiz de selección en lienzo")
        preguntas_mixta = list(ev_mixta.preguntas.order_by("orden"))
        p_mult, p_vf, p_hot, p_arr, p_dib = preguntas_mixta

        def payload_correcto_mixta():
            respuestas = {p_mult.id: "Django", p_vf.id: True}
            canvas = {
                p_hot.id: {"hotspot_id": "verde"},
                p_arr.id: {"asignaciones": {"img": "assets", "comp": "src"}},
                p_dib.id: {"strokes": [{"points": [{"x": 10, "y": 10}, {"x": 100, "y": 80}], "color": "#111827", "width": 3}]},
            }
            return respuestas, canvas

        # 1) estudiante2: intento YA REVISADO (para poblar auditoría con calificacion_manual)
        respuestas, canvas = payload_correcto_mixta()
        resultado = calificar_intento(ev_mixta, respuestas, canvas)
        intento_revisado, created = IntentoEvaluacion.objects.get_or_create(
            evaluacion=ev_mixta, estudiante=u["estudiante2"],
            defaults={
                "respuestas": respuestas, "canvas_payload": canvas,
                "detalle_calificacion": resultado["detalle_calificacion"],
                "puntaje": resultado["puntaje"], "puntaje_automatico": resultado["puntaje"],
                "aprobado": False, "estado": IntentoEvaluacion.Estado.PENDIENTE_REVISION,
                "finalizado_en": timezone.now(),
            },
        )
        if created:
            anterior_puntaje = intento_revisado.puntaje
            # el instructor califica el dibujo con 18/20
            detalle_final = []
            for d in intento_revisado.detalle_calificacion:
                if d.get("detalle", {}).get("tipo") == "canvas_dibujo":
                    d = {**d, "puntaje": 18, "correcta": True}
                detalle_final.append(d)
            intento_revisado.detalle_calificacion = detalle_final
            intento_revisado.puntaje = 98
            intento_revisado.aprobado = True
            intento_revisado.estado = IntentoEvaluacion.Estado.REVISADO
            intento_revisado.calificado_por = u["instructor1"]
            intento_revisado.calificado_en = timezone.now()
            intento_revisado.feedback_instructor = "Buen diagrama, se entiende el flujo cliente-servidor."
            intento_revisado.save()
            AuditLogCalificacion.objects.create(
                intento=intento_revisado, actor=u["instructor1"],
                accion=AuditLogCalificacion.Accion.CALIFICACION_MANUAL,
                puntaje_anterior=anterior_puntaje, puntaje_nuevo=98,
                aprobado_anterior=False, aprobado_nuevo=True,
                detalle_anterior=resultado["detalle_calificacion"], detalle_nuevo=detalle_final,
                motivo="Revisión del diagrama de arquitectura.",
            )

        # 2) estudiante3: intento PENDIENTE de revisión (para la cola del instructor)
        respuestas, canvas = payload_correcto_mixta()
        IntentoEvaluacion.objects.get_or_create(
            evaluacion=ev_mixta, estudiante=u["estudiante3"],
            defaults={
                "respuestas": respuestas, "canvas_payload": canvas,
                "detalle_calificacion": calificar_intento(ev_mixta, respuestas, canvas)["detalle_calificacion"],
                "puntaje": 80, "puntaje_automatico": 80, "aprobado": False,
                "estado": IntentoEvaluacion.Estado.PENDIENTE_REVISION,
                "finalizado_en": timezone.now(),
            },
        )

        # 3) estudiante1: intento FINALIZADO (sin dibujo, auto-aprobado) en la evaluación de hotspot
        p1, p2 = list(ev_hotspot.preguntas.order_by("orden"))
        respuestas_h, canvas_h = {}, {p1.id: {"hotspot_id": "b"}, p2.id: {"hotspot_id": "y"}}
        resultado_h = calificar_intento(ev_hotspot, respuestas_h, canvas_h)
        IntentoEvaluacion.objects.get_or_create(
            evaluacion=ev_hotspot, estudiante=u["estudiante1"],
            defaults={
                "respuestas": respuestas_h, "canvas_payload": canvas_h,
                "detalle_calificacion": resultado_h["detalle_calificacion"],
                "puntaje": resultado_h["puntaje"], "puntaje_automatico": resultado_h["puntaje"],
                "aprobado": resultado_h["aprobado"], "estado": IntentoEvaluacion.Estado.FINALIZADO,
                "finalizado_en": timezone.now(),
            },
        )

        # 4) Registro de auditoría extra: ajuste y revocación (para probar el filtro con los 3 tipos)
        if intento_revisado:
            AuditLogCalificacion.objects.get_or_create(
                intento=intento_revisado, actor=u["admin"], accion=AuditLogCalificacion.Accion.AJUSTE,
                motivo="Ajuste tras reclamo del estudiante por error de tipeo en el enunciado.",
                defaults={
                    "puntaje_anterior": 98, "puntaje_nuevo": 100,
                    "aprobado_anterior": True, "aprobado_nuevo": True,
                    "detalle_anterior": [], "detalle_nuevo": [],
                },
            )
            AuditLogCalificacion.objects.get_or_create(
                intento=intento_revisado, actor=u["admin"], accion=AuditLogCalificacion.Accion.REVOCACION,
                motivo="Revocación de prueba para verificar el panel de auditoría.",
                defaults={
                    "puntaje_anterior": 100, "puntaje_nuevo": 0,
                    "aprobado_anterior": True, "aprobado_nuevo": False,
                    "detalle_anterior": [], "detalle_nuevo": [],
                },
            )