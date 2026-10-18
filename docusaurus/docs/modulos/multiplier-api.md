---
id: multiplier-api
title: API de Multiplicador y Auditoría
sidebar_label: Multiplier API (multiplier_api/)
---

# API de Multiplicador y Tarifas (`services/multiplier_api/`)

Microservicio REST desarrollado en **FastAPI** encargado de entregar el multiplicador de tarifa vigente por zona, gestionar el ciclo de vida de cotización de viajes (`POST /trip-requests`, `POST /assign`, `POST /cancel`) y garantizar la trazabilidad regulatoria inmutable (`GET /audit/{trip_id}`).

---

## 1. Arquitectura en Capas

El servicio sigue estrictamente el patrón de dependencias unidireccionales:
`routers` ➔ `services` ➔ `repositories` ➔ `models`

```mermaid
flowchart TD
    Router["app/routers/ (Controladores HTTP & Status)"] --> Service["app/services/ (Reglas Puras & Fallbacks)"]
    Service --> Repo["app/repositories/ (Consultas SQLAlchemy)"]
    Repo --> Model["app/models/ (Clases ORM Base)"]
    Router -.-> Schema["app/schemas/ (Validación Pydantic In/Out)"]
```

* **`routers/`**: Maneja peticiones HTTP, validación de parámetros (Path/Query/Headers) y códigos de estado.
* **`services/`**: Aplica reglas de tarificación (`RN-01`), cálculo de recargos (`RN-04`), congelamiento de tarifas (`RN-07`) y degradación segura (`RNF-04`).
* **`repositories/`**: Consultas directas asíncronas de lectura/escritura en PostgreSQL con SQLAlchemy.
* **`models/`**: Clases ORM mapeadas a las tablas `trip_requests`, `fare_audit`, `zone_state`, `zones`, `weather_current` y `tariff_rule_versions`.
* **`schemas/`**: Modelos Pydantic para serialización y validación estricta de payloads JSON.

---

## 2. Catálogo de Endpoints

| Método | Ruta | Actor / Uso | Descripción | Respuesta Exitosa |
|---|---|---|---|:---:|
| `GET` | `/health` | Kubernetes / Ops | Sonda de vida y salud del contenedor | `{"status": "ok"}` (200) |
| `GET` | `/zones` | Apps / Frontend | Lista todas las zonas registradas | `[{"zone_id": 1, ...}]` (200) |
| `GET` | `/zones/{zone_id}/multiplier` | Apps / Pasajeros | Multiplicador dinámico vigente de la zona | `{"multiplier": 1.25, ...}` (200) |
| `POST` | `/trip-requests` | Pasajeros / Simulator | Cotiza viaje, fija tarifa congelada y audita | `{"trip_id": "...", ...}` (200) |
| `POST` | `/assign` | Dispatcher / Conductores | Asigna un vehículo al viaje cotizado | `{"status": "assigned", ...}` (200) |
| `POST` | `/cancel` | Pasajeros / Conductor | Cancela una solicitud de viaje | `{"status": "cancelled", ...}` (200) |
| `GET` | `/audit/{trip_id}` | Auditoría Regulatoria | Reconstruye la auditoría inmutable del viaje | `{"fare_audit_id": 1, ...}` (200) |

---

## 3. Ejemplos de Uso (cURL)

### 3.1 Cotización de Viaje (`POST /trip-requests`)
Calcula la tarifa base ($1.50 + $0.35/km + $0.15/min), lee el multiplicador de `zone_state` y registra la auditoría atómica:

```bash
curl -X POST http://localhost:8000/trip-requests \
  -H "Content-Type: application/json" \
  -d '{
    "passenger_id": "00000000-0000-0000-0000-000000000001",
    "origin_zone_id": 1,
    "destination_zone_id": 2,
    "estimated_distance_km": 8.0,
    "estimated_duration_min": 20.0
  }'
```

**Respuesta Exitosa (200 OK):**
```json
{
  "trip_id": "e8f002d1-2f3b-48da-b924-a1db48d5d4cf",
  "status": "quoted",
  "origin_zone_id": 1,
  "destination_zone_id": 2,
  "base_fare": 7.30,
  "dynamic_multiplier": 1.35,
  "final_fare": 9.86,
  "is_degraded": false,
  "currency": "USD"
}
```

---

### 3.2 Auditoría Inmutable de Tarifa (`GET /audit/{trip_id}`)
Cumplimiento estricto de **RNF-06**: exige cabeceras de rol administrativo para proteger información estratégica de la plataforma.

```bash
curl -X GET http://localhost:8000/audit/e8f002d1-2f3b-48da-b924-a1db48d5d4cf \
  -H "X-User-Role: auditor" \
  -H "X-Audit-Token: audit-secret-token"
```

**Respuesta Exitosa (200 OK):**
```json
{
  "fare_audit_id": 1042,
  "trip_id": "e8f002d1-2f3b-48da-b924-a1db48d5d4cf",
  "calculated_multiplier": 1.35,
  "applied_multiplier": 1.35,
  "base_fare": 7.30,
  "final_fare": 9.86,
  "pressure_index": 1.82,
  "rain_mm_h": 2.4,
  "traffic_level": "heavy",
  "special_event_id": null,
  "is_emergency_active": false,
  "is_price_capped": false,
  "rule_version_id": 1,
  "created_at": "2026-10-18T20:30:00Z"
}
```

*Si no se envían las cabeceras requeridas, el endpoint responde `403 Forbidden` (`{"detail": "Acceso denegado: rol de auditor requerido (RNF-06)"}`).*

---

## 4. Política de Degradación Segura (RNF-04)

Si la consulta a PostgreSQL de la tabla `zone_state` experimenta latencia o la zona no tiene un estado calculado reciente:
* La API **nunca responde con error 500**.
* Devuelve un multiplicador neutro **`1.0`** con la bandera **`is_degraded: true`**.
* La respuesta se entrega en **menos de 5 ms** cumpliendo el límite de latencia p95 de **RNF-01**.
