"""
Catálogo de cursos, inscripción y navegación por módulos/lecciones.
"""
from django.db.models import Count, Prefetch, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.reverse import reverse

from apps.progreso.models import ProgresoLeccion

from .models import Curso, Inscripcion, Leccion, Modulo
from .pagination import ModuloPagination
from .permissions import CatalogoPublicoOInstructor, IsInstructorOrReadOnly, usuario_inscrito
from .serializers import (
    CursoDetailSerializer,
    CursoListSerializer,
    InscripcionSerializer,
    LeccionSerializer,
    ModuloNavegacionSerializer,
    ModuloSerializer,
)


class CursoViewSet(viewsets.ModelViewSet):
    """
    Catálogo de cursos.
    - GET list/retrieve: público (solo publicados, salvo instructor dueño/admin).
    - POST/PUT/PATCH/DELETE: instructor.
    """

    permission_classes = [CatalogoPublicoOInstructor]
    lookup_field = "slug"
    filterset_fields = ("estado", "nivel", "instructor")
    search_fields = ("titulo", "descripcion", "instructor__username")
    ordering_fields = ("creado_en", "titulo", "nivel")

    def get_queryset(self):
        qs = (
            Curso.objects.select_related("instructor")
            .annotate(
                inscritos_count=Count(
                    "inscripciones",
                    filter=Q(inscripciones__estado=Inscripcion.Estado.ACTIVA),
                    distinct=True,
                ),
                modulos_count=Count("modulos", distinct=True),
                lecciones_count=Count("modulos__lecciones", distinct=True),
            )
            .prefetch_related(
                Prefetch(
                    "modulos",
                    queryset=Modulo.objects.annotate(
                        lecciones_count=Count("lecciones")
                    ).prefetch_related("lecciones"),
                )
            )
            .order_by("-creado_en")
        )
        user = self.request.user
        if user.is_authenticated and getattr(user, "es_admin", False):
            return qs
        if user.is_authenticated and getattr(user, "es_instructor", False):
            return qs.filter(Q(estado=Curso.Estado.PUBLICADO) | Q(instructor=user))
        return qs.filter(estado=Curso.Estado.PUBLICADO)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CursoDetailSerializer
        return CursoListSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        user = self.request.user
        if user.is_authenticated:
            ctx["inscrito_curso_ids"] = set(
                Inscripcion.objects.filter(
                    estudiante=user, estado=Inscripcion.Estado.ACTIVA
                ).values_list("curso_id", flat=True)
            )
        else:
            ctx["inscrito_curso_ids"] = set()
        return ctx

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated],
    )
    def inscribir(self, request, slug=None):
        """Inscribe al usuario autenticado en el curso (solo publicados)."""
        curso = self.get_object()
        if curso.estado != Curso.Estado.PUBLICADO:
            return Response(
                {"detail": "Solo puedes inscribirte en cursos publicados."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        insc, created = Inscripcion.objects.get_or_create(
            estudiante=request.user,
            curso=curso,
            defaults={"origen": "web", "estado": Inscripcion.Estado.ACTIVA},
        )
        if not created and insc.estado == Inscripcion.Estado.CANCELADA:
            insc.estado = Inscripcion.Estado.ACTIVA
            insc.origen = "web"
            insc.save(update_fields=["estado", "origen"])
            created = True
        serializer = InscripcionSerializer(insc)
        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=code)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated],
        url_path="cancelar-inscripcion",
    )
    def cancelar_inscripcion(self, request, slug=None):
        curso = self.get_object()
        try:
            insc = Inscripcion.objects.get(estudiante=request.user, curso=curso)
        except Inscripcion.DoesNotExist:
            return Response(
                {"detail": "No estás inscrito en este curso."},
                status=status.HTTP_404_NOT_FOUND,
            )
        insc.estado = Inscripcion.Estado.CANCELADA
        insc.save(update_fields=["estado"])
        return Response(InscripcionSerializer(insc).data)

    @action(
        detail=True,
        methods=["get"],
        url_path="navegacion",
        permission_classes=[permissions.IsAuthenticated],
    )
    def navegacion(self, request, slug=None):
        """
        Navegación por módulos/lecciones con marcadores de progreso.
        Requiere inscripción (o ser instructor del curso / admin).
        """
        curso = self.get_object()
        if not usuario_inscrito(request.user, curso):
            return Response(
                {"detail": "Debes inscribirte para navegar el contenido."},
                status=status.HTTP_403_FORBIDDEN,
            )

        progresos = {
            p.leccion_id: p
            for p in ProgresoLeccion.objects.filter(
                estudiante=request.user, leccion__modulo__curso=curso
            )
        }

        modulos = (
            Modulo.objects.filter(curso=curso)
            .annotate(lecciones_count=Count("lecciones"))
            .prefetch_related("lecciones")
            .order_by("orden", "id")
        )

        modulos_payload = []
        lecciones_flat = []
        orden_global = 0
        completadas_obligatorias = 0
        total_obligatorias = 0

        for modulo in modulos:
            lecciones_data = []
            lecciones_completadas = 0
            for lec in modulo.lecciones.all():
                orden_global += 1
                prog = progresos.get(lec.id)
                estado = prog.estado if prog else ProgresoLeccion.Estado.NO_INICIADA
                porcentaje = prog.porcentaje if prog else 0
                tiempo = prog.tiempo_segundos if prog else 0
                if estado == ProgresoLeccion.Estado.COMPLETADA:
                    lecciones_completadas += 1
                if lec.es_obligatoria:
                    total_obligatorias += 1
                    if estado == ProgresoLeccion.Estado.COMPLETADA:
                        completadas_obligatorias += 1

                item = {
                    "id": lec.id,
                    "titulo": lec.titulo,
                    "orden": lec.orden,
                    "orden_global": orden_global,
                    "tipo": lec.tipo,
                    "duracion_minutos": lec.duracion_minutos,
                    "es_obligatoria": lec.es_obligatoria,
                    "progreso": {
                        "estado": estado,
                        "porcentaje": porcentaje,
                        "tiempo_segundos": tiempo,
                    },
                    "_links": {
                        "self": {
                            "href": reverse(
                                "leccion-detail", args=[lec.pk], request=request
                            )
                        },
                        "modulo": {
                            "href": reverse(
                                "modulo-detail", args=[modulo.pk], request=request
                            )
                        },
                    },
                }
                lecciones_data.append(item)
                lecciones_flat.append(item)

            modulos_payload.append(
                {
                    "id": modulo.id,
                    "titulo": modulo.titulo,
                    "orden": modulo.orden,
                    "descripcion": modulo.descripcion,
                    "lecciones_count": modulo.lecciones_count,
                    "lecciones_completadas": lecciones_completadas,
                    "lecciones": lecciones_data,
                }
            )

        for i, item in enumerate(lecciones_flat):
            if i > 0:
                item["_links"]["prev"] = {
                    "href": reverse(
                        "leccion-detail",
                        args=[lecciones_flat[i - 1]["id"]],
                        request=request,
                    )
                }
            if i < len(lecciones_flat) - 1:
                item["_links"]["next"] = {
                    "href": reverse(
                        "leccion-detail",
                        args=[lecciones_flat[i + 1]["id"]],
                        request=request,
                    )
                }

        insc = Inscripcion.objects.filter(
            estudiante=request.user, curso=curso
        ).first()
        progreso_pct = float(insc.progreso_pct) if insc else 0.0
        if total_obligatorias:
            progreso_pct = round(
                completadas_obligatorias / total_obligatorias * 100, 2
            )

        return Response(
            {
                "curso": {
                    "id": curso.id,
                    "titulo": curso.titulo,
                    "slug": curso.slug,
                    "progreso_pct": progreso_pct,
                },
                "total_lecciones": len(lecciones_flat),
                "completadas_obligatorias": completadas_obligatorias,
                "total_obligatorias": total_obligatorias,
                "modulos": modulos_payload,
                "_links": {
                    "self": {
                        "href": reverse(
                            "curso-navegacion", args=[curso.slug], request=request
                        )
                    },
                    "curso": {
                        "href": reverse(
                            "curso-detail", args=[curso.slug], request=request
                        )
                    },
                    "progreso": {
                        "href": reverse("progreso-list", request=request)
                        + f"?curso={curso.id}"
                    },
                },
            }
        )

    @action(detail=True, methods=["get"], url_path="ruta-aprendizaje")
    def ruta_aprendizaje(self, request, slug=None):
        """
        HATEOAS: secuencia de lecciones con hipervínculos next/prev/self
        y marcadores de progreso si el usuario está autenticado.
        """
        curso = self.get_object()
        lecciones = list(
            Leccion.objects.filter(modulo__curso=curso)
            .select_related("modulo")
            .order_by("modulo__orden", "orden")
        )
        progresos = {}
        if request.user.is_authenticated:
            progresos = {
                p.leccion_id: p
                for p in ProgresoLeccion.objects.filter(
                    estudiante=request.user, leccion__modulo__curso=curso
                )
            }

        items = []
        for i, lec in enumerate(lecciones):
            self_url = reverse("leccion-detail", args=[lec.pk], request=request)
            links = {
                "self": {"href": self_url},
                "curso": {
                    "href": reverse(
                        "curso-detail", args=[curso.slug], request=request
                    )
                },
                "modulo": {
                    "href": reverse(
                        "modulo-detail", args=[lec.modulo_id], request=request
                    )
                },
            }
            if i > 0:
                links["prev"] = {
                    "href": reverse(
                        "leccion-detail", args=[lecciones[i - 1].pk], request=request
                    )
                }
            if i < len(lecciones) - 1:
                links["next"] = {
                    "href": reverse(
                        "leccion-detail", args=[lecciones[i + 1].pk], request=request
                    )
                }
            if lec.tipo == Leccion.Tipo.QUIZ:
                try:
                    links["evaluacion"] = {
                        "href": reverse(
                            "evaluacion-by-leccion", args=[lec.pk], request=request
                        )
                    }
                except Exception:
                    pass

            prog = progresos.get(lec.id)
            items.append(
                {
                    "id": lec.id,
                    "titulo": lec.titulo,
                    "tipo": lec.tipo,
                    "modulo": lec.modulo.titulo,
                    "orden_global": i + 1,
                    "progreso": {
                        "estado": prog.estado
                        if prog
                        else ProgresoLeccion.Estado.NO_INICIADA,
                        "porcentaje": prog.porcentaje if prog else 0,
                    },
                    "_links": links,
                }
            )
        return Response(
            {
                "curso": curso.titulo,
                "total": len(items),
                "_links": {
                    "self": {
                        "href": reverse(
                            "curso-ruta-aprendizaje",
                            args=[curso.slug],
                            request=request,
                        )
                    },
                    "curso": {
                        "href": reverse(
                            "curso-detail", args=[curso.slug], request=request
                        )
                    },
                    "navegacion": {
                        "href": reverse(
                            "curso-navegacion", args=[curso.slug], request=request
                        )
                    },
                },
                "_embedded": {"lecciones": items},
            }
        )


