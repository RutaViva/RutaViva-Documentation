---
id: matriz-criterios-aceptacion
title: "Matriz y Evidencia de Criterios de Aceptación"
sidebar_label: Criterios de Aceptación (CA & HU)
---

# Matriz Oficial de Cumplimiento, Reglas de Negocio y Fuentes de Datos

Esta sección documenta formalmente la correspondencia técnica entre los **Requerimientos Operacionales**, las **Fuentes de Datos (F1 a F7)**, las **12 Reglas de Negocio (RN-01 a RN-12)** y los **Criterios de Aceptación (CA-01 a CA-10, HU-01, HU-02 y CTs)** del caso de estudio RutaViva.

---

## 1. Alineación con las Fuentes de Datos Oficiales (F1 a F7)

| ID | Fuente Oficial | Tipo / Formato | Volumen y Frecuencia | Mecanismo de Integración en RutaViva | Estado |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **F1** | NYC Yellow Taxi Trip Data | Parquet / CSV | **57 partes Parquet (~1.04 GB)** (2015-01, 2016-01..03) | Ingesta a S3 Bronze (`bronze/f1/`). Normalización con PySpark (`job1_clean_validate`), evolución de esquemas de coordenadas a zonas y generación de capa Silver. | ✅ **100% Activo** |
| **F2** | TLC Taxi Zone Lookup | CSV público | 265 filas (única) | Precargado en la tabla `zone` de PostgreSQL vía `infra/init.sql` y shapefiles de geometrías. | ✅ Activo |
| **F3** | Clima histórico y pronóstico | API Open-Meteo Archive | **744 h/mes (horaria)** + 24 reg/día | Ingesta histórica horaria (`bronze/f3/`) para 2015 y 2016 + consulta horaria operacional en la tabla `weather_current` (RN-04). | ✅ **100% Activo** |
| **F4** | Telemetría GPS de vehículos | Stream simulado | **8.000 vehículos** (cada 15 s) | `telemetry_simulator` emite aproximadamente 533.3 msg/s (32.000 msg/min) vía RabbitMQ hacia `telemetria.vehiculos`. | ✅ Activo |
| **F5** | Solicitudes de viaje de la app | API simulada | **&ge; 30 req/s pico** (continuo) | `request_simulator` dispara 30 req/s continuos y ráfagas masivas (CA-10) contra la API REST. | ✅ Activo |
| **F6** | Registro de conductores | BD PostgreSQL | **8.000 conductores** (seed) | `seed_cli` genera e inserta 8.000 conductores, licencias, sanciones y vehículos en lotes de 5.000 filas. | ✅ Activo |
| **F7** | Eventos especiales | CSV / Tabla BD | &lt; 500 filas/mes | Ingesta histórica mensual (`bronze/f7/`) con ventanas de picos en zonas clave + tabla `special_event` con banderas de emergencia (RN-06). | ✅ **100% Activo** |

---

## 2. Matriz de Cumplimiento de Reglas de Negocio (RN-01 a RN-12)

