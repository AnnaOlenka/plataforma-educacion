"""
AuditMiddleware — registra accesos a contenido (lecciones/cursos) para
trazabilidad de aprendizaje (RNF05). La emisión de certificados y los
cambios de calificación se auditan en sus propios puntos de escritura
(apps.certificados.services, apps.instructor.views) por ser eventos
puntuales más fáciles de capturar ahí con contexto completo.
"""
import re

CONTENT_PATTERNS = (
    (re.compile(r"^/api/lecciones/(?P<id>\d+)/$"), "Leccion"),
    (re.compile(r"^/api/cursos/(?P<slug>[\w-]+)/ruta-aprendizaje/$"), "RutaAprendizaje"),
    (re.compile(r"^/api/cursos/(?P<slug>[\w-]+)/$"), "Curso"),
)


class AuditMiddleware:
    """Middleware de auditoría: loguea GET exitosos a contenido de curso/lección."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        self._registrar_acceso(request, response)
        return response

    def _registrar_acceso(self, request, response):
        if request.method != "GET" or response.status_code != 200:
            return
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return

        for pattern, objeto_tipo in CONTENT_PATTERNS:
            match = pattern.match(request.path)
            if not match:
                continue
            # Import diferido: evita acceder al ORM/apps antes de que Django
            # termine de inicializarlas (el middleware se instancia en el arranque).
            from .models import RegistroAuditoria

            objeto_id = next(iter(match.groupdict().values()), "")
            RegistroAuditoria.objects.create(
                usuario=user,
                accion=RegistroAuditoria.Accion.ACCESO_CONTENIDO,
                objeto_tipo=objeto_tipo,
                objeto_id=str(objeto_id),
                ruta=request.path,
                metodo=request.method,
                ip=self._ip(request),
            )
            break

    @staticmethod
    def _ip(request):
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            return xff.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")
