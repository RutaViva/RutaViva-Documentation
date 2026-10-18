---
id: resumen
title: Módulos y Servicios del Sistema
sidebar_label: Resumen de Módulos
---

# Catálogo de Módulos y Microservicios

El repositorio de RutaViva está organizado en microservicios y módulos modulares desacoplados:

| Módulo | Directorio | Tecnología | Estado | Responsabilidad Principal |
|---|---|---|:---:|---|
| **Infraestructura** | `infra/` | PostgreSQL 16, Alembic, Docker | ✅ Activo | Esquema DDL operacional y migraciones versionadas. |
| **Seed CLI** | `services/seed_cli/` | Python 3.12, GeoPandas, Faker | ✅ Activo | Ingesta de catálogo de zonas y generación determinista de flota. |
| **Simulador de Telemetría** | `services/telemetry_simulator/` | Python 3.12, `aio-pika`, R-Tree | ✅ Activo | Emisión de pulsos GPS c/ 15s a RabbitMQ con defectos (`HU-02`). |
| **API Multiplicador** | `services/multiplier_api/` | FastAPI, SQLAlchemy 2.0, Pydantic | ✅ Activo | Cotización de tarifas, creación de viajes con congelamiento (RN-07) y auditoría inmutable (RNF-06). |
| **Pressure Worker** | `services/pressure_worker/` | Python 3.12, `aio-pika`, SQLAlchemy | ✅ Activo | Consumo continuo de telemetría y cómputo de presión y tarifas con escalones y topes regulatorios. |
| **Simulador de Solicitudes** | `services/request_simulator/` | Python 3.12, `httpx`, Asyncio | ✅ Activo | Generador de demanda continua y ráfagas masivas concurrentes (`HU-01`, `CA-10`). |
| **Integración de Clima** | `services/weather-api/` | Python 3.12, Open-Meteo, SQLAlchemy | ✅ Activo | Ingesta horaria de precipitación pluvial en `weather_current` (RN-04). |
| **Batch Analytics** | `batch/` | Apache Spark, Apache Airflow | ⏳ En desarrollo | Procesamiento Medallón (Bronze -> Gold) y reporte regulatorio automatizado. |
