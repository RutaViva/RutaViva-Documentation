---
id: puesta-en-marcha-a
title: "Puesta en Marcha: Modalidad Docker Compose (A)"
sidebar_label: Modalidad Docker (A)
---

# Guía de Puesta en Marcha con Docker Compose (Modalidad A)

Instrucciones completas para levantar, operar y validar todo el ecosistema de **RutaViva** en contenedores Docker de manera aislada y reproducible.

---

## 1. Prerrequisitos del Sistema

* **Docker y Docker Compose** (v2.20+)
* **Git** y **cURL** (o Postman / ThunderClient) para pruebas de endpoints.
* Puertos libres en el host: `5438` (PostgreSQL), `5672` / `15672` (RabbitMQ), `8000` (Multiplier API) y `3000` (Docusaurus).

---

## 2. Despliegue Completo con Docker Compose

Esta modalidad levanta la topología completa: base de datos relacional, broker de telemetría, ingesta climática, simulador GPS browniano, worker de cálculo dinámico, API REST y simulador de demanda.

### 2.1 Preparar Variables de Entorno
Copia el archivo base de variables en la raíz de `RUTA_VIVA`:
```bash
cp .env.example .env
```
*(Si no existe `.env.example`, verifica que `.env` contenga las credenciales estándar: `POSTGRES_USER=admin`, `POSTGRES_PASSWORD=admin1234`, `POSTGRES_DB=rutaviva_db`).*

### 2.2 Limpiar Contenedores Previos (En caso de conflictos de nombres)
Si ejecutaste contenedores anteriormente y tienes conflictos de puertos o nombres:
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
* `rutaviva_postgres` (Puerto host `5438` $\rightarrow$ contenedor `5432`)
* `rabbitmq-telemetria` (Puertos `5672` AMQP y `15672` Consola Web)
* `rutaviva_weather_worker` (Ingesta periódica de lluvia desde Open-Meteo)
* `rutaviva_telemetry_simulator` (Simulación browniana de telemetría GPS)
* `rutaviva_pressure_worker` (Cálculo continuo de presión y tarifas dinámicas)
* `rutaviva_multiplier_api` (API REST FastAPI en puerto `8000`)
* `rutaviva_request_simulator` (Generador continuo de solicitudes de pasajeros)

