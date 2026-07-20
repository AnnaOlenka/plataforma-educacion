# Generated manually for Canvas interactive evaluation fields.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("evaluaciones", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="intentoevaluacion",
            name="detalle_calificacion",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="intentoevaluacion",
            name="estado",
            field=models.CharField(
                choices=[("en_curso", "En curso"), ("finalizado", "Finalizado")],
                default="finalizado",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="pregunta",
            name="tipo",
            field=models.CharField(
                choices=[
                    ("opcion_multiple", "Opción múltiple"),
                    ("verdadero_falso", "Verdadero/Falso"),
                    ("canvas_hotspot", "Seleccionar (hotspot)"),
                    ("canvas_arrastrar", "Arrastrar y soltar"),
                    ("canvas_dibujo", "Dibujo / región Canvas"),
                ],
                max_length=30,
            ),
        ),
    ]
