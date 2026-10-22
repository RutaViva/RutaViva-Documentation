---
id: adrs
title: Registros de Decisión de Arquitectura (ADRs)
sidebar_label: Decisiones (ADRs)
---

# Registros de Decisión de Arquitectura (ADR)

Este registro documenta las decisiones técnicas fundamentales adoptadas para la plataforma RutaViva, incluyendo alternativas evaluadas y justificación técnica.

---

### ADR-0001: Airflow con CeleryExecutor
* **Estado**: Aceptado
* **Contexto**: Se requiere orquestar pipelines batch que ingieren millones de viajes históricos, consultan el clima cada hora y generan reportes mensuales.
* **Decisión**: Utilizar Apache Airflow con `CeleryExecutor` sobre contenedores.
* **Alternativas Descartadas**:
  * *Sequential/LocalExecutor*: No permite paralelismo real de tareas ni distribución horizontal.
  * *AWS Step Functions*: Mayor costo por transición de estado y menor portabilidad con el ecosistema de datos local/on-premise.
* **Consecuencias**: Requiere un broker (RabbitMQ/Redis) y base de datos de metadatos PostgreSQL independiente.

---

### ADR-0002: RabbitMQ como Broker de Mensajería
* **Estado**: Aceptado
* **Contexto**: 8,000 vehículos transmiten telemetría cada 15 segundos (~533 mensajes/segundo sostenidos, con picos de solicitudes de hasta 5,000 req/min).
* **Decisión**: Implementar RabbitMQ con topología de Topic Exchanges y colas durables.
* **Alternativas Descartadas**:
  * *Llamadas HTTP Síncronas directas*: Las ráfagas saturarían la base de datos o el proceso calculador.
  * *Apache Kafka*: Aunque excelente para streams masivos, añade sobrecarga operacional innecesaria (ZooKeeper/KRaft) para el volumen y retention window requerido.
* **Consecuencias**: Máximo throughput con `DeliveryMode.NOT_PERSISTENT` en telemetría y `durable=True` para garantizar resiliencia ante reinicios.

---

### ADR-0003: Apache Spark para Procesamiento Batch en Medallón
* **Estado**: Aceptado
* **Contexto**: Procesamiento de más de 6 meses de archivos NYC Yellow Taxi con esquemas cambiantes entre años (2019 vs 2022) y validación de reglas de calidad.
* **Decisión**: Implementar dos jobs PySpark desacoplados (`job1_clean_validate` y `job2_enrich_model`).
* **Alternativas Descartadas**:
  * *Pandas / Procesamiento en memoria de nodo único*: Saturación de memoria RAM (OOM) y más de 6 horas de procesamiento por mes.
  * *AWS Glue Job*: Costos de inicio en frío elevados para pruebas locales y menor reproducibilidad en desarrollo.
* **Consecuencias**: Permite reejecutar independientemente el paso que falle y garantiza reprocesamiento idempotente.

---

### ADR-0004: Estado Operacional en PostgreSQL (RDS)
* **Estado**: Aceptado
* **Contexto**: El sistema debe mantener catálogos, estados de conductores/licencias/sanciones, telemetría reciente y auditorías de viaje con integridad referencial estricta.
* **Decisión**: Utilizar PostgreSQL 16 como base de datos operacional.
* **Alternativas Descartadas**:
  * *Bases NoSQL (MongoDB/DynamoDB)*: Complejidad para garantizar integridad referencial y comprobaciones de estados legales de conductores (RN-09).
* **Consecuencias**: Consultas de multiplicador por clave primaria en milisegundos y soporte transaccional ACID para auditorías.

---

### ADR-0005: Data Lake en S3 (Parquet) + Amazon Athena
* **Estado**: Aceptado
* **Contexto**: Exposición analítica para dashboards en Power BI sin degradar el rendimiento operacional de la base de datos transaccional.
* **Decisión**: Almacenar la capa Gold en formato Parquet columnar particionado en Amazon S3 y consultar vía Athena.
* **Alternativas Descartadas**:
  * *Conectar Power BI directamente a PostgreSQL*: Consultas analíticas pesadas colapsarían la base de datos operacional utilizada por la API en vivo.
* **Consecuencias**: Separación total entre OLTP y OLAP; costo por consulta optimizado mediante particionamiento por año/mes y formato columnar Snappy.

---

### ADR-0006: Desacoplamiento de Pipelines CI/CD y Estrategia de Despliegue en Amazon ECR
* **Estado**: Aceptado
* **Contexto**: El monorepo de RutaViva contiene dos cargas de trabajo con características técnicas radicalmente distintas:
  1. Microservicios operacionales de baja latencia (`services/`: FastAPI, SQLAlchemy, RabbitMQ).
  2. Jobs analíticos de procesamiento distribuido por lotes (`batch/`: Apache Spark, Java 17 Temurin, PyArrow, DAGs de Airflow).
  Mantener un único pipeline CI/CD monolítico obligaba a instalar Java 17 y Spark en cada cambio menor de la API, elevando el tiempo de ejecución a más de 3 minutos e introduciendo fallos cruzados. Adicionalmente, se requiere garantizar el principio de *Shift-Left Security* (CT-02) y trazabilidad inmutable de imágenes para despliegues.
* **Decisión**:
  1. **Separación de Pipelines (RWI-65):**
     * `ci-cd-app.yml`: Monitorea `services/**` e `infra/**`. Ejecuta escaneo CT-02, linter (`ruff`), contenedor efímero PostgreSQL 16 y 19 pruebas unitarias. Al fusionar en `main`, construye y publica imágenes Docker multi-stage en **Amazon ECR**.
     * `ci-cd-data.yml`: Monitorea `batch/**`. Configura Java 17 Temurin, escaneo CT-02, validación de sintaxis AST (`py_compile`) y pruebas PySpark. Al fusionar en `main`, sincroniza DAGs y jobs a AWS S3.
  2. **Quality Gate Preventivo y Bloqueante (CT-02 / RWI-66):** El escaneo de secretos se ejecuta como el primer paso antes de compilar o probar, abortando de inmediato si se detectan llaves privadas o claves de acceso AWS.
  3. **Inmutabilidad y Trazabilidad en Amazon ECR:** Las imágenes se publican con doble taggeo: `${{ github.sha }}` (inmutable, garantizando reproducibilidad y rollbacks exactos) y `latest` (para orquestadores de desarrollo).
* **Alternativas Descartadas**:
  * *Pipeline Único Monolítico (`ci.yml`)*: Añadía `~150 s` innecesarios por cada commit en la API y hacía frágil el pipeline ante dependencias de JVM no relacionadas con los microservicios.
  * *Matrix Builds Globales*: Forzaba la ejecución de la suite de datos incluso en PRs exclusivos de documentación o frontend.
  * *Despliegue síncrono por SSH a servidores*: Descartado en favor de contenedores inmutables en ECR listos para Kubernetes (EKS) o ECS.
* **Consecuencias**: Tiempo de retroalimentación en PRs de la API reducido a `~40 s`, aislamiento total de fallos entre equipos de desarrollo de API y de Data Engineering, y conformidad estricta con el estándar de seguridad CT-02.

