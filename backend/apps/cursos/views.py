"""
ViewSets DRF con annotate/Count y HATEOAS para ruta de aprendizaje.
"""
from django.db.models import Count, Prefetch
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.reverse import reverse

from .models import Curso, Inscripcion, Leccion, Modulo
from .pagination import ModuloPagination
from .serializers import (
    CursoDetailSerializer,
    CursoListSerializer,
    InscripcionSerializer,
    LeccionSerializer,
    ModuloSerializer,
)


class IsInstructorOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and getattr(request.user, "es_instructor", False)


class CursoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsInstructorOrReadOnly]
    lookup_field = "slug"
    filterset_fields = ("estado", "nivel", "instructor")
    search_fields = ("titulo", "descripcion")
    ordering_fields = ("creado_en", "titulo")

    def get_queryset(self):
        return (
            Curso.objects.select_related("instructor")
            .annotate(
                inscritos_count=Count("inscripciones", distinct=True),
                modulos_count=Count("modulos", distinct=True),
                lecciones_count=Count("modulos__lecciones", distinct=True),
            )
            .prefetch_related(
                Prefetch("modulos", queryset=Modulo.objects.annotate(lecciones_count=Count("lecciones")))
            )
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CursoDetailSerializer
        return CursoListSerializer

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def inscribir(self, request, slug=None):
        curso = self.get_object()
        insc, created = Inscripcion.objects.get_or_create(
            estudiante=request.user,
            curso=curso,
            defaults={"origen": "web"},
        )
        serializer = InscripcionSerializer(insc)
        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=code)

    @action(detail=True, methods=["get"], url_path="ruta-aprendizaje")
    def ruta_aprendizaje(self, request, slug=None):
        """
        HATEOAS: secuencia de lecciones con hipervínculos next/prev/self
        y enlace a evaluación cuando tipo=quiz.
        """
        curso = self.get_object()
        lecciones = list(
            Leccion.objects.filter(modulo__curso=curso)
            .select_related("modulo")
            .order_by("modulo__orden", "orden")
        )
        items = []
        for i, lec in enumerate(lecciones):
            self_url = reverse("leccion-detail", args=[lec.pk], request=request)
            links = {
                "self": {"href": self_url},
                "curso": {
                    "href": reverse("curso-detail", args=[curso.slug], request=request)
                },
                "modulo": {
                    "href": reverse("modulo-detail", args=[lec.modulo_id], request=request)
                },
            }
            if i > 0:
                links["prev"] = {
                    "href": reverse("leccion-detail", args=[lecciones[i - 1].pk], request=request)
                }
            if i < len(lecciones) - 1:
                links["next"] = {
                    "href": reverse("leccion-detail", args=[lecciones[i + 1].pk], request=request)
                }
            if lec.tipo == Leccion.Tipo.QUIZ:
                links["evaluacion"] = {
                    "href": reverse("evaluacion-by-leccion", args=[lec.pk], request=request)
                }
            items.append(
                {
                    "id": lec.id,
                    "titulo": lec.titulo,
                    "tipo": lec.tipo,
                    "modulo": lec.modulo.titulo,
                    "orden_global": i + 1,
                    "_links": links,
                }
            )
        return Response(
            {
                "curso": curso.titulo,
                "total": len(items),
                "_links": {
                    "self": {
                        "href": reverse("curso-ruta-aprendizaje", args=[curso.slug], request=request)
                    },
                    "curso": {
                        "href": reverse("curso-detail", args=[curso.slug], request=request)
                    },
                },
                "_embedded": {"lecciones": items},
            }
        )


class ModuloViewSet(viewsets.ReadOnlyModelViewSet):
    """Lecciones paginadas por módulo."""

    serializer_class = ModuloSerializer
    pagination_class = ModuloPagination
    filterset_fields = ("curso",)

    def get_queryset(self):
        return Modulo.objects.annotate(lecciones_count=Count("lecciones")).prefetch_related(
            "lecciones"
        )


class LeccionViewSet(viewsets.ModelViewSet):
    serializer_class = LeccionSerializer
    filterset_fields = ("modulo", "tipo")
    permission_classes = [IsInstructorOrReadOnly]

    def get_queryset(self):
        return Leccion.objects.select_related("modulo", "modulo__curso")


class InscripcionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InscripcionSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Inscripcion.objects.select_related("curso", "estudiante")
        if user.es_instructor:
            return qs.filter(curso__instructor=user)
        return qs.filter(estudiante=user)
