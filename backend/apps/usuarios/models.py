"""
Modelo Usuario — extensión de AbstractUser para roles LMS.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    class Rol(models.TextChoices):
        ESTUDIANTE = "estudiante", "Estudiante"
        INSTRUCTOR = "instructor", "Instructor"
        ADMIN = "admin", "Administrador"

    # Email obligatorio y único (recuperación de cuenta y login)
    email = models.EmailField("correo electrónico", unique=True)

    rol = models.CharField(max_length=20, choices=Rol.choices, default=Rol.ESTUDIANTE)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    bio = models.TextField(blank=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
        ordering = ["username"]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.rol})"

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        # Rol admin implica acceso al panel Django
        if self.rol == self.Rol.ADMIN:
            self.is_staff = True
        super().save(*args, **kwargs)

    @property
    def es_instructor(self):
        return self.rol in (self.Rol.INSTRUCTOR, self.Rol.ADMIN) or self.is_staff

    @property
    def es_admin(self):
        return self.rol == self.Rol.ADMIN or self.is_superuser
