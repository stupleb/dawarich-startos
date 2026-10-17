import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.15.3:3',
  releaseNotes: {
    en_US:
      'Dawarich’s actions stay available while a newly linked OwnTracks Recorder user’s history is imported.',
    es_ES:
      'Las acciones de Dawarich siguen disponibles mientras se importa el historial de un usuario de OwnTracks Recorder recién vinculado.',
    de_DE:
      'Die Aktionen von Dawarich bleiben verfügbar, während der Verlauf eines neu verknüpften OwnTracks-Recorder-Benutzers importiert wird.',
    pl_PL:
      'Akcje Dawarich pozostają dostępne podczas importu historii nowo połączonego użytkownika OwnTracks Recorder.',
    fr_FR:
      'Les actions de Dawarich restent disponibles pendant l’import de l’historique d’un utilisateur OwnTracks Recorder nouvellement lié.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
