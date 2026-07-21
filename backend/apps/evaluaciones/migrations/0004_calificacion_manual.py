# Generated manually for manual grading fields.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("evaluaciones", "0003_canvas_interactivo"),
    ]

    operations = [
        migrations.AddField(
            model_name="intentoevaluacion",
            name="calificado_en",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="intentoevaluacion",
            name="calificado_por",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="intentos_calificados",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="intentoevaluacion",
            name="feedback_instructor",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="intentoevaluacion",
            name="puntaje_automatico",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text="Puntaje del auto-grader",
                max_digits=5,
            ),
        ),
        migrations.AlterField(
            model_name="intentoevaluacion",
            name="estado",
            field=models.CharField(
                choices=[
                    ("en_curso", "En curso"),
                    ("finalizado", "Finalizado"),
                    ("pendiente_revision", "Pendiente de revisión"),
                    ("revisado", "Revisado manualmente"),
                ],
                default="finalizado",
                max_length=20,
            ),
        ),
    ]