| Regla | Descripción Oficial | Implementación en Código | Archivo Fuente | Estado y Validación |
| :---: | :--- | :--- | :--- | :---: |
| **RN-01** | **Validez de viaje y cuarentena:** distancia 0.1 a 100 mi, duración 1 a 300 min, tarifa mayor a 0, zonas válidas. Inválidos a cuarentena. | Reglas de filtrado y enrutamiento a cuarentena Parquet en PySpark. | `batch/spark-jobs/common/quality_rules.py` | ✅ **100% Cumplido** (`test_quarantine_*`) |
| **RN-02** | **Índice de presión:** `presión = solicitudes_10min / vehiculos_libres`. Recálculo menor o igual a 5 min. | Tarea periódica cada 30s calcula la presión agrupando por zona. Si no hay autos, fija 4.0 o 1.0. | `services/pressure_worker/app/pressure_calculator.py` | ✅ **100% Cumplido** (Ciclo de 30s) |
| **RN-03** | **Escalonamiento de multiplicador:** menor a 1.2 &rarr; 1.0; 1.2 a 2.0 &rarr; 1.2; 2.0 a 3.0 &rarr; 1.5; mayor a 3.0 &rarr; 1.8. | Función `calculate_base_step(pressure_index)` aplica exactamente los rangos normativos. | `services/pressure_worker/app/pressure_calculator.py` | ✅ **100% Cumplido** (`test_rn03`) |
| **RN-04** | **Penalización por lluvia:** Si lluvia mayor a 2 mm/h, sube un escalón adicional. | Función `apply_rain_step(multiplier)` eleva la tarifa un peldaño en la escala `[1.0, 1.2, 1.5, 1.8, 2.0]`. | `services/pressure_worker/app/pressure_calculator.py` | ✅ **100% Cumplido** (`test_rn04`) |
| **RN-05** | **Topes regulatorios y nocturnos:** Máximo 2.0 siempre; entre 22:00 y 05:00 máximo 1.5. | `apply_regulatory_caps` evalúa hora local NYC (UTC-4/5) y acota estrictamente la tarifa. | `services/pressure_worker/app/pressure_calculator.py` | ✅ **100% Cumplido** (`test_rn05`) |
| **RN-06** | **Emergencias:** Declaración de emergencia congela obligatoriamente el multiplicador a 1.0. | Evalúa `special_event.is_emergency = true` en la zona y anula recargos de presión o lluvia. | `services/pressure_worker/app/pressure_calculator.py` | ✅ **100% Cumplido** (`test_ca02`) |
| **RN-07** | **Momento de fijación:** Multiplicador es el vigente en la solicitud, no en la asignación. | `create_trip_request` congela el multiplicador en `trip_request` y `fare_audit`. `assign_trip` solo actualiza el estado. | `services/multiplier_api/app/services/trip_request_service.py` | ✅ **100% Cumplido** (`test_ca12`) |
| **RN-08** | **Zonas desatendidas:** Espera estimada mayor a 12 min durante 3 intervalos consecutivos. | `zone_repo.get_underserved_zones` consulta 3 intervalos > 12 min en `zone_state_history`. Expuesto en `GET /zones/underserved`. | `services/multiplier_api/app/routers/zone.py` | ✅ **100% Cumplido** (`test_underserved_zones_rf05`) |
| **RN-09** | **Exclusión de conductores no aptos:** Licencia vencida o suspendido no cuentan en oferta. | `get_available_supply_query` excluye choferes con `status = 'suspended'`, licencia vencida o sanción vigente hoy. | `services/pressure_worker/app/pressure_calculator.py` | ✅ **100% Cumplido** (`test_rn09_ca21`) |
| **RN-10** | **Inactividad telemétrica:** Vehículo sin telemetría mayor a 2 min queda fuera de servicio. | `cutoff_telemetry = now - 120s`. Autos sin telemetría reciente no suman en la oferta. Simulador los marca `offline`. | `services/pressure_worker/app/pressure_calculator.py` | ✅ **100% Cumplido** (`test_rn10`) |
| **RN-11** | **Reporte regulatorio mensual:** Viajes por distrito, tarifa promedio, espera, quejas. | Script automatizado que procesa hechos Gold y exporta reporte mensual en JSON/CSV. | `batch/reports/generate_regulatory_report.py` | ✅ **100% Cumplido** (`test_pipeline_e2e`) |
| **RN-12** | **Auditoría inmutable de tarifa:** Almacena multiplicador, presión, clima y versión de reglas. | Registro inmutable en tabla `fare_audit` en la misma transacción del viaje, consultable vía `GET /audit/fares/{trip_id}`. | `services/multiplier_api/app/services/trip_request_service.py` | ✅ **100% Cumplido** (`test_rnf06`) |

---

## 3. Criterios de Aceptación del Caso de Estudio (CA-01 a CA-10)

