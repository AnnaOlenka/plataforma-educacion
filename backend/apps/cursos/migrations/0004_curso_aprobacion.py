# Generated manually — flujo de aprobación de cursos.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("cursos", "0003_leccion_archivo_recurso"),
    ]

    operations = [
        migrations.AddField(
            model_name="curso",
            name="motivo_rechazo",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="curso",
            name="revisado_en",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="curso",
            name="revisado_por",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="cursos_revisados",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="curso",
            name="solicitado_en",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="curso",
            name="estado",
            field=models.CharField(
                choices=[
                    ("borrador", "Borrador"),
                    ("pendiente_aprobacion", "Pendiente de aprobación"),
                    ("publicado", "Publicado"),
                    ("rechazado", "Rechazado"),
                    ("archivado", "Archivado"),
                ],
                default="borrador",
                max_length=30,
            ),
        ),
    ]
