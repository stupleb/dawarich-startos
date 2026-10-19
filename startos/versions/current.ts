import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.15.3:5',
  releaseNotes: {
    en_US:
      'New Connect AirTrail, Confirm AirTrail Account and Disconnect AirTrail actions import a person’s flights from the AirTrail service once you approve access in AirTrail.',
    es_ES:
      'Las nuevas acciones Conectar AirTrail, Confirmar cuenta de AirTrail y Desconectar AirTrail importan los vuelos de una persona desde el servicio AirTrail cuando apruebas el acceso en AirTrail.',
    de_DE:
      'Die neuen Aktionen AirTrail verbinden, AirTrail-Konto bestätigen und AirTrail trennen importieren die Flüge einer Person aus dem Dienst AirTrail, sobald du den Zugriff in AirTrail genehmigst.',
    pl_PL:
      'Nowe akcje Połącz AirTrail, Potwierdź konto AirTrail i Rozłącz AirTrail importują loty osoby z usługi AirTrail, gdy zatwierdzisz dostęp w AirTrail.',
    fr_FR:
      'Les nouvelles actions Connecter AirTrail, Confirmer le compte AirTrail et Déconnecter AirTrail importent les vols d’une personne depuis le service AirTrail une fois l’accès approuvé dans AirTrail.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