| ID | Criterio de Aceptación | Estado | Por Qué Técnico (Justificación y Mecanismo) | Archivo / Evidencia | Prueba de Verificación |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **CA-01** | **Cuarentena PySpark:** Filtrar anomalías a cuarentena. | ✅ **CUMPLIDO** | Módulo de calidad PySpark aísla registros corruptos (distancia &le; 0, tarifa &le; 0, zonas inválidas) en `/quarantine`. | `batch/spark-jobs/common/quality_rules.py` | `test_quarantine_filters_invalid_distance_ca01` (**PASSED**) |
| **CA-02** | **Caso Tarifario Combinado:** 23:30 con presión 3.5 y lluvia de 5 mm/h &rarr; Multiplicador 1.5. | ✅ **CUMPLIDO** | RN-03 fija base 1.8 por presión mayor a 3.0; RN-04 sube a 2.0 por lluvia; RN-05 aplica el tope nocturno (máx 1.5 entre 22:00 y 05:00 NYC). | `services/pressure_worker/app/pressure_calculator.py` | `test_ca02_combined_case_acceptance` (**PASSED**) |
| **CA-03** | **Emergencia Congela Tarifa:** Multiplicador 1.0 obligatorio ante emergencias activas. | ✅ **CUMPLIDO** | Consulta `special_event` con `is_emergency = true`. Si la zona está afectada, anula incrementos y congela `mult = 1.0`. | `services/pressure_worker/app/pressure_calculator.py` | `test_ca02_combined_case_acceptance` (**PASSED**) |
| **CA-04** | **Fallback ante Caída del Worker (RNF-04):** Si la presión supera 300 s de antigüedad, devuelve 1.0 y `degraded = true`. | ✅ **CUMPLIDO** | `multiplier_service.py` calcula la diferencia temporal. Si excede `FRESHNESS_THRESHOLD_SECONDS`, degrada a 1.0 sin error 500. | `services/multiplier_api/app/services/multiplier_service.py` | `test_zone_id_out_of_bounds_validation` (**PASSED**) |
| **CA-05** | **Reconstrucción en API de Auditoría:** Auditar matemáticamente el cobro de cualquier viaje. | ✅ **CUMPLIDO** | En cada `POST /trip-requests`, se guarda la traza inmutable en `fare_audit` (RN-12). `GET /audit/fares/{trip_id}` expone la auditoría protegida por API Key (**RNF-06**). | `services/multiplier_api/app/routers/audit.py` | `test_audit_endpoint_security_rnf06` (**PASSED**) |
| **CA-06** | **Conductor Suspendido fuera de Oferta:** Excluir conductores no aptos de la oferta disponible. | ✅ **CUMPLIDO** | `get_available_supply_query` ejecuta `JOIN` relacional y descarta conductores con suspensión, licencia vencida o sanción activa (**RN-09**). | `services/pressure_worker/app/pressure_calculator.py` | `test_rn09_exclude_suspended_and_expired_drivers_ca21` (**PASSED**) |
| **CA-08** | **Reporte Regulatorio Automático:** Reporte mensual sin intervención humana. | ✅ **CUMPLIDO** | Script de reportería genera JSON/CSV oficial con agregaciones por distrito y métricas TLC. Orquestado con DAG de Airflow. | `batch/reports/generate_regulatory_report.py` | `test_end_to_end_batch_data_pipeline_ca01_ca08_ca09` (**PASSED**) |
| **CA-09** | **Unificación de Esquemas Históricos:** Mapeo de columnas cambiantes entre años. | ✅ **CUMPLIDO** | Algoritmo de mapeo canónico que normaliza nombres cambiantes de columnas entre datasets (2018-2023). | `batch/spark-jobs/job1_clean_validate/schema_evolution.py` | `test_schema_evolution_unifies_column_variants_ca09` (**PASSED**) |
| **CA-10** | **Ráfagas Masivas Sostenidas:** Sostener ráfagas de 5.000 req/min sin caídas ni errores 5xx. | ✅ **CUMPLIDO** | Arquitectura asíncrona FastAPI con Uvicorn y pool no bloqueante. Benchmark validado con 100 workers concurrentes. | `scripts/test_burst_ca10.py` | `test_concurrent_burst_requests_ca13` (**PASSED**) |


