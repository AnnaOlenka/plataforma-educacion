# Módulo 5 — Certificados digitales (hash + QR)

Generación con firma HMAC-SHA256, código QR y verificación pública **sin login**.

## Endpoints

### Autenticados (estudiante)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/certificados/` | Mis certificados |
| GET | `/api/certificados/{codigo}/` | Detalle |
| POST | `/api/certificados/emitir/{curso_id\|slug}/` | Emitir si progreso = 100% |
| GET | `/api/certificados/{codigo}/pdf/` | PDF con hash + QR |
| GET | `/api/certificados/{codigo}/qr/` | PNG del QR |

### Públicos (sin login)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/certificados/verificar/{codigo}/` | Verificación criptográfica |
| GET | `/api/certificados/verificar/{codigo}/qr.png` | Imagen QR pública |
| POST | `/api/certificados/verificar/` | Verificar por `codigo` / `hash_hmac` / `hash_corto` |

## Emisión

```http
POST /api/certificados/emitir/introduccion-web/
Authorization: Bearer <access>
```

Requisitos:
- Inscripción no cancelada
- Progreso del curso al **100%** (recalculado al emitir)

Respuesta incluye:
- `codigo` (UUID)
- `firma_hmac` / `hash_hmac` (HMAC-SHA256 hex)
- `hash_corto` (12 chars)
- `url_verificacion`, `url_qr`, `url_pdf`
- `valido`

## Verificación pública

```http
GET /api/certificados/verificar/<uuid>/
```

No requiere `Authorization`. Respuesta:

```json
{
  "valido": true,
  "codigo": "...",
  "estudiante": "Esteban Vega",
  "curso": "Introducción al Desarrollo Web",
  "hash_hmac": "a1b2c3...",
  "hash_corto": "A1B2C3D4E5F6",
  "firma_integra": true,
  "revocado": false,
  "algoritmo": "HMAC-SHA256",
  "url_qr": "http://127.0.0.1:8000/api/certificados/verificar/.../qr.png",
  "mensaje": "Certificado válido"
}
```

Por hash:

```http
POST /api/certificados/verificar/
Content-Type: application/json

{ "hash_hmac": "a1b2c3..." }
```

## Seguridad

- Payload firmado: `codigo|estudiante_id|curso_id|emitido_en`
- Algoritmo: **HMAC-SHA256** con `CERT_SIGNING_SECRET`
- Comparación con `hmac.compare_digest` (anti-timing)
- Certificados `revocado=true` → `valido: false`
- El QR apunta a la URL pública de verificación (frontend o API)

## Variables de entorno

```env
CERT_SIGNING_SECRET=cert-hmac-dev-secret
CERT_PUBLIC_VERIFY_URL=http://127.0.0.1:8000/api/certificados/verificar/{codigo}/
CERT_FRONTEND_VERIFY_URL=http://localhost:5173/verificar/{codigo}
```

## Dependencias

```bash
pip install "qrcode[pil]>=7.4" "reportlab>=4.2"
```
