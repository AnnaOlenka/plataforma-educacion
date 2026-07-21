# Módulo 4 — Dashboard de progreso y exportación PDF

Métricas de avance (% completado, tiempo, desempeño) y descarga en PDF.

## Endpoints estudiante

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/analytics/dashboard/` | Dashboard general del estudiante |
| GET | `/api/analytics/dashboard/curso/{slug}/` | Métricas de un curso |
| GET | `/api/analytics/dashboard/exportar.pdf` | PDF del dashboard general |
| GET | `/api/analytics/dashboard/curso/{slug}/exportar.pdf` | PDF de un curso |

Requiere JWT. El detalle por curso exige inscripción activa (o ser instructor/admin).

## Endpoints instructor

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/analytics/instructor/` | Agregados por curso impartido |
| GET | `/api/analytics/instructor/exportar.pdf` | PDF del panel instructor |

## Métricas incluidas

### Resumen (`resumen`)

| Campo | Significado |
|-------|-------------|
| `porcentaje_completado` | % de avance (promedio de inscripciones o del curso) |
| `lecciones_completadas` / `lecciones_totales` | Marcadores obligatorios |
| `lecciones_en_progreso` | Lecciones iniciadas sin completar |
| `tiempo_segundos` / `tiempo_formato` | Tiempo acumulado de estudio |
| `desempeno.promedio_puntaje` | Promedio de intentos de evaluación |
| `desempeno.intentos` / `aprobados` | Volumen y éxitos |
| `desempeno.tasa_aprobacion_pct` | % de intentos aprobados |

### Por curso (`cursos[]`)

- `% completado`, tiempo, desempeño promedio, estado de inscripción, lecciones hechas/total.

## Ejemplo JSON

```http
GET /api/analytics/dashboard/
Authorization: Bearer <access>
```

```json
{
  "estudiante": { "id": 2, "username": "estudiante", "nombre": "Esteban Vega" },
  "resumen": {
    "porcentaje_completado": 50.0,
    "lecciones_completadas": 1,
    "lecciones_totales": 2,
    "tiempo_segundos": 120,
    "tiempo_formato": "2m 00s",
    "desempeno": {
      "promedio_puntaje": 100.0,
      "intentos": 1,
      "aprobados": 1,
      "tasa_aprobacion_pct": 100.0
    }
  },
  "cursos": [ ... ]
}
```

## Exportación PDF

```http
GET /api/analytics/dashboard/exportar.pdf
Authorization: Bearer <access>
```

Respuesta: `application/pdf` con `Content-Disposition: attachment`.

El PDF incluye tabla de resumen (% / tiempo / desempeño) y detalle por curso.

## Dependencia

```bash
pip install reportlab>=4.2
```

Ya está en `backend/requirements.txt`.
