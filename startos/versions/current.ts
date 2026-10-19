import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.15.3:4',
  releaseNotes: {
    en_US:
      'New Connect Photon and Disconnect Photon actions look up the addresses of locations with the Photon service, in the countries it serves.',
    es_ES:
      'Las nuevas acciones Conectar Photon y Desconectar Photon buscan las direcciones de las ubicaciones con el servicio Photon, en los países que sirve.',
    de_DE:
      'Die neuen Aktionen Photon verbinden und Photon trennen ermitteln die Adressen von Standorten mit dem Dienst Photon, in den Ländern, die er abdeckt.',
    pl_PL:
      'Nowe akcje Połącz Photon i Rozłącz Photon wyszukują adresy lokalizacji za pomocą usługi Photon, w obsługiwanych przez nią krajach.',
    fr_FR:
      'Les nouvelles actions Connecter Photon et Déconnecter Photon recherchent l’adresse des positions avec le service Photon, dans les pays qu’il sert.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
