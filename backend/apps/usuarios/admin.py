from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin):
    list_display = ("username", "email", "rol", "is_active", "fecha_registro")
    list_filter = ("rol", "is_active", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("username",)

    fieldsets = BaseUserAdmin.fieldsets + (
        ("LMS", {"fields": ("rol", "avatar", "bio")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("LMS", {"fields": ("rol",)}),
    )
