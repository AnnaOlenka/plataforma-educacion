# TRABAJO FINAL DESARROLLO WEB

## Integrantes

- Alarcón Mendoza Estiven Rodrigo
- Calderon Leiva Anna Olenka
- Cruz Cruz Alexander Jhon
- Espiritu Diaz Olayne Guadalupe Maria Isabel
- LLanos Lozano Ricador Alexander
- Martinez Casas Crithian Emilio

## Arranque local (desarrollo)

### PostgreSQL

```bash
docker compose up -d db
cd backend
# Windows: .venv\Scripts\activate
python manage.py check_db   # evalúa la conexión
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Credenciales (`.env`): `edupath` / `edupath` · host `127.0.0.1` · puerto `5433`.

### Frontend



### Usuarios demo (`seed_demo`)

- Instructor: `instructor` / `instructor123`
- Estudiante: `estudiante` / `estudiante123`
- Curso: `introduccion-web`

## Endpoints clave

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login/` | JWT |
| GET | `/api/cursos/{slug}/ruta-aprendizaje/` | HATEOAS learning path |
| GET | `/api/modulos/` | Paginación por módulo |
| POST | `/api/progreso/heartbeat/` | Tracker en tiempo casi-real |
| POST | `/api/evaluaciones/{id}/enviar/` | Quiz + throttle `evaluacion` |
| GET | `/api/certificados/verificar/{uuid}/` | Verificación HMAC pública |
| GET | `/api/analytics/instructor/` | Panel instructor |
| POST | `/api/legacy/enrollment-sync/` | Puente JSP (header `X-Legacy-Api-Key`) |

## Docker Compose

```bash
docker compose up -d db              # solo Postgres
docker compose --profile full up -d  # db + backend
```

## Kubernetes

```bash
kubectl apply -f k8s/namespace-config.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

Incluye:

- **readinessProbe** `/readyz/` y **livenessProbe** `/healthz/`
- **HPA** 2–10 réplicas (CPU 60% / memoria 70%)
- **Ingress** rutas `/`, `/api`, `/admin`, `/metrics`
- Anotaciones Prometheus + `ServiceMonitor`

## Legacy CSV

1. Despliega `legacy/legacy-enrollment.jsp` en un contenedor servlet (Tomcat).
2. Sube `legacy/sample-enrollments.csv`.
3. El JSP POSTea el lote a Django con `X-Legacy-Api-Key`.

## Estándares y accesibilidad (base)

- Skip link, labels, `aria-live` en progreso y Canvas.
- Contraste y foco visible (Tailwind + focus rings).
- Ruta de aprendizaje hipermedia (HATEOAS) alineada a navegación secuencial tipo SCORM/xAPI-ready.
- Certificados firmados HMAC-SHA256 verificables públicamente.

## Siguiente iteración sugerida

- WebSockets / SSE para progreso push real.
- Firma de certificados con clave asimétrica (KMS).
- Empaquetado WAR del JSP con `@MultipartConfig`.
- Tests e2e (Playwright) en picos de evaluación.
