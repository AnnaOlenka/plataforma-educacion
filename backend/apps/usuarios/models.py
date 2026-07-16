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

    @property
    def es_instructor(self):
        return self.rol in (self.Rol.INSTRUCTOR, self.Rol.ADMIN) or self.is_staff
