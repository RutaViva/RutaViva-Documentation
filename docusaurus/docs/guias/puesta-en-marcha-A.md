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

---

## 3. Siguientes Pasos

* Para ejecutar componentes de manera individual en tu terminal local con recarga rápida, consulta la **[Modalidad Local con uv (B)](./puesta-en-marcha-b)**.
* Para verificar que el flujo de datos y la auditoría funcionan de punta a punta, consulta la **[Guía de Comprobación de Integridad](./guia-e-integridad-del-sistema)**.