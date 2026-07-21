# Módulo 7 — Panel admin

Aprobación de cursos, gestión de usuarios y auditoría de calificaciones.

Base: `/api/admin/` (rol `admin` o superusuario).

## Resumen

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/panel/` | Contadores + enlaces |
| GET/PATCH/DELETE | `/api/admin/usuarios/` | Gestión de usuarios |
| GET | `/api/admin/cursos/` | Cursos (filtro `?estado=`) |
| POST | `/api/admin/cursos/{slug}/aprobar/` | Publicar |
| POST | `/api/admin/cursos/{slug}/rechazar/` | Rechazar (motivo) |
| POST | `/api/admin/cursos/{slug}/archivar/` | Archivar |
| GET | `/api/admin/auditoria/calificaciones/` | Historial de cambios de nota |

Alias legacy (sigue activo): `/api/auth/users/`.

## Flujo de aprobación de cursos

Estados: `borrador` → `pendiente_aprobacion` → `publicado` | `rechazado` → `archivado`

1. Instructor crea curso (siempre `borrador`; no puede auto-publicar).
2. `POST /api/instructor/cursos/{slug}/solicitar-aprobacion/`
3. Admin aprueba o rechaza.

```http
POST /api/admin/cursos/introduccion-web/aprobar/
Authorization: Bearer <admin>

POST /api/admin/cursos/mi-curso/rechazar/
{ "motivo": "Falta contenido en el módulo 2" }
```

## Gestión de usuarios

```http
GET /api/admin/usuarios/?rol=estudiante&is_active=true&search=ana
PATCH /api/admin/usuarios/5/
{ "rol": "instructor", "is_active": true }
DELETE /api/admin/usuarios/5/   # desactiva (soft)
```

No puedes desactivar/borrar tu propia cuenta.

## Auditoría de calificaciones

Cada `POST /api/instructor/intentos/{id}/calificar/` genera un `AuditLogCalificacion` con:
- puntaje/aprobado/feedback anterior y nuevo
- actor, intento, motivo, timestamp

```http
GET /api/admin/auditoria/calificaciones/?curso=introduccion-web
```

## Demo

```bash
python manage.py migrate
python manage.py seed_demo
```

Credenciales: `admin` / `admin123`

## Limpieza realizada

- Removido permiso muerto `EsInstructorOAdmin`
- `/me` ya no permite cambiar `is_active` ni `rol`
- Publicación de cursos centralizada en admin (instructores solo solicitan aprobación)
- App `transporte` vacía eliminada (si existía)
- Se mantiene legacy JSP (alcance del proyecto)
