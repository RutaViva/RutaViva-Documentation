---
id: guia-e-integridad-del-sistema
title: Guía de Puesta en Marcha Rápida
sidebar_label: Puesta en Marcha
---

## Guía de Comprobación de Integridad del Sistema

Sigue estos 4 pasos para verificar que todo el ecosistema está operando correctamente:

### 1. Ejecución de la Suite de Pruebas Automáticas
Corre las pruebas unitarias y de integración que validan límites regulatorios, orden de factores y seguridad:
```bash
uv run pytest services/ -v
```
> **Resultado esperado:** `14 passed` sin errores.

### 2. Verificar Flujo de Mensajes en RabbitMQ
Ingresa a [http://localhost:15672](http://localhost:15672) (credenciales: `admin` / `admin1234`).
* En la sección **Queues**, la cola `pressure_worker_queue` debe mostrar actividad constante de mensajes consumidos (*ack* en tiempo real).

### 3. Verificar el Estado Precomputado de Zonas (`zone_state`)
Consulta la base de datos para confirmar que el worker actualiza las zonas:
```bash
docker compose exec db psql -U postgres -d rutaviva -c \
  "SELECT zone_id, dynamic_multiplier, pressure_index, available_vehicles, demand_requests, last_updated_at FROM zone_state ORDER BY zone_id ASC LIMIT 5;"
```
* Los valores de `dynamic_multiplier` deben encontrarse en el rango legal $[1.0, 3.0]$.

### 4. Prueba Transaccional Completa (Cotización y Auditoría)

**Paso A: Cotizar un viaje con la API**
```bash
curl -s -X POST http://localhost:8000/trip-requests \
  -H "Content-Type: application/json" \
  -d '{
    "passenger_id": "00000000-0000-0000-0000-000000000001",
    "origin_zone_id": 1,
    "destination_zone_id": 2,
    "estimated_distance_km": 7.5,
    "estimated_duration_min": 18.0
  }'
```
*Verifica que devuelva `status: "quoted"`, `is_degraded: false` y un `trip_id`.*

**Paso B: Consultar la Auditoría Inmutable (RNF-06)**
Usa el `trip_id` obtenido para validar la trazabilidad del cálculo:
```bash
curl -s -X GET http://localhost:8000/audit/<TU_TRIP_ID> \
  -H "X-User-Role: auditor" \
  -H "X-Audit-Token: audit-secret-token"
```
*Verifica que devuelva el desglose exacto de tarifa base, factores aplicados y versión de tarifa.*
