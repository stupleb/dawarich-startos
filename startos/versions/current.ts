import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.15.3:1',
  releaseNotes: {
    en_US:
      'New Connect Immich and Disconnect Immich actions show a person’s Immich photos on their Dawarich map, connecting their Dawarich account to the Immich account with the same email address. They need Immich 3.3.1:2 or later.',
    es_ES:
      'Las nuevas acciones Conectar Immich y Desconectar Immich muestran las fotos de Immich de una persona en su mapa de Dawarich, conectando su cuenta de Dawarich con la cuenta de Immich que tiene la misma dirección de correo. Requieren Immich 3.3.1:2 o posterior.',
    de_DE:
      'Die neuen Aktionen Immich verbinden und Immich trennen zeigen die Immich-Fotos einer Person auf ihrer Dawarich-Karte, indem sie ihr Dawarich-Konto mit dem Immich-Konto mit derselben E-Mail-Adresse verbinden. Sie erfordern Immich 3.3.1:2 oder neuer.',
    pl_PL:
      'Nowe akcje Połącz Immich i Rozłącz Immich pokazują zdjęcia osoby z Immich na jej mapie w Dawarich, łącząc jej konto Dawarich z kontem Immich o tym samym adresie e-mail. Wymagają Immich 3.3.1:2 lub nowszego.',
    fr_FR:
      'Les nouvelles actions Connecter Immich et Déconnecter Immich affichent les photos Immich d’une personne sur sa carte Dawarich, en connectant son compte Dawarich au compte Immich ayant la même adresse e-mail. Elles nécessitent Immich 3.3.1:2 ou ultérieur.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
