"""
Configuración Django MTV + DRF para LMS EduPath.
"""
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-insecure-change-me-in-production")
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "django_prometheus",
    "drf_spectacular",
    # Local
    "apps.usuarios",
    "apps.cursos",
    "apps.evaluaciones",
    "apps.certificados",
    "apps.progreso",
    "apps.analytics",
    "apps.instructor",
    "apps.administracion",
]

MIDDLEWARE = [
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.administracion.middleware.AuditMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# PostgreSQL (requerido) — variables en .env / Docker / K8s
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "edupath"),
        "USER": os.getenv("POSTGRES_USER", "edupath"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "edupath"),
        "HOST": os.getenv("POSTGRES_HOST", "127.0.0.1"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": int(os.getenv("POSTGRES_CONN_MAX_AGE", "60")),
        "OPTIONS": {
            "connect_timeout": int(os.getenv("POSTGRES_CONNECT_TIMEOUT", "5")),
        },
    }
}

AUTH_USER_MODEL = "usuarios.Usuario"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es-co"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- CORS / CSRF ---
CORS_ALLOWED_ORIGINS = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = os.getenv(
    "CSRF_TRUSTED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

# --- DRF ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "apps.cursos.pagination.ModuloPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.AnonRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "user": "120/min",
        "anon": "30/min",
        "evaluacion": "20/min",
        "auth_anon": "10/min",
        "auth_user": "30/min",
        "password_reset": "5/min",
    },
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# --- OpenAPI / Swagger / ReDoc (drf-spectacular) ---
SPECTACULAR_SETTINGS = {
    "TITLE": "EduPath LMS API",
    "DESCRIPTION": (
        "API REST de la plataforma educativa EduPath.\n\n"
        "## Módulos\n"
        "1. Autenticación y cuentas\n"
        "2. Catálogo, inscripción y progreso\n"
        "3. Evaluaciones Canvas\n"
        "4. Dashboard y PDF\n"
        "5. Certificados (HMAC + QR)\n"
        "6. Panel instructor\n"
        "7. Panel admin\n\n"
        "Autenticación: JWT Bearer (`Authorization: Bearer <access>`)."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": r"/api",
    "TAGS": [
        {"name": "auth", "description": "Registro, login, JWT y recuperación"},
        {"name": "cursos", "description": "Catálogo, inscripción y navegación"},
        {"name": "progreso", "description": "Marcadores de progreso"},
        {"name": "evaluaciones", "description": "Quizzes Canvas y validación"},
        {"name": "analytics", "description": "Dashboard y exportación PDF"},
        {"name": "certificados", "description": "Emisión y verificación pública"},
        {"name": "instructor", "description": "Panel instructor"},
        {"name": "admin", "description": "Panel administración"},
    ],
    "SECURITY": [{"bearerAuth": []}],
    "APPEND_COMPONENTS": {
        "securitySchemes": {
            "bearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
            }
        }
    },
}

# --- JWT (autenticación segura) ---
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}

# --- Email (recuperación de cuenta) ---
# En desarrollo: consola. En producción: SMTP vía variables de entorno.
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() == "true"
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@edupath.local")
EMAIL_FILE_PATH = os.getenv("EMAIL_FILE_PATH", "")
PASSWORD_RESET_FRONTEND_URL = os.getenv(
    "PASSWORD_RESET_FRONTEND_URL",
    "http://localhost:5173/recuperar-cuenta",
)
PASSWORD_RESET_TIMEOUT = int(os.getenv("PASSWORD_RESET_TIMEOUT", "3600"))  # 1 hora

# Certificados: clave para firma HMAC (en prod usar KMS / secreto montado)
CERT_SIGNING_SECRET = os.getenv("CERT_SIGNING_SECRET", SECRET_KEY)
# URL pública de verificación (QR apunta aquí; puede ser frontend o API)
CERT_PUBLIC_VERIFY_URL = os.getenv(
    "CERT_PUBLIC_VERIFY_URL",
    "http://127.0.0.1:8000/api/certificados/verificar/{codigo}/",
)
CERT_FRONTEND_VERIFY_URL = os.getenv(
    "CERT_FRONTEND_VERIFY_URL",
    "http://localhost:5173/verificar/{codigo}",
)

# Legacy bridge
LEGACY_SYNC_API_KEY = os.getenv("LEGACY_SYNC_API_KEY", "legacy-dev-key")
