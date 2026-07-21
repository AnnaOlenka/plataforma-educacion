# Módulo 6 — Panel instructor

Carga de contenido, creación de quizzes, calificación manual y analíticas.

Base: `/api/instructor/` (requiere rol instructor o admin).

## Resumen del panel

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/instructor/panel/` | Resumen + pendientes + enlaces |
| GET | `/api/instructor/cursos/` | Mis cursos |
| GET | `/api/instructor/analytics/cursos/{slug}/` | Analíticas detalladas del curso |

## 1. Carga de contenido

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/instructor/modulos/` | Listar / crear módulos |
| GET/PATCH/DELETE | `/api/instructor/modulos/{id}/` | Editar módulo |
| GET/POST | `/api/instructor/lecciones/` | Listar / crear lecciones |
| GET/PATCH/DELETE | `/api/instructor/lecciones/{id}/` | Editar lección |
| POST | `/api/instructor/lecciones/{id}/subir-archivo/` | Multipart: `archivo` (+ `recurso_url`) |

Campos de lección nuevos: `recurso_url`, `archivo`.

También sigue disponible el CRUD público/instructor en `/api/cursos/` y `/api/lecciones/`.

```http
POST /api/instructor/modulos/
Authorization: Bearer <instructor>
{ "curso": 1, "titulo": "Módulo 2", "orden": 2, "descripcion": "CSS" }

POST /api/instructor/lecciones/
{ "modulo": 2, "titulo": "Flexbox", "orden": 1, "tipo": "contenido", "contenido": "..." }

POST /api/instructor/lecciones/5/subir-archivo/
Content-Type: multipart/form-data
archivo: <file>
recurso_url: https://youtube.com/...
```

## 2. Creación de quizzes

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/instructor/evaluaciones/` | Crear quiz (+ preguntas anidadas) |
| GET/PATCH/DELETE | `/api/instructor/evaluaciones/{id}/` | Editar quiz |
| GET/POST | `/api/instructor/preguntas/` | CRUD granular de preguntas |
| GET/PATCH/DELETE | `/api/instructor/preguntas/{id}/` | Editar pregunta |

```http
POST /api/instructor/evaluaciones/
{
  "leccion": 2,
  "titulo": "Quiz CSS",
  "puntaje_aprobacion": 70,
  "canvas_schema": { "width": 640, "height": 360 },
  "preguntas": [
    {
      "enunciado": "Selecciona la zona correcta",
      "tipo": "canvas_hotspot",
      "orden": 1,
      "puntaje": 50,
      "respuesta_correcta": { "hotspot_id": "b" },
      "canvas_config": { "hotspots": [], "feedback_ok": "Bien" }
    }
  ]
}
```

Tipos: `opcion_multiple`, `verdadero_falso`, `canvas_hotspot`, `canvas_arrastrar`, `canvas_dibujo`.

Si hay preguntas `canvas_dibujo`, el intento del estudiante queda en `pendiente_revision`.

## 3. Calificación manual

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/instructor/intentos/` | Intentos de mis cursos |
| GET | `/api/instructor/intentos/?pendientes=1` | Solo pendientes de revisión |
| GET | `/api/instructor/intentos/?curso={slug}` | Filtrar por curso |
| GET | `/api/instructor/intentos/{id}/` | Detalle (respuestas + canvas) |
| POST/PATCH | `/api/instructor/intentos/{id}/calificar/` | Calificación manual |

```http
POST /api/instructor/intentos/3/calificar/
{
  "puntaje": 85,
  "aprobado": true,
  "feedback_instructor": "Buen trazo; revisa el margen.",
  "detalle_calificacion": [
    { "pregunta_id": 4, "puntaje": 40, "feedback": "OK parcial" }
  ]
}
```

Campos en intento: `puntaje_automatico`, `puntaje`, `feedback_instructor`, `calificado_por`, `calificado_en`, estados `pendiente_revision` / `revisado`.

## 4. Analíticas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/instructor/panel/` | Agregado general |
| GET | `/api/instructor/analytics/cursos/{slug}/` | Estudiantes + evaluaciones del curso |
| GET | `/api/analytics/instructor/` | Dashboard legacy/ampliado |
| GET | `/api/analytics/instructor/exportar.pdf` | PDF instructor |

La analítica por curso incluye: inscritos, % progreso, tiempo, desempeño, pendientes de revisión, lista de estudiantes y resumen por evaluación.

## Migraciones

```bash
python manage.py migrate
```

Incluye `cursos.0003` (archivo/recurso) y `evaluaciones.0004` (calificación manual).