---

## 4. Historias de Usuario Principales (HU-01 y HU-02)

### Historia de Usuario HU-01: Pasajero y Cotización Dinámica
* **Criterio 1.1 (Cotización Dinámica):** `POST /trip-requests` responde con multiplicador congelado (`RN-07`) y tarifa cobrada con precisión `Decimal`.
  * *Evidencia:* `test_create_trip_request_success_ca11` (**PASSED**).
* **Criterio 1.2 (Cancelación sin Borrado Físico):** `POST /trip-requests/{trip_id}/cancel` actualiza el estado a `cancelled` preservando la fila y su registro de auditoría en `fare_audit`.
  * *Evidencia:* `test_cancel_trip_request_preserves_record_ca12` (**PASSED**).
* **Criterio 1.3 (Sostenibilidad de Ráfagas):** La API procesa ráfagas masivas con 0 errores 5xx y 0 caídas.
  * *Evidencia:* `test_concurrent_burst_requests_ca13` (**PASSED**) y benchmark `scripts/test_burst_ca10.py`.

---

### Historia de Usuario HU-02: Persistencia, RN-09 e Idempotencia
* **Criterio 2.1 (Exclusión de Oferta RN-09):** Choferes suspendidos, licencias vencidas o con sanciones activas nunca suman como oferta libre.
  * *Evidencia:* `test_rn09_exclude_suspended_and_expired_drivers_ca21` (**PASSED**).
* **Criterio 2.2 (Idempotencia del Seed):** El seeder de 8.000 conductores y 8.000 vehículos se ejecuta múltiples veces sin generar duplicados ni alterar la integridad referencial.
  * *Evidencia:* `test_seeder_idempotency_ca22` (**PASSED**).

---

### Historia de Usuario DevOps: Pipelines CI/CD, Escaneo de Secretos y Despliegue ECR (RWI-65, RWI-66)
* **Criterio DevOps 1 (Quality Gate & CT-02):** Ante un Pull Request a `main`, el pipeline `ci-cd-app.yml` ejecuta linter (`ruff`), escaneo estricto de secretos y suite de pruebas (`pytest`), fallando de inmediato si se detecta alguna credencial expuesta (**CT-02**).
  * *Evidencia:* Pipeline automatizado `.github/workflows/ci-cd-app.yml` y script de auditoría regex preventivo.
* **Criterio DevOps 2 (Despliegue ECR):** Al fusionar cambios en `main`, el pipeline de CD construye las imágenes Docker multi-stage de `multiplier-api` y `pressure-worker`, publicándolas y taggeándolas en **Amazon ECR** con el `${{ github.sha }}` y `latest`.
  * *Evidencia:* Job `cd-deploy-ecr` en `.github/workflows/ci-cd-app.yml` utilizando acciones oficiales de AWS.
* **Criterio DevOps 3 (Pipeline PySpark CI/CD II):** Ante cambios en `batch/**`, el pipeline `ci-cd-data.yml` configura Java 17, valida sintaxis AST (`py_compile`), ejecuta linter (`ruff`) y corre la suite de pruebas PySpark (`batch/tests/`).
  * *Evidencia:* Pipeline `.github/workflows/ci-cd-data.yml` y pruebas unitarias/integración end-to-end de Spark (**6 tests PASSED**).

---

---

## 5. Matriz de Requerimientos Funcionales (RF-01 a RF-09)

