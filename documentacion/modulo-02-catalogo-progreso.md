# Módulo 2 — Catálogo, inscripción, navegación y progreso

Catálogo de cursos, inscripción, navegación por módulos/lecciones y marcadores de progreso.

## Endpoints

### Catálogo de cursos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/cursos/` | Público | Listado (solo `publicado`) |
| GET | `/api/cursos/{slug}/` | Público | Detalle + módulos/lecciones |
| POST | `/api/cursos/` | Instructor | Crear curso |
| PATCH/PUT/DELETE | `/api/cursos/{slug}/` | Instructor | Editar/eliminar |

Filtros: `?estado=&nivel=&instructor=&search=&ordering=`

Cada ítem incluye `inscrito: true/false` si hay JWT.

### Inscripción

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/cursos/{slug}/inscribir/` | JWT | Inscribirse (curso publicado) |
| POST | `/api/cursos/{slug}/cancelar-inscripcion/` | JWT | Cancelar inscripción |
| GET | `/api/inscripciones/` | JWT | Mis inscripciones |

```http
POST /api/cursos/introduccion-web/inscribir/
Authorization: Bearer <access>
```

### Navegación módulos / lecciones

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/cursos/{slug}/navegacion/` | JWT + inscrito | Árbol módulos→lecciones + progreso + prev/next |
| GET | `/api/cursos/{slug}/ruta-aprendizaje/` | Público* | Secuencia HATEOAS (+ progreso si hay JWT) |
| GET | `/api/modulos/?curso={id}` | Público | Módulos del curso |
| GET | `/api/lecciones/{id}/` | Público* | Lección + `_links` prev/next + marcador progreso |

\*El contenido publicado es legible; para **registrar** progreso hace falta inscripción.

### Marcadores de progreso

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/progreso/?curso={id\|slug}` | JWT | Progresos del usuario |
| GET | `/api/progreso/curso/{id\|slug}/` | JWT + inscrito | Resumen con todos los marcadores |
| POST | `/api/progreso/heartbeat/` | JWT + inscrito | Actualizar % / tiempo / estado |
| POST | `/api/progreso/completar/` | JWT + inscrito | Marcar lección completada (100%) |

#### Heartbeat

```http
POST /api/progreso/heartbeat/
Authorization: Bearer <access>
Content-Type: application/json

{
  "leccion_id": 1,
  "porcentaje": 45,
  "tiempo_segundos": 120,
  "estado": "en_progreso"
}
```

Respuesta incluye `curso_progreso_pct` (agregado de lecciones obligatorias).

#### Completar

```http
POST /api/progreso/completar/
{ "leccion_id": 1, "tiempo_segundos": 300 }
```

Estados de marcador: `no_iniciada` · `en_progreso` · `completada`.

Al llegar a 100% del curso, la inscripción pasa a `completada`.

## Flujo típico (estudiante)

1. `GET /api/cursos/` — ver catálogo  
2. `POST /api/cursos/{slug}/inscribir/` — inscribirse  
3. `GET /api/cursos/{slug}/navegacion/` — menú con marcadores  
4. `GET /api/lecciones/{id}/` — ver lección (prev/next)  
5. `POST /api/progreso/heartbeat/` o `/completar/` — actualizar marcador  
6. `GET /api/progreso/curso/{slug}/` — resumen del avance  
