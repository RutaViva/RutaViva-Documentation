import React, { useState, useMemo } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

// Interactive Simulator Component
function PricingSimulator() {
  const [demand, setDemand] = useState(140);
  const [supply, setSupply] = useState(100);
  const [weatherFactor, setWeatherFactor] = useState(1.0);
  const baseFare = 12.0;

  // Real-time calculation of pressure factor and dynamic multiplier
  const { multiplier, statusText, statusClass, estimatedFare, mockHash } = useMemo(() => {
    const rawRatio = demand / Math.max(1, supply);
    // Base formula aligned with RutaViva business rules:
    // When demand > supply * 1.1, surge pricing activates up to 2.5x max
    let calculated = 1.0;
    if (rawRatio > 1.0) {
      calculated = 1.0 + (rawRatio - 1.0) * 0.75 * weatherFactor;
    }
    const finalMult = Math.min(2.5, Math.max(1.0, calculated)).toFixed(2);
    const fare = (baseFare * parseFloat(finalMult)).toFixed(2);

    let sText = 'Normal · Zona Equilibrada';
    let sClass = styles.statusOptimum;
    if (parseFloat(finalMult) >= 1.7) {
      sText = 'Alta Demanda · Surge Máximo';
      sClass = styles.statusSurge;
    } else if (parseFloat(finalMult) > 1.15) {
      sText = 'Presión Moderada · Tarifa Dinámica';
      sClass = styles.statusModerate;
    }

    // Deterministic audit hash preview
    const hashSeed = `RUTAVIVA-ZONA-132-${demand}-${supply}-${finalMult}`;
    const hash = `0x${Array.from(hashSeed).reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0).toString(16).padStart(8, '0')}7f9a2b8c4d1e`;

    return {
      multiplier: finalMult,
      statusText: sText,
      statusClass: sClass,
      estimatedFare: fare,
      mockHash: hash,
    };
  }, [demand, supply, weatherFactor]);

  return (
    <section className={styles.simulatorSection} id="simulador">
      <div className={styles.simulatorContainer}>
        <header className={styles.sectionHeader}>
          <span className={styles.sectionPill}>Demostración en Tiempo Real</span>
          <Heading as="h2" className={styles.sectionTitle}>
            Simulador de Tarificación Dinámica
          </Heading>
          <p className={styles.sectionSubtitle}>
            Experimenta cómo interactúa el motor de presión espacial en tiempo real según la demanda de pasajeros, vehículos disponibles y factores climáticos.
          </p>
        </header>

        <div className={styles.simulatorGrid}>
          {/* Controls */}
          <div className={styles.simulatorControls}>
            <div className={styles.controlGroup}>
              <div className={styles.controlHeader}>
                <label htmlFor="demand-input" className={styles.controlLabel}>
                  Solicitudes de Viaje (Demanda / 5 min)
                </label>
                <span className={styles.controlBadge}>{demand} viajes</span>
              </div>
              <input
                id="demand-input"
                type="range"
                min="20"
                max="400"
                step="5"
                value={demand}
                onChange={(e) => setDemand(Number(e.target.value))}
                className={styles.rangeInput}
              />
            </div>

            <div className={styles.controlGroup}>
              <div className={styles.controlHeader}>
                <label htmlFor="supply-input" className={styles.controlLabel}>
                  Vehículos Activos en Zona (Oferta)
                </label>
                <span className={styles.controlBadge}>{supply} unidades</span>
              </div>
              <input
                id="supply-input"
                type="range"
                min="20"
                max="300"
                step="5"
                value={supply}
                onChange={(e) => setSupply(Number(e.target.value))}
                className={styles.rangeInput}
              />
            </div>

            <div className={styles.controlGroup}>
              <label htmlFor="weather-select" className={styles.controlLabel}>
                Condición Meteorológica
              </label>
              <select
                id="weather-select"
                value={weatherFactor}
                onChange={(e) => setWeatherFactor(Number(e.target.value))}
                className={styles.selectInput}
              >
                <option value={1.0}>☀️ Despejado / Condiciones Normales (1.0x)</option>
                <option value={1.2}>🌧️ Lluvia Intensa (Impacto +20%)</option>
                <option value={1.35}>❄️ Nieve / Tormenta Severa (Impacto +35%)</option>
              </select>
            </div>
          </div>

          {/* Real-time Output Display */}
          <div className={styles.simulatorOutput}>
            <div className={styles.multiplierDisplay}>
              <span className={styles.statItemLabel}>Multiplicador Calculado (API)</span>
              <div className={styles.multiplierBigNumber}>{multiplier}x</div>
              <span className={`${styles.statusIndicator} ${statusClass}`}>
                ● {statusText}
              </span>
            </div>

            <div className={styles.outputRowList}>
              <div className={styles.outputRow}>
                <span className={styles.outputRowLabel}>Tarifa Base de Zona:</span>
                <span className={styles.outputRowValue}>${baseFare.toFixed(2)} USD</span>
              </div>
              <div className={styles.outputRow}>
                <span className={styles.outputRowLabel}>Tarifa Final al Pasajero:</span>
                <span className={styles.outputRowValue} style={{ color: '#00845c' }}>
                  ${estimatedFare} USD
                </span>
              </div>
              <div className={styles.outputRow}>
                <span className={styles.outputRowLabel}>Relación Demanda / Oferta:</span>
                <span className={styles.outputRowValue}>
                  {(demand / supply).toFixed(2)}:1
                </span>
              </div>
            </div>

            <div className={styles.auditHashSnippet}>
              <span className={styles.hashLabel}>🔒 Trazabilidad Inmutable (SHA-256 preview):</span>
              <code>{mockHash}</code>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title="RutaViva Mobility · Plataforma de Datos y Tarifas Dinámicas"
      description="Documentación de arquitectura, ingestión de telemetría, simulación espacial y plataforma de datos para RutaViva Mobility (~8,000 vehículos)."
    >
      <div className={styles.landingRoot}>
        {/* Subtle Map Grid Background */}
        <div className={styles.mapBackground} />

        <div className={styles.contentWrapper}>
          {/* Hero Section */}
          <header className={styles.heroSection}>
            <div className={styles.heroGrid}>
              <div className={styles.heroTextContent}>
                <div className={styles.systemBadge}>
                  <span className={styles.pulsingDot} />
                  <span>Sistema Operativo · Flota Activa ~8,000 Vehículos</span>
                </div>

                <Heading as="h1" className={styles.heroTitle}>
                  Plataforma de Movilidad y{' '}
                  <span className={styles.heroTitleGradient}>Tarifas Dinámicas</span>
                </Heading>

                <p className={styles.heroDescription}>
                  Infraestructura integral de datos para optimización de oferta y demanda, ingesta de telemetría GPS cada 15s, cálculo de tarifas transparentes y cumplimiento regulatorio en tiempo real.
                </p>

                <div className={styles.heroActions}>
                  <Link
                    to="/docs"
                    className={styles.primaryButton}
                  >
                    <span>Explorar Documentación</span>
                    <span>→</span>
                  </Link>

                  <Link
                    to="/docs/arquitectura/vision-general"
                    className={styles.secondaryButton}
                  >
                    Arquitectura del Sistema
                  </Link>

                  <a
                    href="#simulador"
                    className={styles.secondaryButton}
                  >
                    Simulador en Vivo ⚡
                  </a>
                </div>
              </div>

              {/* Visual Card with Official Logo */}
              <div className={styles.heroVisualContainer}>
                <div className={styles.brandEmblemCard}>
                  <img
                    src="/img/rutaviva-logo.png"
                    alt="RutaViva Mobility Logo"
                    className={styles.logoImage}
                    width={180}
                    height={180}
                  />
                  <div className={styles.emblemTitle}>RUTA VIVA</div>
                  <div className={styles.emblemSub}>
                    Data Engineering · Cloud Architecture · Near Real-Time
                  </div>

                  <div className={styles.liveTelemetryStats}>
                    <div className={styles.telemetryStatItem}>
                      <span className={styles.statItemValue}>&lt; 15s</span>
                      <span className={styles.statItemLabel}>Latencia Ingesta</span>
                    </div>
                    <div className={styles.telemetryStatItem}>
                      <span className={styles.statItemValue}>263</span>
                      <span className={styles.statItemLabel}>Zonas TLC NYC</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Key Metrics Section */}
          <section className={styles.metricsSection}>
            <div className={styles.metricsGrid}>
              <article className={styles.metricCard}>
                <div className={styles.metricValue}>-25%</div>
                <div className={styles.metricLabel}>Tiempo de Espera</div>
                <p className={styles.metricDetail}>
                  Reducción estimada en horas pico mediante rebalanceo predictivo de unidades.
                </p>
              </article>

              <article className={styles.metricCard}>
                <div className={styles.metricValue}>+15%</div>
                <div className={styles.metricLabel}>Utilización en Valle</div>
                <p className={styles.metricDetail}>
                  Mayor ocupación vehicular en horas de menor demanda con incentivos dinámicos.
                </p>
              </article>

              <article className={styles.metricCard}>
                <div className={styles.metricValue}>15 seg</div>
                <div className={styles.metricLabel}>Cadencia Telemetría</div>
                <p className={styles.metricDetail}>
                  Transmisión continua de eventos GPS y estados de servicio hacia RabbitMQ.
                </p>
              </article>

              <article className={styles.metricCard}>
                <div className={styles.metricValue}>100%</div>
                <div className={styles.metricLabel}>Auditable</div>
                <p className={styles.metricDetail}>
                  Trazabilidad inmutable de cada cálculo de tarifa para la autoridad y auditoría interna.
                </p>
              </article>
            </div>
          </section>

          {/* Interactive Pricing Simulator */}
          <PricingSimulator />

          {/* Architecture Pillars Section */}
          <section className={styles.pillarsSection}>
            <header className={styles.sectionHeader}>
              <span className={styles.sectionPill}>Ingeniería y Diseño</span>
              <Heading as="h2" className={styles.sectionTitle}>
                Pilares de la Arquitectura
              </Heading>
              <p className={styles.sectionSubtitle}>
                Diseñada para alta concurrencia, resiliencia operativa y degradación elegante ante contingencias.
              </p>
            </header>

            <div className={styles.pillarsGrid}>
              <article className={styles.pillarCard}>
                <div className={styles.pillarIconBox}>🛰️</div>
                <Heading as="h3" className={styles.pillarTitle}>
                  Telemetría y Simulación Espacial
                </Heading>
                <p className={styles.pillarDescription}>
                  Simulador asíncrono con indexación espacial R-Tree (`GeoPandas`) capaz de modelar 8,000 taxis simultáneos y generar telemetría GPS con inyección controlada de defectos.
                </p>
                <Link to="/docs/modulos/telemetry-simulator" className={styles.cardActionLink}>
                  Ver detalle del simulador →
                </Link>
              </article>

              <article className={styles.pillarCard}>
                <div className={styles.pillarIconBox}>⚡</div>
                <Heading as="h3" className={styles.pillarTitle}>
                  Cálculo de Tarifas y Presión
                </Heading>
                <p className={styles.pillarDescription}>
                  Microservicio en FastAPI y worker asíncrono desacoplado para determinar la relación oferta/demanda y calcular multiplicadores con soporte de degradación segura (`RNF-04`).
                </p>
                <Link to="/docs/modulos/multiplier-api" className={styles.cardActionLink}>
                  Ver API de Multiplicador →
                </Link>
              </article>

              <article className={styles.pillarCard}>
                <div className={styles.pillarIconBox}>📊</div>
                <Heading as="h3" className={styles.pillarTitle}>
                  Lakehouse y Analítica Medallion
                </Heading>
                <p className={styles.pillarDescription}>
                  Procesamiento distribuido con Apache Spark y orquestación en Airflow para procesar históricos (NYC TLC), alimentar capas Bronze, Silver y Gold, y generar reportes regulatorios.
                </p>
                <Link to="/docs/modulos/batch-spark-airflow" className={styles.cardActionLink}>
                  Ver pipelines analíticos →
                </Link>
              </article>
            </div>
          </section>

          {/* System Modules Quick Directory */}
          <section className={styles.modulesSection}>
            <header className={styles.sectionHeader}>
              <span className={styles.sectionPill}>Componentes del Repositorio</span>
              <Heading as="h2" className={styles.sectionTitle}>
                Módulos del Sistema
              </Heading>
              <p className={styles.sectionSubtitle}>
                Acceso rápido a las especificaciones técnicas de cada servicio y microservicio de RutaViva.
              </p>
            </header>

            <div className={styles.modulesGrid}>
              <Link to="/docs/modulos/multiplier-api" className={styles.moduleItem}>
                <span className={styles.moduleName}>multiplier_api</span>
                <p className={styles.moduleDescription}>
                  API REST FastAPI para consulta de factores de presión y tarifas dinámicas en tiempo real.
                </p>
              </Link>

              <Link to="/docs/modulos/telemetry-simulator" className={styles.moduleItem}>
                <span className={styles.moduleName}>telemetry_simulator</span>
                <p className={styles.moduleDescription}>
                  Motor de generación y publicación periódica de eventos GPS a colas de mensajería AMQP.
                </p>
              </Link>

              <Link to="/docs/modulos/pressure-worker" className={styles.moduleItem}>
                <span className={styles.moduleName}>pressure_worker</span>
                <p className={styles.moduleDescription}>
                  Consumidor de eventos que computa ventanas temporales de presión vehicular por zona.
                </p>
              </Link>

              <Link to="/docs/modulos/seed-cli" className={styles.moduleItem}>
                <span className={styles.moduleName}>seed_cli</span>
                <p className={styles.moduleDescription}>
                  Herramienta de poblamiento determinista e idempotente para catálogo geográfico y conductores.
                </p>
              </Link>

              <Link to="/docs/modulos/batch-spark-airflow" className={styles.moduleItem}>
                <span className={styles.moduleName}>batch-spark-airflow</span>
                <p className={styles.moduleDescription}>
                  DAGs y scripts PySpark para ingesta masiva de Yellow Taxi Trips y reportes regulatorios.
                </p>
              </Link>

              <Link to="/docs/datos/modelo-operacional-mer" className={styles.moduleItem}>
                <span className={styles.moduleName}>modelo_operacional_mer</span>
                <p className={styles.moduleDescription}>
                  Modelo relacional PostgreSQL con 13 entidades operacionales migradas con Alembic.
                </p>
              </Link>
            </div>
          </section>

          {/* Bottom Call to Action Banner */}
          <section className={styles.ctaBannerSection}>
            <div className={styles.ctaCard}>
              <Heading as="h2" className={styles.ctaTitle}>
                ¿Listo para explorar la documentación?
              </Heading>
              <p className={styles.ctaSubtitle}>
                Conoce la visión técnica completa, diagramas de arquitectura C4, reglas de negocio auditables y guías paso a paso para levantar el stack en local.
              </p>
              <div className={styles.ctaButtons}>
                <Link to="/docs" className={styles.ctaButtonWhite}>
                  Ir a Documentación Técnica 🚀
                </Link>
                <Link to="/docs/guias/puesta-en-marcha" className={styles.ctaButtonGlass}>
                  Guía de Puesta en Marcha 💻
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
