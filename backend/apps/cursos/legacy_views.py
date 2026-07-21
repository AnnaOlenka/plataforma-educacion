"""
Endpoint de sincronización para legacy-enrollment.jsp (CSV masivo).
"""
from django.conf import settings
from django.contrib.auth import get_user_model
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Curso, Inscripcion

Usuario = get_user_model()


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
class LegacyEnrollmentSyncView(APIView):
    """
    Recibe lotes de inscripción desde el puente JSP.
    Header: X-Legacy-Api-Key
    Body: { "enrollments": [ { "email", "username", "curso_slug", "origen": "legacy_csv" } ] }
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        api_key = request.headers.get("X-Legacy-Api-Key", "")
        if api_key != settings.LEGACY_SYNC_API_KEY:
            return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        enrollments = request.data.get("enrollments", [])
        created = 0
        skipped = 0
        errors = []

        for i, row in enumerate(enrollments):
            email = (row.get("email") or "").strip().lower()
            username = (row.get("username") or email.split("@")[0] or f"user{i}").strip()
            curso_slug = row.get("curso_slug")
            if not email or not curso_slug:
                errors.append({"index": i, "error": "email y curso_slug requeridos"})
                continue
            try:
                curso = Curso.objects.get(slug=curso_slug)
            except Curso.DoesNotExist:
                errors.append({"index": i, "error": f"curso '{curso_slug}' no existe"})
                continue

            user, _ = Usuario.objects.get_or_create(
                email=email,
                defaults={
                    "username": username[:150],
                    "rol": Usuario.Rol.ESTUDIANTE,
                },
            )
            if not user.has_usable_password():
                user.set_unusable_password()
                user.save(update_fields=["password"])

            _, was_created = Inscripcion.objects.get_or_create(
                estudiante=user,
                curso=curso,
                defaults={"origen": "legacy_csv", "estado": Inscripcion.Estado.ACTIVA},
            )
            if was_created:
                created += 1
            else:
                skipped += 1

        return Response(
            {"created": created, "skipped": skipped, "errors": errors},
            status=status.HTTP_200_OK,
        )