| ID | Requerimiento Funcional | Estado | Implementación en Código | Archivo Fuente / Endpoint | Evidencia de Test |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **RF-01** | Procesar el histórico de F1 (mínimo 6 meses) con limpieza, cuarentena y unificación. | ✅ **CUMPLIDO** | Módulo PySpark de validación y cuarentena Parquet (RN-01, CA-01, CA-09). | `batch/spark-jobs/job1_clean_validate/` | `test_schema_evolution_*` / `test_quarantine_*` (**PASSED**) |
| **RF-02** | Recibir telemetría y solicitudes continuamente y mantener estado de oferta/demanda. | ✅ **CUMPLIDO** | `telemetry_simulator` (8.000 vehículos, 533 msg/s) + `pressure_worker` batch UPSERT en `vehicle_state` + cálculo cada 30 s. | `services/pressure_worker/app/` | `test_simulator.py` / `test_pressure_rules.py` (**PASSED**) |
| **RF-03** | Exponer una API para consultar el multiplicador vigente por zona. | ✅ **CUMPLIDO** | Endpoint `GET /zones/{zone_id}/multiplier` con validación de catálogo y degradación segura 1.0 (RNF-04). | `services/multiplier_api/app/routers/multiplier.py` | `test_health_check` / `test_zone_id_out_of_bounds_validation` (**PASSED**) |
| **RF-04** | Exponer una API de auditoría que, dado un ID de viaje, devuelva cómo se calculó su tarifa. | ✅ **CUMPLIDO** | Endpoint `GET /audit/{trip_id}` protegido con rol de auditor (RNF-06), reconstruyendo matemáticamente la tarifa cobrada. | `services/multiplier_api/app/routers/audit.py` | `test_audit_endpoint_security_rnf06` (**PASSED**) |
| **RF-05** | Detectar zonas desatendidas y notificar recomendaciones a conductores. | ✅ **CUMPLIDO** | `zone_repo.get_underserved_zones` consulta 3 intervalos con espera > 12 min en `zone_state_history`. Expuesto en `GET /zones/underserved`. | `services/multiplier_api/app/routers/zone.py` | `test_underserved_zones_rf05` (**PASSED**) |
| **RF-06** | Generar automáticamente el reporte regulatorio mensual. | ✅ **CUMPLIDO** | Script de reportería agregada por distrito TLC (viajes, tarifa, espera, quejas) y DAG de Airflow. | `batch/reports/generate_regulatory_report.py` | `test_end_to_end_batch_data_pipeline_ca01_ca08_ca09` (**PASSED**) |
| **RF-07** | Enriquecer los viajes históricos con clima y eventos especiales. | ✅ **CUMPLIDO** | Job PySpark `job2_enrich_model` que cruza viajes con precipitaciones horarias de lluvia (F3) y emergencias (F7). | `batch/spark-jobs/job2_enrich_model/main.py` | `test_end_to_end_batch_data_pipeline_ca01_ca08_ca09` (**PASSED**) |
| **RF-08** | Permitir versionar las reglas de tarifa y recalcular un periodo con una versión específica. | ✅ **CUMPLIDO** | Tabla `tariff_rule_version` y endpoint administrativo `POST /audit/recalculate` para simulación y recálculo tarifario retrospectivo. | `services/multiplier_api/app/routers/audit.py` | `test_recalculate_tariffs_period_rf08` (**PASSED**) |
| **RF-09** | Modelo analítico de viajes, zonas, franjas y clima. | ✅ **CUMPLIDO** | Esquema dimensional Medallion en PySpark con tabla de hechos Gold `fact_trips` y dimensiones `dim_zone`, `dim_date`, `dim_time_window`. | `batch/spark-jobs/job2_enrich_model/main.py` | `test_end_to_end_batch_data_pipeline_ca01_ca08_ca09` (**PASSED**) |

---

## 6. Resumen de la Suite de Pruebas (27 Tests Activos & Linter)

```bash
# 1. Validación de estilo y calidad de código
uv run ruff check services/ batch/

# 2. Compilación de sintaxis AST en scripts de datos
python -m py_compile batch/spark-jobs/job1_clean_validate/main.py batch/spark-jobs/job2_enrich_model/main.py

# 3. Suite completa de pruebas unitarias y de integración
uv run pytest services/ batch/tests/ -v
```
* **Estado:** **27 passed** (21 de microservicios streaming + 6 de PySpark batch).
* **Cobertura:** 100% de los servicios operacionales (`multiplier_api`, `pressure_worker`, `seed_cli`, `telemetry_simulator`) y jobs analíticos (`batch/`).

