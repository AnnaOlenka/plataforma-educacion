# Estructura de la base de datos

Modelo de datos del LMS (Django + PostgreSQL). Jerarquía principal:

**Usuario → Curso → Módulo → Lección**, con inscripciones, progreso, evaluaciones y certificados.

## Diagrama entidad-relación

```mermaid
erDiagram
    Usuario ||--o{ Curso : "imparte"
    Usuario ||--o{ Inscripcion : "tiene"
    Curso ||--o{ Inscripcion : "recibe"
    Curso ||--o{ Modulo : "contiene"
    Modulo ||--o{ Leccion : "contiene"
    Usuario ||--o{ ProgresoLeccion : "registra"
    Leccion ||--o{ ProgresoLeccion : "mide"
    Leccion ||--o| Evaluacion : "tiene"
    Evaluacion ||--o{ Pregunta : "incluye"
    Evaluacion ||--o{ IntentoEvaluacion : "genera"
    Usuario ||--o{ IntentoEvaluacion : "realiza"
    Usuario ||--o{ Certificado : "obtiene"
    Curso ||--o{ Certificado : "emite"

    Usuario {
        int id PK
        string username
        string password
        string email
        string first_name
        string last_name
        string rol
        string avatar
        text bio
        datetime fecha_registro
        bool is_staff
        bool is_active
        bool is_superuser
        datetime last_login
        datetime date_joined
    }

    Curso {
        int id PK
        string titulo
        string slug UK
        text descripcion
        int instructor_id FK
        string portada
        string estado
        string nivel
        datetime creado_en
        datetime actualizado_en
    }

    Modulo {
        int id PK
        int curso_id FK
        string titulo
        int orden
        text descripcion
    }

    Leccion {
        int id PK
        int modulo_id FK
        string titulo
        int orden
        string tipo
        text contenido
        int duracion_minutos
        bool es_obligatoria
    }

    Inscripcion {
        int id PK
        int estudiante_id FK
        int curso_id FK
        string estado
        datetime inscrito_en
        string origen
        decimal progreso_pct
    }

    ProgresoLeccion {
        int id PK
        int estudiante_id FK
        int leccion_id FK
        string estado
        int porcentaje
        int tiempo_segundos
        datetime actualizado_en
    }

    Evaluacion {
        int id PK
        int leccion_id FK
        string titulo
        int tiempo_limite_seg
        int puntaje_aprobacion
        json canvas_schema
        bool activo
    }

    Pregunta {
        int id PK
        int evaluacion_id FK
        text enunciado
        string tipo
        int orden
        int puntaje
        json opciones
        json respuesta_correcta
        json canvas_config
    }

    IntentoEvaluacion {
        int id PK
        int evaluacion_id FK
        int estudiante_id FK
        json respuestas
        json canvas_payload
        decimal puntaje
        bool aprobado
        datetime iniciado_en
        datetime finalizado_en
    }

    Certificado {
        int id PK
        uuid codigo UK
        int estudiante_id FK
        int curso_id FK
        datetime emitido_en
        string firma_hmac
        json metadata
        bool revocado
    }
```

---

## Relaciones

| Origen | Destino | Cardinalidad | Campo FK / vínculo | On delete |
|--------|---------|--------------|--------------------|-----------|
| Curso | Usuario (instructor) | N : 1 | `instructor_id` | PROTECT |
| Modulo | Curso | N : 1 | `curso_id` | CASCADE |
| Leccion | Modulo | N : 1 | `modulo_id` | CASCADE |
| Inscripcion | Usuario (estudiante) | N : 1 | `estudiante_id` | CASCADE |
| Inscripcion | Curso | N : 1 | `curso_id` | CASCADE |
| ProgresoLeccion | Usuario | N : 1 | `estudiante_id` | CASCADE |
| ProgresoLeccion | Leccion | N : 1 | `leccion_id` | CASCADE |
| Evaluacion | Leccion | 1 : 1 | `leccion_id` | CASCADE |
| Pregunta | Evaluacion | N : 1 | `evaluacion_id` | CASCADE |
| IntentoEvaluacion | Evaluacion | N : 1 | `evaluacion_id` | CASCADE |
| IntentoEvaluacion | Usuario | N : 1 | `estudiante_id` | CASCADE |
| Certificado | Usuario | N : 1 | `estudiante_id` | CASCADE |
| Certificado | Curso | N : 1 | `curso_id` | CASCADE |

