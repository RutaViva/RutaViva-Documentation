---
id: infraestructura
title: Módulo de Infraestructura y Base de Datos
sidebar_label: Infraestructura (infra/)
---

# Módulo de Infraestructura (`infra/`)

Administra la persistencia relacional operacional y el versionamiento del esquema mediante **Alembic**.

---

## 1. Migraciones de Esquema

El historial de migraciones se encuentra en `infra/migrations/versions/`:

* **`0001` (`esquema_01.py`)**:
  * Crea las 13 tablas operacionales del MER.
  * Define restricciones `CHECK` (multiplicador entre 1.0 y 2.0, lluvia positiva, tarifas mayor a 0).
  * Crea índices compuestos en claves calientes: `ix_vehicle_state_zone (zone_id, status)` para el conteo veloz de vehículos libres.
* **`1c747396d464` (`add_inactive_to_driver_status_check.py`)**:
  * Actualiza la restricción de estados de conductor para admitir `'active'`, `'inactive'` y `'suspended'`.

---

## 2. Docker Compose Local

Define los servicios indispensables en local:
```yaml
services:
  db:
    image: postgres:16
    container_name: rutaviva_postgres
    ports:
      - "5438:5432" # Expuesto en el puerto 5438 del host
  rabbitmq:
    image: rabbitmq:3.12-management
    container_name: rabbitmq-telemetria
    ports:
      - "5672:5672"   # Puerto de mensajería AMQP
      - "15672:15672" # Dashboard Web de administración
```

---

## 3. Ciclo de Vida de Contenedores y Registro Cloud (Amazon ECR)

Para garantizar la transición sin fricciones entre el desarrollo local y el despliegue en la nube, los microservicios clave cuentan con especificaciones Docker diseñadas bajo las mejores prácticas de la industria:

### 3.1. Arquitectura Multi-Stage de Imágenes
Tanto `services/multiplier_api/Dockerfile` como `services/pressure_worker/Dockerfile` implementan construcción en dos fases (*Multi-Stage Build*):
1. **Etapa `builder` (`python:3.12-slim`):**
   * Instala compiladores y cabeceras C/C++ (`build-essential`, `libpq-dev`).
   * Resuelve e instala dependencias en un entorno virtual aislado (`/opt/venv`).
2. **Etapa `runtime` (`python:3.12-slim`):**
   * Copia exclusivamente el `/opt/venv` precompilado, reduciendo el tamaño final de la imagen en más de un 60%.
   * **Seguridad sin privilegios root:** Crea un grupo y usuario del sistema (`USER app`), mitigando riesgos de escalada de privilegios en el contenedor.

### 3.2. Registro Centralizado en Amazon ECR
El pipeline automatizado de Continuous Deployment (`.github/workflows/ci-cd-app.yml`) publica los artefactos en **Amazon Elastic Container Registry (ECR)**:
* **Repositorios:**
  * `<ECR_REGISTRY>/rutaviva-multiplier-api`
  * `<ECR_REGISTRY>/rutaviva-pressure-worker`
* **Estrategia de Taggeo:**
  * **Tag Inmutable (`${{ github.sha }}`):** Garantiza auditoría exacta y trazabilidad binaria entre el commit en Git y el contenedor en producción, permitiendo rollbacks deterministas.
  * **Tag Flotante (`latest`):** Apunta a la última versión estable probada por el Quality Gate para consumo de clústeres de prueba y staging.

