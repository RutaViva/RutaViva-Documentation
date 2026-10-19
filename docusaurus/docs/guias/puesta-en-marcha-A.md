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