### Unicidades

| Tabla | Constraint |
|-------|------------|
| Curso | `slug` único |
| Modulo | `(curso, orden)` único |
| Leccion | `(modulo, orden)` único |
| Inscripcion | `(estudiante, curso)` único |
| ProgresoLeccion | `(estudiante, leccion)` único |
| Certificado | `codigo` único · `(estudiante, curso)` único |

---

## Tablas y atributos

### Usuario
App: `usuarios` · Extiende `AbstractUser` de Django.

| Atributo | Tipo | Notas |
|----------|------|-------|
| id | PK (AutoField) | Automático |
| username | CharField | Heredado, único |
| password | CharField | Heredado (hash) |
| email | EmailField | **Único y obligatorio** (override del modelo) |
| first_name | CharField | Heredado |
| last_name | CharField | Heredado |
| is_staff | BooleanField | Heredado |
| is_active | BooleanField | Heredado |
| is_superuser | BooleanField | Heredado |
| last_login | DateTimeField | Heredado, nullable |
| date_joined | DateTimeField | Heredado |
| rol | CharField(20) | `estudiante` \| `instructor` \| `admin` |
| avatar | ImageField | nullable, `avatars/` |
| bio | TextField | opcional |
| fecha_registro | DateTimeField | auto_now_add |

### Curso
App: `cursos`

| Atributo | Tipo | Notas |
|----------|------|-------|
| id | PK | Automático |
| titulo | CharField(200) | |
| slug | SlugField | único; se genera desde el título |
| descripcion | TextField | |
| instructor_id | FK → Usuario | PROTECT |
| portada | ImageField | nullable, `cursos/` |
| estado | CharField(30) | `borrador` \| `pendiente_aprobacion` \| `publicado` \| `rechazado` \| `archivado` |
| nivel | CharField(50) | default `intermedio` |
| solicitado_en | DateTimeField | nullable |
| revisado_en | DateTimeField | nullable |
| revisado_por_id | FK → Usuario | nullable, SET_NULL |
| motivo_rechazo | TextField | |
| creado_en | DateTimeField | auto_now_add |
| actualizado_en | DateTimeField | auto_now |

### Modulo
App: `cursos`

| Atributo | Tipo | Notas |
|----------|------|-------|
| id | PK | Automático |
| curso_id | FK → Curso | CASCADE |
| titulo | CharField(200) | |
| orden | PositiveIntegerField | unique con curso |
| descripcion | TextField | opcional |

### Leccion
App: `cursos`

| Atributo | Tipo | Notas |
|----------|------|-------|
| id | PK | Automático |
| modulo_id | FK → Modulo | CASCADE |
| titulo | CharField(200) | |
| orden | PositiveIntegerField | unique con módulo |
| tipo | CharField(20) | `contenido` \| `video` \| `quiz` \| `recurso` |
| contenido | TextField | opcional |
| recurso_url | URLField | opcional |
| archivo | FileField | nullable, `lecciones/` |
| duracion_minutos | PositiveIntegerField | default 10 |
| es_obligatoria | BooleanField | default True |

### Inscripcion
App: `cursos`

| Atributo | Tipo | Notas |
|----------|------|-------|
| id | PK | Automático |
| estudiante_id | FK → Usuario | CASCADE |
| curso_id | FK → Curso | CASCADE |
| estado | CharField(20) | `activa` \| `completada` \| `cancelada` |
| inscrito_en | DateTimeField | auto_now_add |
| origen | CharField(20) | `web` \| `legacy_csv` \| `api` |
| progreso_pct | DecimalField(5,2) | default 0 |

