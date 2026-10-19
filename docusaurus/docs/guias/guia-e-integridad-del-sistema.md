---
id: guia-e-integridad-del-sistema
title: Guía de Comprobación de Integridad del Sistema
sidebar_label: Integridad del Sistema
---

# Guía de Comprobación de Integridad del Sistema

Sigue estos 5 pasos para verificar que todo el ecosistema de **RutaViva** está operando correctamente de punta a punta, sin errores de concurrencia ni brechas en la auditoría inmutable.

---

## 1. Ejecución de la Suite de Pruebas Automáticas
Corre las pruebas unitarias y de integración que validan límites regulatorios, orden de factores y seguridad:
```bash
uv run pytest services/ -v
```
> **Resultado esperado:** Todas las pruebas pasan exitosamente (`14 passed`).

---

## 2. Verificar Flujo de Mensajes en RabbitMQ
Ingresa a la consola web en [http://localhost:15672](http://localhost:15672) (credenciales: `admin` / `admin1234`).
* En la sección **Queues**, la cola `telemetria.vehiculos` debe mostrar flujo activo de mensajes generados por el simulador de telemetría y consumidos por el worker de presión (*ack* en tiempo real).

---

## 3. Verificar el Estado Precomputado de Zonas (`zone_state`)
Consulta la base de datos para confirmar que el worker actualiza las 265 zonas de NYC con su oferta y demanda:
```bash
docker exec rutaviva_postgres psql -U admin -d rutaviva_db -c \
  "SELECT zone_id, multiplier, pressure_index, free_vehicles, requests_last_10min, computed_at FROM zone_state ORDER BY zone_id ASC LIMIT 5;"
```
* Los valores de `multiplier` deben encontrarse en el rango legal $[1.0, 2.0]$ (o máximo $1.5$ en horario nocturno según RN-05).

---

## 4. Prueba Transaccional Completa (Cotización, Creación y Cancelación)

### Paso A: Cotizar y Crear una Solicitud de Viaje (F5, RN-07)
Envía una solicitud para una zona concurrida (ej. Zona 161 - Midtown Manhattan):
```bash
curl -s -X POST http://localhost:8000/trip-requests \
  -H "Content-Type: application/json" \
  -d '{
    "zone_id": 161,
    "base_fare": 20.0
  }'
```
**Respuesta esperada:**
```json
{
  "trip_id": "03b23c63-11e3-4182-a733-ef903432a101",
  "zone_id": 161,
  "requested_at": "2026-10-19T11:54:28.357910Z",
  "status": "created",
  "base_fare": 20.0,
  "multiplier": 1.8,
  "charged_fare": 36.0,
  "degraded": false
}
```

### Paso B: Cancelar la Solicitud (CA 1.2)
Si el pasajero decide no proceder, la solicitud se marca como cancelada sin eliminarse:
```bash
curl -s -X POST http://localhost:8000/trip-requests/<TU_TRIP_ID>/cancel
```
**Respuesta esperada:**
```json
{
  "trip_id": "<TU_TRIP_ID>",
  "status": "cancelled"
}
```

---

## 5. Consultar la Auditoría Inmutable (RN-12, RNF-06)
Usa el `trip_id` generado para validar la trazabilidad exacta del cálculo tarifario mediante credenciales de rol auditor:
```bash
curl -s -X GET http://localhost:8000/audit/<TU_TRIP_ID> \
  -H "X-Auditor-Role: auditor" \
  -H "X-Auditor-Key: auditor-secret-token"
```
**Respuesta esperada:**
```json
{
  "trip_id": "<TU_TRIP_ID>",
  "base_fare": 20.0,
  "multiplier": 1.8,
  "charged_fare": 36.0,
  "pressure_index": 1.45,
  "rain_mm_h": 0.0,
  "rule_version_id": 1,
  "created_at": "..."
}
```
*(Cualquier intento sin cabeceras o con rol inválido responderá HTTP 403 Forbidden).*

