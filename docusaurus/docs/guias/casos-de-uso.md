---
id: casos-de-uso
title: Casos de Uso Prácticos y Ejemplos de Implementación
sidebar_label: Casos de Uso & Ejemplos
---

# Casos de Uso Prácticos y Ejemplos de Implementación

Esta guía presenta los **8 escenarios operativos clave** del ecosistema **RutaViva**, explicando el problema de negocio, la regla aplicada, la llamada técnica exacta y la respuesta del sistema.

---

## 1. Cotización Estándar y Tarifa Base (RN-01)

### Contexto
Un pasajero solicita un taxi en una zona tranquila de la ciudad con tráfico fluido y abundancia de vehículos libres. El trayecto estimado es de **6.0 km** y una duración de **15 minutos**.

### Lógica Aplicada
* **Regla RN-01:** La tarifa base se compone de:
  ```text
  Tarifa Base = $1.50 + ($0.35 * km) + ($0.15 * minutos)
  Tarifa Base = $1.50 + ($0.35 * 6.0) + ($0.15 * 15.0) = $5.85
  ```
* Como la zona no experimenta presión ni lluvia, el multiplicador dinámico es **`1.0x`**.
* La tarifa final cobrada es **`$5.85`**.

### Petición HTTP (`POST /trip-requests`)
```bash
curl -X POST http://localhost:8000/trip-requests \
  -H "Content-Type: application/json" \
  -d '{
    "passenger_id": "00000000-0000-0000-0000-000000000001",
    "origin_zone_id": 10,
    "destination_zone_id": 14,
    "estimated_distance_km": 6.0,
    "estimated_duration_min": 15.0
  }'
```

### Respuesta del Sistema (201 Created)
```json
{
  "trip_id": "8f3b211a-4d92-491a-b620-75c128521a01",
  "zone_id": 10,
  "requested_at": "2026-10-18T14:30:00Z",
  "status": "created",
  "base_fare": 5.85,
  "multiplier": 1.0,
  "charged_fare": 5.85,
  "degraded": false
}
```

---

## 2. Desbalance de Oferta y Demanda en Hora Pico (RN-02, RN-03)

### Contexto
Durante la hora pico matutina en el sector financiero (Zona 1), la demanda de taxis se dispara a **45 solicitudes** en los últimos 10 minutos, mientras que solo hay **15 taxis libres** disponibles en el cuadrante.

### Lógica Aplicada
* **Regla RN-02:** El índice de presión `P` se calcula como el ratio entre demanda y oferta efectiva:
  ```text
  P = Demanda / max(Oferta Libre, 1) = 45 / 15 = 3.0
  ```
* **Regla RN-03 & RN-05:** Un índice de presión `P = 3.0` activa escalones dinámicos que elevan el multiplicador a **`1.8x`**.
* Para un viaje con tarifa base de **`$6.82`**, la tarifa final es:
  ```text
  Tarifa Cobrada = $6.82 * 1.8 = $12.28
  ```

### Petición HTTP (`POST /trip-requests`)
```bash
curl -X POST http://localhost:8000/trip-requests \
  -H "Content-Type: application/json" \
  -d '{
    "passenger_id": "00000000-0000-0000-0000-000000000002",
    "origin_zone_id": 1,
    "destination_zone_id": 4,
    "estimated_distance_km": 7.5,
    "estimated_duration_min": 18.0
  }'
```

### Respuesta del Sistema (201 Created)
```json
{
  "trip_id": "44342d14-d30d-4552-b1d1-933e87f947c0",
  "zone_id": 1,
  "requested_at": "2026-10-18T17:45:00Z",
  "status": "created",
  "base_fare": 6.82,
  "multiplier": 1.8,
  "charged_fare": 12.28,
  "degraded": false
}
```

---

## 3. Recargo Meteorológico por Lluvia Torrencial (RN-04 / Factor F3)

### Contexto
Comienza una tormenta severa en la ciudad. El servicio `weather-api` consulta a Open-Meteo y registra en la tabla `weather_current` una precipitación de **`4.2 mm/h`**.

### Lógica Aplicada
* **Regla RN-04:** Si la precipitación pluvial supera el umbral de lluvia intensa (> 2.0 mm/h), el sistema suma un recargo de un escalón adicional (+0.2x) sobre la tarifa base de la zona.
* Si la zona tenía un multiplicador base de `1.3x`, el factor meteorológico lo eleva a **`1.5x`**.
* La traza inmutable en `fare_audit` guarda el registro explícito de `rain_mm_h = 4.2`.

---

## 4. Congelamiento Regulatorio por Emergencia Masiva (RN-06)

### Contexto
Ocurre un evento sísmico o una evacuación de emergencia en la Zona 5, registrada en la tabla `special_event` con la bandera `is_emergency = true`. La demanda de evacuación colapsa la oferta disponible.