### ProgresoLeccion
App: `progreso`

| Atributo | Tipo | Notas |
|----------|------|-------|
| id | PK | Automático |
| estudiante_id | FK → Usuario | CASCADE |
| leccion_id | FK → Leccion | CASCADE |
| estado | CharField(20) | `no_iniciada` \| `en_progreso` \| `completada` |
| porcentaje | PositiveIntegerField | default 0 |
| tiempo_segundos | PositiveIntegerField | default 0 |
| actualizado_en | DateTimeField | auto_now |

### Evaluacion
App: `evaluaciones`

| Atributo | Tipo | Notas |
|----------|------|-------|
| id | PK | Automático |
| leccion_id | OneToOne → Leccion | CASCADE |
| titulo | CharField(200) | |
| tiempo_limite_seg | PositiveIntegerField | default 600 |
| puntaje_aprobacion | PositiveIntegerField | default 70 |
| canvas_schema | JSONField | payload para Canvas SPA |
| activo | BooleanField | default True |

### Pregunta
App: `evaluaciones`

| Atributo | Tipo | Notas |
|----------|------|-------|
| id | PK | Automático |
| evaluacion_id | FK → Evaluacion | CASCADE |
| enunciado | TextField | |
| tipo | CharField(30) | `opcion_multiple` \| `verdadero_falso` \| `canvas_hotspot` \| `canvas_dibujo` |
| orden | PositiveIntegerField | |
| puntaje | PositiveIntegerField | default 1 |
| opciones | JSONField | lista |
| respuesta_correcta | JSONField | |
| canvas_config | JSONField | opcional |

### IntentoEvaluacion
App: `evaluaciones`

| Atributo | Tipo | Notas |
|----------|------|-------|
| id | PK | Automático |
| evaluacion_id | FK → Evaluacion | CASCADE |
| estudiante_id | FK → Usuario | CASCADE |
| respuestas | JSONField | |
| canvas_payload | JSONField | opcional |
| puntaje | DecimalField(5,2) | |
| puntaje_automatico | DecimalField(5,2) | auto-grader |
| aprobado | BooleanField | |
| estado | CharField | `en_curso` \| `finalizado` \| `pendiente_revision` \| `revisado` |
| feedback_instructor | TextField | |
| calificado_por_id | FK → Usuario | nullable |
| calificado_en | DateTimeField | nullable |
| iniciado_en | DateTimeField | auto_now_add |
| finalizado_en | DateTimeField | nullable |

### AuditLogCalificacion
App: `administracion`

| Atributo | Tipo | Notas |
|----------|------|-------|
| id | PK | Automático |
| intento_id | FK → IntentoEvaluacion | CASCADE |
| actor_id | FK → Usuario | SET_NULL |
| accion | CharField | `calificacion_manual` \| `ajuste` \| `revocacion` |
| puntaje_anterior / puntaje_nuevo | DecimalField | |
| aprobado_anterior / aprobado_nuevo | BooleanField | |
| feedback_anterior / feedback_nuevo | TextField | |
| detalle_anterior / detalle_nuevo | JSONField | |
| motivo | TextField | |
| creado_en | DateTimeField | auto_now_add |

### Certificado
App: `certificados`

| Atributo | Tipo | Notas |
|----------|------|-------|
| id | PK | Automático |
| codigo | UUIDField | único, no editable |
| estudiante_id | FK → Usuario | CASCADE |
| curso_id | FK → Curso | CASCADE |
| emitido_en | DateTimeField | |
| firma_hmac | CharField(128) | HMAC-SHA256 |
| metadata | JSONField | opcional |
| revocado | BooleanField | default False |

---

## Notas

- Motor: PostgreSQL
- Definición fuente: modelos en `backend/apps/*/models.py`.