### 2.5 Inicialización y Tablas de Base de Datos
En despliegues limpios, PostgreSQL ejecuta automáticamente el script [`infra/init.sql`](https://github.com) montado en `/docker-entrypoint-initdb.d/01-init.sql`, creando todas las 14 tablas del MER operacional.

Si tienes un volumen existente (`pg_data`) que se creó previamente sin tablas, puedes forzar la inicialización inmediata con cualquiera de estos dos comandos:
```bash
# Opción A (directo en el contenedor PostgreSQL):
docker compose exec db psql -U admin -d rutaviva_db -f /docker-entrypoint-initdb.d/01-init.sql

# Opción B (vía migraciones Alembic con uv):
uv run alembic upgrade head
```

### 2.6 Siembra Automática de la Flota (8.000 Vehículos y 8.000 Conductores - F4 y F6)
Docker Compose orquesta el contenedor efímero `rutaviva_seed_runner`, el cual puebla de manera 100% desatendida las 265 zonas de NYC y una flota a escala oficial de **8.000 conductores (F6)** y **8.000 vehículos (F4)** (`SEED_DRIVERS=8000`, `SEED_VEHICLES=8000`).
- `telemetry_simulator` espera a que `seed_runner` termine exitosamente antes de iniciar la emisión GPS, evitando fallos por catálogo vacío.
- El proceso es **idempotente (CA 2.2)**: si vuelves a ejecutar el despliegue, el motor omite duplicados sin romper la integridad referencial.
- La generación en memoria con caché geométrica se completa en $\approx 2.5$ segundos.

### 2.7 Simulación de Demanda y Ráfagas de Solicitudes (F5 / HU-01 / CA-10)
El servicio `rutaviva_request_simulator` genera tráfico sintético continuo y ráfagas para eventos masivos:
* **Tráfico Continuo Estándar (F5 Pico):** `30.0` req/s $\rightarrow$ **1.800 solicitudes/minuto** constantes distribuidas entre las zonas de NYC (con 40% enfocado en zonas calientes como Midtown Manhattan y aeropuertos), equilibrando la oferta disponible de 8.000 vehículos.
* **Ráfagas Periódicas (CA-10):** Habilitadas en `docker-compose.yml` (`BURST_ENABLED=true`) para disparar **1.000 solicitudes instantáneas cada 3 minutos** en la zona 161 (Madison Square Garden).
* **Prueba de Carga Extrema (CA-10):** Para certificar que la API sostenga ráfagas de hasta **5.000 solicitudes en 1 minuto** sin errores 500:
  ```bash
  uv run python scripts/test_burst_ca10.py --requests 5000 --concurrency 100 --zone 161
  ```

---

## 3. Detalle de Cambios en la Ejecución y Acción que Realizan

Para garantizar que el despliegue con Docker Compose sea 100% autónomo, robusto y conforme a la rúbrica de evaluación, se implementaron modificaciones estructurales en la orquestación:

| Componente Modificado | Cambio Realizado | Proceso de Ejecución Modificado | Acción y Beneficio que Realiza el Cambio |
| :--- | :--- | :--- | :--- |
| **`seed_runner`** (`docker-compose.yml`) | Servicio efímero (*one-shot*) con `restart: "no"`, `SEED_DRIVERS=8000` y `SEED_VEHICLES=8000`. | Se dispara automáticamente una sola vez tras alcanzar el estado `healthy` de PostgreSQL. | **Poblamiento Oficial de Flota (F4, F6):** Siembra 265 zonas de NYC, 8.000 conductores y 8.000 vehículos en `vehicle_state`. Desacopla al desarrollador de tener que sembrar a mano. |
| **`telemetry_simulator`** (`docker-compose.yml`) | Dependencia condicional `seed_runner: condition: service_completed_successfully`. | El contenedor del simulador GPS permanece en espera hasta que el seeder reporte código de salida 0. | **Eliminación de Condiciones de Carrera:** Evita que el simulador despierte con tablas vacías y colapse con `RuntimeError: No hay vehículos en vehicle_state`. |
| **`pressure_worker`** (`docker-compose.yml`) | Configuración de `BATCH_SIZE=1000` y prefetch proporcional. | El consumidor de RabbitMQ acumula lotes de 1.000 eventos antes de volcar a base de datos. | **Absorción de 533 msg/s (F4):** Procesa el flujo masivo de 8.000 vehículos reduciendo las transacciones a PostgreSQL de 40 a solo 8 por ciclo de 15 segundos. |
| **`db` / `infra/init.sql`** (`docker-compose.yml`) | Montaje de `./infra/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro`. | En el primer arranque de PostgreSQL, el script de inicialización oficial se ejecuta de forma nativa. | **Esquema Relacional Inmediato:** Crea automáticamente las 14 tablas del MER operacional, restricciones `CHECK`, índices y la versión de Alembic (`1c747396d464`). |
| **`weather_worker`** (`services/weather-api/`) | Creación desacoplada de tabla (`CREATE TABLE IF NOT EXISTS weather_current`) previa al `INSERT`. | El worker valida la existencia de la tabla en una sentencia DDL independiente antes de enviar el comando DML. | **Autocuración ante Caídas:** Corrige el error `UndefinedTable: relation "weather_current" does not exist` y cumple con la restricción de prepared statements de `psycopg3`. |
| **`request_simulator`** (`docker-compose.yml`) | Configuración a 30.0 req/s continuas (`F5`) y ráfagas periódicas activas (`BURST_ENABLED=true`). | Genera demanda continua de 1.800 req/min y ráfagas de 1.000 req concurrentes cada 3 min en Madison Square Garden. | **Activación del Tarifario Dinámico (RN-02, RN-03):** Contrarresta la sobreoferta de 8.000 vehículos para provocar fluctuaciones realistas en los multiplicadores. |
| **Script CA-10** (`scripts/test_burst_ca10.py`) | Herramienta de benchmarking de carga asíncrona con `httpx.AsyncClient`. | Se ejecuta bajo demanda desde la terminal del host con semáforos de concurrencia (100 workers). | **Certificación de Resiliencia:** Comprueba que la API resista 5.000 req/min con 0 errores 5xx, midiendo Throughput real y percentiles $p50, p95, p99$. |

---

## 4. Siguientes Pasos

* Para consultar la matriz completa de criterios cumplidos y su justificación técnica, revisa la **[Matriz de Criterios de Aceptación](./matriz-criterios-aceptacion)**.
* Para ejecutar componentes de manera individual en tu terminal local con recarga rápida, consulta la **[Modalidad Local con uv (B)](./puesta-en-marcha-b)**.
* Para verificar que el flujo de datos y la auditoría funcionan de punta a punta, consulta la **[Guía de Comprobación de Integridad](./guia-e-integridad-del-sistema)**.