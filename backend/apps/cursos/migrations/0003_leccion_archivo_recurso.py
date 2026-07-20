# Generated manually for instructor panel fields.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cursos", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="leccion",
            name="archivo",
            field=models.FileField(
                blank=True,
                help_text="PDF, imagen u otro adjunto",
                null=True,
                upload_to="lecciones/",
            ),
        ),
        migrations.AddField(
            model_name="leccion",
            name="recurso_url",
            field=models.URLField(
                blank=True, help_text="URL de video o recurso externo"
            ),
        ),
    ]
