from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("usuarios", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="usuario",
            name="email",
            field=models.EmailField(
                max_length=254,
                unique=True,
                verbose_name="correo electrónico",
            ),
        ),
    ]
