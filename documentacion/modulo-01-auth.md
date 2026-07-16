# Módulo 1 — Autenticación y cuentas

Registro por rol, autenticación JWT segura y recuperación de cuenta.

## Endpoints

Base: `/api/auth/`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/register/` | Público | Registro como `estudiante` o `instructor` |
| POST | `/register/admin/` | Admin | Crear usuario con rol `admin` |
| POST | `/login/` | Público | Login (username **o** email) → JWT + perfil |
| POST | `/logout/` | JWT | Revoca refresh token (blacklist) |
| POST | `/refresh/` | Público | Renueva access (rota refresh) |
| GET | `/me/` | JWT | Perfil actual |
| PATCH | `/me/` | JWT | Actualizar perfil (no cambia `rol`) |
| POST | `/change-password/` | JWT | Cambiar contraseña (sesión activa) |
| POST | `/password-reset/` | Público | Solicitar recuperación por email |
| POST | `/password-reset/confirm/` | Público | Confirmar nueva contraseña con uid+token |

## Registro por rol

### Público (`estudiante` | `instructor`)

```http
POST /api/auth/register/
Content-Type: application/json

{
  "username": "ana",
  "email": "ana@ejemplo.com",
  "password": "ClaveSegura1",
  "password_confirm": "ClaveSegura1",
  "first_name": "Ana",
  "last_name": "Pérez",
  "rol": "estudiante"
}
```

- `rol` solo acepta `estudiante` o `instructor`.
- `admin` **no** se puede autoasignar.
- Email único y obligatorio; contraseña pasa por validadores de Django.

### Admin (solo otro admin)

```http
POST /api/auth/register/admin/
Authorization: Bearer <access_admin>
```

Cuerpo igual al registro, con `rol: "admin"` (se fuerza). Marca `is_staff=True`.

Alternativa local: `python manage.py createsuperuser`.

## Login seguro

```http
POST /api/auth/login/

{ "username": "ana", "password": "ClaveSegura1" }
// o
{ "email": "ana@ejemplo.com", "password": "ClaveSegura1" }
```

Respuesta:

```json
{
  "access": "...",
  "refresh": "...",
  "user": { "id": 1, "username": "ana", "rol": "estudiante", "...": "..." }
}
```

Usar header: `Authorization: Bearer <access>`.

### Medidas de seguridad

- Contraseñas hasheadas (`set_password`).
- Access token 30 min; refresh 7 días.
- Rotación de refresh + blacklist al rotar / al logout.
- Throttle auth anónimo: 10/min; reset password: 5/min.
- `rol` no editable vía `/me/`.

## Recuperación de cuenta

1. Solicitar:

```http
POST /api/auth/password-reset/
{ "email": "ana@ejemplo.com" }
```

Siempre responde el mismo mensaje (anti-enumeración). En local el correo sale en la consola del servidor.

2. Confirmar:

```http
POST /api/auth/password-reset/confirm/
{
  "uid": "...",
  "token": "...",
  "new_password": "NuevaClaveSegura1",
  "new_password_confirm": "NuevaClaveSegura1"
}
```

Token válido ~1 hora (`PASSWORD_RESET_TIMEOUT`).

## Migraciones necesarias

```bash
cd backend
python manage.py migrate
```

Incluye `usuarios.0002` (email único) y tablas de `token_blacklist`.
