---
id: puesta-en-marcha
title: Guía de Puesta en Marcha Rápida
sidebar_label: Puesta en Marcha
---

# Guía de Puesta en Marcha y Verificación

Instrucciones completas para levantar, operar y validar el entorno de desarrollo y pruebas de **RutaViva**.

---

## 1. Prerrequisitos del Sistema

* **Docker y Docker Compose** (v2.20+)
* **Python 3.12+** con el gestor de paquetes moderno **[`uv`](https://github.com/astral-sh/uv)** instalado.
* **Node.js 20+** y **npm** (para ejecutar la documentación en Docusaurus).
* **Git** y **cURL** (o Postman) para pruebas de endpoints.

---

## 2. Modalidad A: Despliegue Completo con Docker Compose (Recomendado)

Esta modalidad levanta toda la topología de microservicios, bases de datos y colas de mensajes de forma aislada y reproducible.

### 2.1 Preparar Variables de Entorno
Copia el archivo de variables base en la raíz de `RUTA_VIVA`:
```bash
cp .env.example .env
```

### 2.2 Limpiar Contenedores Previos (En caso de conflictos de nombres)
Si ejecutaste contenedores anteriormente y tienes conflictos de nombres:
```bash
docker rm -f rutaviva_postgres rabbitmq-telemetria rutaviva_multiplier_api rutaviva_weather_worker rutaviva_pressure_worker rutaviva_telemetry_simulator rutaviva_request_simulator
```

### 2.3 Construir y Levantar el Stack
```bash
docker compose up -d --build
```

### 2.4 Verificar Estado de los Servicios
```bash
docker compose ps
```
Todos los contenedores deben figurar en estado `Up` o `healthy`:
* `rutaviva_postgres` (Puerto `5432`)
* `rabbitmq-telemetria` (Puertos `5672` AMQP y `15672` Panel Web)
* `rutaviva_weather_worker` (Ingesta de clima)
* `rutaviva_telemetry_simulator` (Generador GPS de 8,000 taxis)
* `rutaviva_pressure_worker` (Cálculo de oferta/demanda y tarifas)
* `rutaviva_multiplier_api` (API REST en puerto `8000`)
* `rutaviva_request_simulator` (Generador de solicitudes de viaje)

---

## 3. Modalidad B: Ejecución Local Modular con `uv` (Desarrollo Paso a Paso)

Si deseas depurar un microservicio específico en tu entorno local con recarga en caliente (*hot reload*):

### Paso 1: Iniciar Bases de Datos y Colas
Levanta únicamente PostgreSQL y RabbitMQ:
```bash
docker compose up -d db rabbitmq
```
* **PostgreSQL:** `localhost:5432` (usuario: `postgres`, base: `rutaviva`)
* **RabbitMQ:** `localhost:5672` (Consola Web: [http://localhost:15672](http://localhost:15672), usuario: `admin`, clave: `admin1234`)

### Paso 2: Ejecutar Migraciones de Base de Datos
Aplica el esquema relacional con Alembic:
```bash
uv run alembic upgrade head
```

### Paso 3: Poblar el Catálogo y Conductores (Seed CLI)
Genera las 265 zonas de Quito y la flota sintética de conductores y vehículos:
```bash
# Modo rápido de desarrollo (150 conductores)
uv run python -m services.seed_cli.app.main --mode dev

# O con la flota completa reglamentaria (8,000 vehículos)
uv run python -m services.seed_cli.app.main --mode full
```

### Paso 4: Iniciar la Ingesta de Clima (`weather-api`)
Obtiene la precipitación actual de Quito desde Open-Meteo y la guarda en `weather_current`:
```bash
uv run python services/weather-api/app/weather-variables.py
```

### Paso 5: Iniciar el Simulador de Telemetría GPS
Publica pulsos GPS cada 15 segundos hacia RabbitMQ:
```bash
uv run python -m services.telemetry_simulator.app.telemetry_generator
```

### Paso 6: Iniciar el `pressure_worker`
Consume los pulsos GPS de RabbitMQ y recalcula la presión y multiplicadores de cada zona:
```bash
uv run python -m services.pressure_worker.app.main
```

### Paso 7: Iniciar la API de Multiplicador y Movilidad
Arranca el servidor FastAPI con recarga automática:
```bash
uv run uvicorn services.multiplier_api.app.main:app --host 0.0.0.0 --port 8000 --reload
```
* **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Paso 8: (Opcional) Iniciar el Simulador de Solicitudes de Pasajeros
Genera solicitudes continuas y picos de demanda:
```bash
uv run python -m services.request_simulator.app.main
```

### Paso 9: Iniciar el Servidor de Documentación (Docusaurus)
```bash
cd RutaViva-Documentation/docusaurus
npm run start
```
* Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

---

## 4. Guía de Comprobación de Integridad del Sistema

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
