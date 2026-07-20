# TRABAJO FINAL DESARROLLO WEB

## Integrantes

- Alarcón Mendoza Estiven Rodrigo
- Calderon Leiva Anna Olenka
- Cruz Cruz Alexander Jhon
- Espiritu Diaz Olayne Guadalupe Maria Isabel
- LLanos Lozano Ricador Alexander
- Martinez Casas Crithian Emilio

## Cómo iniciar el backend

### 1. Levantar PostgreSQL

```bash
docker compose up -d db
```

Credenciales (`.env`): `edupath` / `edupath` · host `127.0.0.1` · puerto `5433`.

### 2. Configurar el entorno Python

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env   # Linux / macOS
```

### 3. Migrar, sembrar datos y correr el servidor

```bash
python manage.py check_db
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

El API queda en `http://127.0.0.1:8000/`.

Documentación OpenAPI:

- Swagger UI: `http://127.0.0.1:8000/api/docs/`
- ReDoc: `http://127.0.0.1:8000/api/redoc/`
- Schema JSON: `http://127.0.0.1:8000/api/schema/`

### Usuarios demo (`seed_demo`)

- Admin: `admin` / `admin123`
- Instructor: `instructor` / `instructor123`
- Estudiante: `estudiante` / `estudiante123`
- Curso: `introduccion-web`