class ModuloViewSet(viewsets.ReadOnlyModelViewSet):
    """Listado/detalle de módulos (filtrar con ?curso=)."""

    serializer_class = ModuloSerializer
    pagination_class = ModuloPagination
    filterset_fields = ("curso",)
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return (
            Modulo.objects.filter(curso__estado=Curso.Estado.PUBLICADO)
            .annotate(lecciones_count=Count("lecciones"))
            .prefetch_related("lecciones")
        )

    def get_serializer_class(self):
        if self.request.query_params.get("con_progreso") == "1":
            return ModuloNavegacionSerializer
        return ModuloSerializer


class LeccionViewSet(viewsets.ModelViewSet):
    serializer_class = LeccionSerializer
    filterset_fields = ("modulo", "tipo", "modulo__curso")
    permission_classes = [IsInstructorOrReadOnly]

    def get_queryset(self):
        qs = Leccion.objects.select_related("modulo", "modulo__curso")
        user = self.request.user
        if user.is_authenticated and getattr(user, "es_admin", False):
            return qs
        if user.is_authenticated and getattr(user, "es_instructor", False):
            return qs.filter(
                Q(modulo__curso__estado=Curso.Estado.PUBLICADO)
                | Q(modulo__curso__instructor=user)
            )
        return qs.filter(modulo__curso__estado=Curso.Estado.PUBLICADO)

    def retrieve(self, request, *args, **kwargs):
        leccion = self.get_object()
        data = LeccionSerializer(leccion).data
        # Navegación prev/next dentro del curso
        hermanas = list(
            Leccion.objects.filter(modulo__curso=leccion.modulo.curso)
            .order_by("modulo__orden", "orden")
            .values_list("id", flat=True)
        )
        idx = hermanas.index(leccion.id) if leccion.id in hermanas else -1
        links = {
            "self": {
                "href": reverse("leccion-detail", args=[leccion.pk], request=request)
            },
            "curso": {
                "href": reverse(
                    "curso-detail",
                    args=[leccion.modulo.curso.slug],
                    request=request,
                )
            },
            "modulo": {
                "href": reverse(
                    "modulo-detail", args=[leccion.modulo_id], request=request
                )
            },
        }
        if idx > 0:
            links["prev"] = {
                "href": reverse(
                    "leccion-detail", args=[hermanas[idx - 1]], request=request
                )
            }
        if 0 <= idx < len(hermanas) - 1:
            links["next"] = {
                "href": reverse(
                    "leccion-detail", args=[hermanas[idx + 1]], request=request
                )
            }

        progreso = None
        if request.user.is_authenticated:
            prog = ProgresoLeccion.objects.filter(
                estudiante=request.user, leccion=leccion
            ).first()
            if prog:
                progreso = {
                    "estado": prog.estado,
                    "porcentaje": prog.porcentaje,
                    "tiempo_segundos": prog.tiempo_segundos,
                }
            else:
                progreso = {
                    "estado": ProgresoLeccion.Estado.NO_INICIADA,
                    "porcentaje": 0,
                    "tiempo_segundos": 0,
                }

        data["_links"] = links
        data["progreso"] = progreso
        data["inscrito"] = usuario_inscrito(request.user, leccion.modulo.curso)
        return Response(data)


class InscripcionViewSet(viewsets.ReadOnlyModelViewSet):
    """Mis cursos inscritos (estudiante) o inscritos de mis cursos (instructor)."""

    serializer_class = InscripcionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ("estado", "curso")

    def get_queryset(self):
        user = self.request.user
        qs = Inscripcion.objects.select_related("curso", "estudiante")
        if getattr(user, "es_admin", False):
            return qs
        if getattr(user, "es_instructor", False):
            return qs.filter(curso__instructor=user)
        return qs.filter(estudiante=user)
