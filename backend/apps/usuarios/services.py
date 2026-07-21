"""Servicios de autenticación: correo de recuperación de cuenta."""
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


def generar_uid_y_token(usuario) -> tuple[str, str]:
    uid = urlsafe_base64_encode(force_bytes(usuario.pk))
    token = default_token_generator.make_token(usuario)
    return uid, token


def enviar_correo_recuperacion(usuario) -> None:
    """Envía enlace/token de restablecimiento. En DEBUG usa EMAIL_BACKEND console."""
    uid, token = generar_uid_y_token(usuario)
    frontend_base = getattr(
        settings,
        "PASSWORD_RESET_FRONTEND_URL",
        "http://localhost:5173/recuperar-cuenta",
    )
    enlace = f"{frontend_base}?uid={uid}&token={token}"
    nombre = usuario.get_full_name() or usuario.username

    asunto = "Recuperación de cuenta — EduPath"
    mensaje_texto = (
        f"Hola {nombre},\n\n"
        "Recibimos una solicitud para restablecer tu contraseña.\n"
        f"Usa este enlace (válido por tiempo limitado):\n\n{enlace}\n\n"
        f"Si el frontend aún no está disponible, puedes confirmar con la API:\n"
        f"POST /api/auth/password-reset/confirm/\n"
        f'{{"uid": "{uid}", "token": "{token}", "new_password": "..."}}\n\n'
        "Si no solicitaste este cambio, ignora este mensaje.\n"
    )
    mensaje_html = render_to_string(
        "emails/password_reset.html", {"nombre": nombre, "enlace": enlace}
    )

    email = EmailMultiAlternatives(
        subject=asunto,
        body=mensaje_texto,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[usuario.email],
    )
    email.attach_alternative(mensaje_html, "text/html")
    email.send(fail_silently=False)