### Lógica Aplicada
* **Regla RN-06:** Por mandato ético y legal, **está estrictamente prohibido aplicar tarifas dinámicas o especulativas durante emergencias**.
* Aunque el índice de presión sea $P = 15.0$, el `pressure_worker` fuerza el multiplicador exactamente a **`1.0x`**.
* Los pasajeros son evacuados pagando exclusivamente la tarifa base reglamentaria.

---

## 5. Congelamiento de Tarifa en Solicitud y Asignación Diferida (RN-07)

### Contexto
Un pasajero solicita su viaje a las **18:00:00**, cuando la zona tenía un multiplicador de **`1.4x`**. Debido a la congestión urbana, la central tarda 12 minutos en asignarle un conductor. Para las **18:12:00**, el multiplicador de la zona subió a **`1.9x`**.

### Lógica Aplicada
* **Regla RN-07:** La tarifa del pasajero se **congela de forma definitiva e irrevocable en el segundo de la solicitud** (`requested_at`).
* Al asignarse el taxi, la tarifa no sufre recargos retroactivos.

### Flujo de Ejecución (Paso a Paso)

#### Paso A: El Pasajero Cotiza y Crea la Solicitud (18:00:00)
```bash
curl -X POST http://localhost:8000/trip-requests \
  -H "Content-Type: application/json" \
  -d '{
    "origin_zone_id": 25,
    "base_fare": 10.00
  }'
```
*Respuesta:* `trip_id: "c1a2b3d4-..."`, `multiplier: 1.40`, `charged_fare: 14.00`, `status: "created"`.

#### Paso B: El Despachador Asigna el Conductor (18:12:00)
```bash
curl -X POST http://localhost:8000/trip-requests/c1a2b3d4-1111-2222-3333-444455556666/assign
```
*Respuesta:*
```json
{
  "trip_id": "c1a2b3d4-1111-2222-3333-444455556666",
  "status": "assigned"
}
```
*El monto a pagar permanece en **$14.00** garantizado.*

---

## 6. Auditoría Regulatoria de un Viaje (RN-12, RNF-06)

### Contexto
Un pasajero presenta un reclamo ante la Agencia Metropolitana de Tránsito (AMT) alegando un cobro excesivo. Un auditor oficial solicita la reconstrucción legal y matemática del cobro.

### Lógica Aplicada
* **Regla RN-12 & RNF-06:** Cada viaje genera una fila en `fare_audit` que almacena el snapshot exacto de la base de datos en el instante del cobro: versión de reglas, presión, lluvia y multiplicador aplicado.
* El endpoint exige autenticación de rol auditor (`X-User-Role: auditor` y `X-Audit-Token`).

### Petición HTTP (`GET /audit/{trip_id}`)
```bash
curl -X GET http://localhost:8000/audit/44342d14-d30d-4552-b1d1-933e87f947c0 \
  -H "X-User-Role: auditor" \
  -H "X-Audit-Token: audit-secret-token"
```

### Respuesta del Sistema (200 OK)
```json
{
  "trip_id": "44342d14-d30d-4552-b1d1-933e87f947c0",
  "base_fare": 6.82,
  "multiplier": 1.8,
  "charged_fare": 12.28,
  "pressure_index": 4.0,
  "rain_mm_h": 0.0,
  "rule_version_id": 1,
  "degraded": false
}
```
*El auditor verifica que la tarifa de $12.28 fue legalmente válida debido a un índice de presión de 4.0 y regla versión 1.*

---

## 7. Falla de Infraestructura y Política de Degradación Segura (RNF-04)

### Contexto
El microservicio `pressure_worker` se detiene o la red de RabbitMQ sufre una desconexión. El timestamp `computed_at` de `zone_state` supera los **300 segundos de antigüedad** (*stale data*).

### Lógica Aplicada
* **Regla RNF-04:** La API **nunca arroja un error 500** ni interrumpe la operación de la flota.
* Si el estado es obsoleto o inaccesible, conmuta instantáneamente al modo *fail-safe*: devuelve **`multiplier: 1.0`** y la bandera **`degraded: true`**.
* La respuesta se entrega en menos de **5 ms** cumpliendo el SLA de **RNF-01**.

---

## 8. Pruebas de Carga Concurrente y Modo Ráfaga (CA-10)

### Contexto
El equipo de QA necesita comprobar cómo reacciona el sistema ante picos repentinos de demanda (por ejemplo, el final de un concierto en el Estadio Olímpico Atahualpa).

### Lógica Aplicada
* Se dispara el microservicio `request_simulator` en **Burst Mode (Modo Ráfaga)**.
* Se emiten 50 solicitudes concurrentes en 3 segundos concentradas en la misma zona.
* El `pressure_worker` detecta el incremento de demanda en la ventana móvil de 10 minutos y actualiza la tabla `zone_state`.
* Las siguientes cotizaciones reflejan la subida automática del multiplicador de `1.0x` hacia `1.7x` o `2.0x`.
