from django.contrib import admin

from .models import Certificado


@admin.register(Certificado)
class CertificadoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "estudiante", "curso", "emitido_en", "revocado", "firma_valida")
    list_filter = ("revocado", "emitido_en")
    search_fields = ("codigo", "estudiante__username", "curso__titulo")
    readonly_fields = ("codigo", "firma_hmac", "emitido_en")
    actions = ["revocar"]

    @admin.display(boolean=True, description="Firma OK")
    def firma_valida(self, obj):
        return obj.verificar()

    @admin.action(description="Revocar certificados")
    def revocar(self, request, queryset):
        queryset.update(revocado=True)
        self.message_user(request, "Certificados revocados.")
