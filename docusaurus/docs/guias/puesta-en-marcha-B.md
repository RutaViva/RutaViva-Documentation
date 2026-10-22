---
id: puesta-en-marcha-b
title: "Puesta en Marcha: Modalidad Local Modular con uv (B)"
sidebar_label: Modalidad Local uv (B)
---

# Guía de Puesta en Marcha Local con uv (Modalidad B)

Instrucciones completas para levantar y operar los microservicios de **RutaViva** de manera individual en tu máquina de desarrollo mediante **`uv`**, facilitando depuración, logs independientes y recarga en caliente (*hot-reload*).

---

## 1. Prerrequisitos

* **Docker:** Para levantar únicamente los motores de infraestructura (PostgreSQL y RabbitMQ).
* **Python 3.12+** con **`uv`** instalado:
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
* Repositorio clonado y variables configuradas en `.env`.

---

## 2. Paso a Paso de Ejecución Local

### Paso 1: Iniciar Bases de Datos y Colas
Levanta únicamente PostgreSQL y RabbitMQ en segundo plano:
```bash
docker compose up -d db rabbitmq
```
* **PostgreSQL:** Accesible en `localhost:5438` (usuario: `admin`, clave: `admin1234`, base: `rutaviva_db`).
* **RabbitMQ:** Accesible en `localhost:5672` (Panel de Control Web: [http://localhost:15672](http://localhost:15672), credenciales: `admin` / `admin1234`).

### Paso 2: Ejecutar Migraciones de Base de Datos
Aplica el esquema relacional inicial con Alembic:
```bash
uv run alembic upgrade head
```

### Paso 3: Poblar el Catálogo y Conductores (Seed CLI)
Siembra las 265 zonas de NYC y la flota sintética de conductores, vehículos, licencias y sanciones:
```bash
# Limpiar y sembrar 100 conductores (modo recomendado de desarrollo)
uv run python -m services.seed_cli.app.main --clean --drivers 100
```

### Paso 4: Iniciar la Ingesta de Clima (`weather-api`)
Obtiene la precipitación actual desde Open-Meteo y la guarda en la tabla `weather_current`:
```bash
# Ejecutar una sola sincronización inmediata
uv run python services/weather-api/app/weather-variables.py --once
```

### Paso 5: Iniciar el Simulador de Telemetría GPS
Publica pulsos GPS brownianos hacia la cola `telemetria.vehiculos` de RabbitMQ:
```bash
uv run python -m services.telemetry_simulator.app.telemetry_generator
```

### Paso 6: Iniciar el Worker de Presión (`pressure_worker`)
Consume la telemetría en tiempo real desde RabbitMQ y recalcula la oferta, demanda y multiplicadores tarifarios por zona:
```bash
uv run python -m services.pressure_worker.app.main
```

### Paso 7: Iniciar la API REST (`multiplier_api`)
Arranca el servidor FastAPI con recarga automática:
```bash
uv run uvicorn services.multiplier_api.app.main:app --host 0.0.0.0 --port 8000 --reload
```
* **Documentación Interactiva (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Especificación ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Paso 8: (Opcional) Iniciar el Simulador de Solicitudes de Viaje
Genera solicitudes continuas de pasajeros para probar la concurrencia y las tarifas dinámicas:
```bash
uv run python -m services.request_simulator.app.main
```

### Paso 9: Iniciar el Servidor de Documentación (Docusaurus)
```bash
cd /home/dan/Escritorio/RutaViva/RutaViva-Documentation/docusaurus
npm run start
```
* Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

### Paso 10: Ejecutar la Prueba de Estrés y Ráfaga CA-10
Valida que la API soporte ráfagas masivas (hasta 5.000 req/min) con 0 caídas:
```bash
# Ráfaga rápida de 1.000 solicitudes
uv run python scripts/test_burst_ca10.py --api-url http://localhost:8000 --requests 1000 --concurrency 50

# Prueba oficial de certificación CA-10 (5.000 solicitudes en 1 minuto)
uv run python scripts/test_burst_ca10.py --api-url http://localhost:8000 --requests 5000 --concurrency 100 --zone 161
```

---

## 3. Detalle de Cambios en la Ejecución Local y Acción que Realizan

| Cambio Realizado en Local | Proceso de Ejecución Modificado | Acción y Beneficio que Realiza el Cambio |
| :--- | :--- | :--- |
| **Escalamiento a 8.000 Vehículos y Choferes** | `main.py` soporta `SEED_DRIVERS=8000` y `SEED_VEHICLES=8000` con caché geométrica en memoria. | **Cumplimiento de F4 y F6:** Siembra exactamente 8.000 conductores y 8.000 vehículos en $\approx 2.5$ segundos de forma reproducible y con 0 colisiones. |
| **Estabilización de Semilla (`init_seeds()`)** | Inicialización centralizada de `random`, `Faker` y `numpy`. | **Idempotencia Perfecta (CA 2.2):** Garantiza que volver a correr el seeder produzca exactamente las mismas claves sin duplicados. |
| **Tuning de Lotes en Worker (`BATCH_SIZE=1000`)** | `worker_config.py` ajusta el volcado y prefetch a 1.000 y 2.000 mensajes. | **Absorción de Alta Frecuencia:** Permite al worker procesar el stream de 8.000 autos (533.3 msg/s) con solo 8 transacciones por ciclo en PostgreSQL. |
| **Simulador de Solicitudes a 30 req/s** | `config.py` de `request_simulator` eleva la demanda a 30 req/s continuos con ráfagas activas. | **Equilibrio Oferta/Demanda (F5):** Genera la presión suficiente frente a la oferta de 8.000 autos para activar dinámicamente los escalones de tarifa (RN-02 y RN-03). |
| **Exportación de Colección Postman / Bruno** | Archivo `rutaviva-postman-collection.json` disponible en `services/multiplier_api/`. | **Pruebas de Interfaz sin Fricción:** Permite a cualquier desarrollador importar los 6 endpoints con variables configuradas (`base_url`, `auditor_key`). |

---

## 4. Siguientes Pasos

* Para consultar la justificación técnica de todos los criterios cumplidos, revisa la **[Matriz de Criterios de Aceptación](./matriz-criterios-aceptacion)**.
* Para validar la integridad matemática y funcional del sistema, consulta la **[Guía de Comprobación de Integridad](./guia-e-integridad-del-sistema)**.