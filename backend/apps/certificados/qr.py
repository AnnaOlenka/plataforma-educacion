"""Utilidades de certificados: URLs públicas, QR y hash corto."""
from __future__ import annotations

from io import BytesIO

import qrcode
from django.conf import settings
from qrcode.constants import ERROR_CORRECT_M


def url_verificacion_api(codigo) -> str:
    template = settings.CERT_PUBLIC_VERIFY_URL
    return template.format(codigo=codigo)


def url_verificacion_frontend(codigo) -> str:
    template = getattr(
        settings,
        "CERT_FRONTEND_VERIFY_URL",
        "http://localhost:5173/verificar/{codigo}",
    )
    return template.format(codigo=codigo)


def hash_corto(firma_hmac: str, n: int = 12) -> str:
    """Huella legible del HMAC (no sustituye la firma completa)."""
    return (firma_hmac or "")[:n].upper()


def generar_qr_png(contenido: str, box_size: int = 8) -> bytes:
    """Genera imagen PNG del QR que apunta a la URL de verificación."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=box_size,
        border=2,
    )
    qr.add_data(contenido)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def qr_verificacion_png(codigo) -> bytes:
    # El QR apunta a la página/API pública (sin login)
    return generar_qr_png(url_verificacion_frontend(codigo))
