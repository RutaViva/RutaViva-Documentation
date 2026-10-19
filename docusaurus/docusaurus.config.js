// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'RutaViva Mobility',
  tagline: 'Plataforma de Datos, Telemetría y Tarifas Dinámicas',
  favicon: 'img/rutaviva-logo.svg',

  url: 'https://rutaviva.mobility.internal',
  baseUrl: '/',

  organizationName: 'rutaviva',
  projectName: 'rutaviva-docs',

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: 'docs', // Documentación técnica en /docs
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'RutaViva Mobility',
        logo: {
          alt: 'RutaViva Logo',
          src: 'img/rutaviva-logo.svg',
          srcDark: 'img/rutaviva-logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Documentación Técnica',
          },
          {
            to: '/docs/arquitectura/vision-general',
            label: 'Arquitectura',
            position: 'left',
          },
          {
            to: '/docs/modulos/resumen',
            label: 'Módulos',
            position: 'left',
          },
          {
            to: '/docs/reglas-negocio/reglas-tarifarias',
            label: 'Reglas de Negocio',
            position: 'left',
          },
          {
            href: 'https://github.com',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentación',
            items: [
              {
                label: '🚀 Inicio de Docs',
                to: '/docs',
              },
              {
                label: '🏛 Arquitectura General',
                to: '/docs/arquitectura/vision-general',
              },
              {
                label: '🧩 Módulos y Microservicios',
                to: '/docs/modulos/resumen',
              },
              {
                label: '🗄️ Modelo de Datos (MER)',
                to: '/docs/datos/modelo-operacional-mer',
              },
            ],
          },
          {
            title: 'Reglas y Guías',
            items: [
              {
                label: '⚖️ Reglas Tarifarias',
                to: '/docs/reglas-negocio/reglas-tarifarias',
              },
              {
                label: '🔍 Auditoría y Trazabilidad',
                to: '/docs/reglas-negocio/auditoria-trazabilidad',
              },
              {
                label: '🛠️ Puesta en Marcha Local',
                to: '/docs/guias/puesta-en-marcha-a',
              },
              {
                label: '📅 Roadmap de Sprints',
                to: '/docs/guias/sprints-roadmap',
              },
            ],
          },
          {
            title: 'Proyecto',
            items: [
              {
                label: 'RutaViva Mobility Inc.',
                href: 'https://github.com',
              },
              {
                label: 'Plataforma de Telemetría (~8k Vehículos)',
                to: '/docs',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} RutaViva Mobility Inc. Plataforma de Ingeniería de Datos y Tarifas Dinámicas.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['python', 'bash', 'json', 'sql'],
      },
    }),
};

export default config;
