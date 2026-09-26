import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.15.2:0',
  releaseNotes: {
    en_US: 'Initial release of Dawarich 1.15.2 for StartOS.',
    es_ES: 'Primera versión de Dawarich 1.15.2 para StartOS.',
    de_DE: 'Erste Veröffentlichung von Dawarich 1.15.2 für StartOS.',
    pl_PL: 'Pierwsze wydanie Dawarich 1.15.2 dla StartOS.',
    fr_FR: 'Première version de Dawarich 1.15.2 pour StartOS.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
