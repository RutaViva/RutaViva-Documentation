# 🚖 RutaViva Mobility — Portal de Documentación Técnica

<p align="center">
  <img src="docusaurus/static/img/rutaviva-logo.png" alt="RutaViva Logo" width="160" />
</p>

<p align="center">
  <strong>Plataforma integral de datos, telemetría en tiempo real y tarificación dinámica para flotas urbanas</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Docusaurus-v3.0+-00845C?style=flat-square&logo=docusaurus&logoColor=white" alt="Docusaurus" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18.0.0-00B47C?style=flat-square&logo=node.js&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/Flota-~8%2C000_Veh%C3%ADculos-059669?style=flat-square" alt="Flota" />
  <img src="https://img.shields.io/badge/Status-Sprint_2_Completado-34D399?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/Licencia-Proprietaria_/_Interna-064E3B?style=flat-square" alt="License" />
</p>

---

## 📌 Visión del Proyecto

**RutaViva Mobility** es una plataforma distribuida de ingeniería de datos y backend diseñada para monitorear, gestionar y optimizar una flota de aproximadamente **8,000 vehículos** en tiempo real. 

El sistema soluciona la rigidez del esquema tarifario tradicional y la falta de visibilidad en la relación **oferta vs. demanda** en zonas urbanas mediante:

1. **Ingesta de Telemetría GPS Continua**: Eventos emitidos cada 15 segundos procesados mediante mensajería asíncrona AMQP (RabbitMQ) y catalogación espacial basada en R-Tree (`GeoPandas`).
2. **Motor de Presión y Tarificación Dinámica (*Surge Pricing*)**: Algoritmo desacoplado capaz de computar en ventanas móviles la demanda de pasajeros contra la oferta vehicular disponible y condiciones climáticas adversas, con degradación elegante de servicio (`RNF-04`).
3. **Auditoría Transaccional Inmutable**: Reconstrucción matemática transparente y auditable de cada tarifa aplicada con trazabilidad criptográfica.
4. **Lakehouse Analítico Medallion**: Ingesta masiva y procesamiento distribuido batch con **Apache Spark** y orquestación con **Airflow** (capas Bronze, Silver y Gold) para alimentar tableros de control y generar automáticamente reportes regulatorios.

---

## 🧭 Estructura del Portal de Documentación

Este repositorio contiene el portal oficial de documentación desarrollado con **Docusaurus 3**, que cuenta con:

- 🌐 **Landing Page Rápida y Responsiva (`/`)**:
  - Interfaz ligera adaptada a la identidad visual y paleta oficial verde esmeralda / menta (`#00B47C`, `#00845C`, `#F0FDF8`).
  - **Simulador Interactivo de Tarifas**: Widget interactivo en JavaScript/React que permite manipular la demanda, oferta vehicular y clima en tiempo real para visualizar el cálculo del multiplicador dinámico y el hash de trazabilidad.
  - Métricas clave de impacto del negocio (-25% tiempo de espera, +15% utilización en horas valle).
  - Acceso directo a cada microservicio y módulo del ecosistema.

- 📚 **Documentación Técnica Detallada (`/docs`)**:
  - **🚀 Inicio & Visión General**: Metas, actores del sistema y mapa de navegación conceptual.
  - **🏛 Arquitectura del Sistema**: Pipeline end-to-end, diagramas C4, ADRs (Architecture Decision Records), y análisis de puntos abiertos y tensiones operativas.
  - **🗄️ Modelado de Datos**: MER Operacional en PostgreSQL 16 (13 tablas modeladas con Alembic), diseño analítico Gold dimensional, correspondencia y glosario técnico.
  - **🧩 Módulos y Microservicios**:
    - `multiplier_api`: Microservicio REST FastAPI con degradación segura.
    - `telemetry_simulator`: Motor de simulación espacial con inyección de defectos (`HU-02`).
    - `pressure_worker`: Consumidor concurrente de eventos y cómputo de presión.
    - `seed_cli`: CLI determinista e idempotente de catálogo TLC NYC y choferes sintéticos.
    - `batch-spark-airflow`: Pipelines de ingestión y analítica histórica.
  - **⚖️ Reglas de Negocio & Auditoría**: Matriz de multiplicadores y protocolos de auditoría transaccional.
  - **🛠️ Guías de Desarrollo**: Guía paso a paso para levantar la infraestructura completa en local con Docker Compose y roadmap de sprints.

---

## 🚀 Puesta en Marcha Local del Portal

### Requisitos Previos

- [Node.js](https://nodejs.org/) `>= 18.0.0`
- [npm](https://www.npmjs.com/) `>= 9.0.0`

### 1. Clonar el Repositorio e Instalar Dependencias

```bash
cd docusaurus
npm install
```

### 2. Iniciar el Servidor de Desarrollo

```bash
npm start
```

El portal se levantará automáticamente en [http://localhost:3000](http://localhost:3000) con recarga en caliente (*hot-reload*).

### 3. Compilar para Producción

Para validar o generar los archivos estáticos optimizados en `docusaurus/build`:

```bash
npm run build
```

Para probar localmente la versión compilada de producción:

```bash
npm run serve
```

---

## 📂 Organización del Proyecto

```text
RutaViva-Documentation/
├── README.md                  # Este documento general
└── docusaurus/                # Proyecto Docusaurus
    ├── docs/                  # Artículos y especificaciones en Markdown/MDX
    │   ├── arquitectura/      # Diagramas C4, ADRs, pipeline end-to-end
    │   ├── datos/             # Modelo operacional MER y analítico Gold
    │   ├── guias/             # Puesta en marcha local y roadmap de sprints
    │   ├── modulos/           # Documentación por componente / microservicio
    │   └── reglas-negocio/    # Auditoría, trazabilidad y fórmulas tarifarias
    ├── src/
    │   ├── css/
    │   │   └── custom.css     # Paleta de colores oficial y estilos globales
    │   └── pages/
    │       ├── index.js       # Landing page responsiva con simulador en vivo
    │       └── index.module.css # Estilos modulares y layout adaptable
    ├── static/
    │   └── img/               # Logotipos oficiales, esquemas y recursos gráficos
    ├── docusaurus.config.js   # Configuración de rutas, navbar, footer y temas
    ├── sidebars.js            # Jerarquía del menú lateral de documentación
    └── package.json           # Dependencias y scripts de construcción
```

---

## 🎨 Identidad Visual y Paleta de Colores

La interfaz sigue fielmente la guía gráfica del logotipo oficial de RutaViva:

| Color | Hex | Uso en la Interfaz |
|---|---|---|
| **Verde Esmeralda Vibrante** | `#00B47C` | Botones principales, estados activos, gradientes de destaque y radar |
| **Verde Bosque Profundo** | `#00845C` | Títulos primarios, enlaces con hover, facetado de marca y bordes |
| **Menta Hielo Claro** | `#F0FDF8` / `#E8FDEF` | Fondos de tarjetas, sección del simulador y efecto mapa |
| **Verde Oscuro Contraste** | `#064E3B` | Tipografía de títulos, badges oscuros y pie de página |
| **Acento Neón / Éxito** | `#34D399` | Modo oscuro, badges de estado operativo e indicadores |

---

## 👥 Equipo y Contacto

- **Proyecto**: RutaViva Mobility Inc.
- **Área**: Data Engineering, Cloud & Analytics Architecture.
- **Sprint Activo**: Sprint 2 — Telemetría, Simulación y API de Multiplicador v1.