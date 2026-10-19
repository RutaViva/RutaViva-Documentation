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

---

## 3. Siguientes Pasos

* Para validar la integridad matemática y funcional del sistema, consulta la **[Guía de Comprobación de Integridad](./guia-e-integridad-del-sistema)**.