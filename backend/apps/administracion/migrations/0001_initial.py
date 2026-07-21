# Generated manually for AuditLogCalificacion

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("evaluaciones", "0004_calificacion_manual"),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditLogCalificacion",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "accion",
                    models.CharField(
                        choices=[
                            ("calificacion_manual", "Calificación manual"),
                            ("ajuste", "Ajuste de puntaje"),
                            ("revocacion", "Revocación / anulación"),
                        ],
                        default="calificacion_manual",
                        max_length=40,
                    ),
                ),
                ("puntaje_anterior", models.DecimalField(decimal_places=2, max_digits=5)),
                ("puntaje_nuevo", models.DecimalField(decimal_places=2, max_digits=5)),
                ("aprobado_anterior", models.BooleanField()),
                ("aprobado_nuevo", models.BooleanField()),
                ("feedback_anterior", models.TextField(blank=True)),
                ("feedback_nuevo", models.TextField(blank=True)),
                ("detalle_anterior", models.JSONField(blank=True, default=list)),
                ("detalle_nuevo", models.JSONField(blank=True, default=list)),
                ("motivo", models.TextField(blank=True)),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                (
                    "actor",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="auditorias_calificacion",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "intento",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="auditorias",
                        to="evaluaciones.intentoevaluacion",
                    ),
                ),
            ],
            options={
                "verbose_name": "Auditoría de calificación",
                "verbose_name_plural": "Auditorías de calificación",
                "ordering": ["-creado_en"],
            },
        ),
    ]
