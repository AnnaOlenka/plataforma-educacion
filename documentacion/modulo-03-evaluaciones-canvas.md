# Módulo 3 — Evaluaciones interactivas Canvas

Arrastrar, seleccionar y validación en tiempo real (backend).

## Tipos de pregunta

| Tipo | Uso en Canvas |
|------|----------------|
| `canvas_hotspot` | Seleccionar zona (click / hotspot) |
| `canvas_arrastrar` | Arrastrar ítems a targets |
| `canvas_dibujo` | Trazar / marcar región |
| `opcion_multiple` | Selección clásica |
| `verdadero_falso` | Booleano |

Las respuestas correctas **nunca** se envían al estudiante en el GET.

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/evaluaciones/` | Público* | Listado activas |
| GET | `/api/evaluaciones/{id}/` | Público* | Schema + preguntas (sin claves) |
| GET | `/api/lecciones/{id}/evaluacion/` | Público* | Por lección (HATEOAS) |
| POST | `/api/evaluaciones/` | Instructor | Crear evaluación + preguntas |
| PATCH | `/api/evaluaciones/{id}/` | Instructor | Actualizar |
| POST | `/api/evaluaciones/{id}/iniciar/` | JWT + inscrito | Abre intento `en_curso` |
| POST | `/api/evaluaciones/{id}/validar/` | JWT + inscrito | **Validación en tiempo real** |
| POST | `/api/evaluaciones/{id}/enviar/` | JWT + inscrito | Calificación final |
| GET | `/api/evaluaciones/{id}/intentos/` | JWT | Historial del estudiante |

\*Lectura de activas; escritura solo instructor.

## Flujo Canvas (estudiante)

1. `GET /api/lecciones/{id}/evaluacion/` → `canvas_schema` + preguntas + `canvas_config`
2. `POST .../iniciar/` → `intento_id` + `tiempo_limite_seg`
3. En cada interacción: `POST .../validar/` (feedback inmediato)
4. Al terminar: `POST .../enviar/` con todas las respuestas

### Validación en tiempo real

```http
POST /api/evaluaciones/1/validar/
Authorization: Bearer <access>

# Seleccionar hotspot
{
  "pregunta_id": 1,
  "canvas_payload": { "hotspot_id": "b" }
}

# O por coordenadas (hit-test en servidor)
{
  "pregunta_id": 1,
  "canvas_payload": { "x": 320, "y": 160 }
}

# Arrastrar
{
  "pregunta_id": 2,
  "respuesta": {
    "asignaciones": { "html": "markup", "css": "estilo" }
  }
}
```

Respuesta:

```json
{
  "pregunta_id": 1,
  "correcta": true,
  "feedback": "Correcto: Zona B seleccionada.",
  "puntaje": 40,
  "puntaje_max": 40,
  "detalle": { "tipo": "canvas_hotspot", "hotspot_id": "b" },
  "validacion_tiempo_real": true
}
```

### Envío final

```http
POST /api/evaluaciones/1/enviar/
{
  "intento_id": 5,
  "respuestas": {
    "3": true
  },
  "canvas_payload": {
    "1": { "hotspot_id": "b" },
    "2": { "asignaciones": { "html": "markup", "css": "estilo" } }
  }
}
```

Devuelve `puntaje`, `aprobado`, `detalle_calificacion[]` por pregunta.

## Contratos de datos Canvas

### `canvas_schema` (evaluación)

```json
{
  "width": 640,
  "height": 360,
  "background": "#0f172a",
  "hotspots": [{ "id": "b", "x": 320, "y": 160, "r": 36, "label": "Zona B" }],
  "items": [{ "id": "html", "label": "HTML", "x": 40, "y": 40 }],
  "targets": [{ "id": "markup", "label": "Marcato", "x": 400, "y": 40, "w": 160, "h": 48 }]
}
```

### `respuesta_correcta` (solo servidor / instructor)

- Hotspot: `{ "hotspot_id": "b" }`
- Arrastrar: `{ "asignaciones": { "html": "markup", "css": "estilo" } }`
- Dibujo: `{ "region_id": "zona1" }`
- V/F u opción: `{ "valor": true }` o `{ "valor": "opcion_a" }`

### `canvas_config` (por pregunta, visible al SPA)

Incluye `items`, `targets`, `hotspots`, `regiones`, `feedback_ok`, `feedback_fail`.

## Demo (`seed_demo`)

Curso `introduccion-web` · lección quiz con 3 preguntas:

1. Seleccionar Zona B (`canvas_hotspot`)
2. Arrastrar HTML/CSS (`canvas_arrastrar`)
3. Verdadero/Falso sobre Canvas

```bash
python manage.py migrate
python manage.py seed_demo
```
