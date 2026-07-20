# OpenAPI — Swagger y ReDoc

Documentación interactiva generada con **drf-spectacular**.

## URLs

| Vista | URL |
|-------|-----|
| Swagger UI | http://127.0.0.1:8000/api/docs/ |
| ReDoc | http://127.0.0.1:8000/api/redoc/ |
| Schema OpenAPI 3 | http://127.0.0.1:8000/api/schema/ |

## Uso

1. Arranca el backend: `python manage.py runserver`
2. Abre Swagger o ReDoc.
3. En Swagger: **Authorize** → `Bearer <access_token>` (tras `POST /api/auth/login/`).

## Dependencia

```bash
pip install "drf-spectacular>=0.27"
```

Configuración en `config/settings.py` (`SPECTACULAR_SETTINGS` + `DEFAULT_SCHEMA_CLASS`).
