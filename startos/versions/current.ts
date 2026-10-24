import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.16.0:2',
  releaseNotes: {
    en_US:
      'Dawarich asks you to confirm the address used in the links of its emails, and asks again if that address is removed. Its web server also uses less memory, and the new Set Worker Count action lets it serve more visitors at once.',
    es_ES:
      'Dawarich te pide confirmar la dirección que usan los enlaces de sus correos, y vuelve a pedirlo si esa dirección se elimina. Su servidor web también usa menos memoria, y la nueva acción Establecer número de procesos le permite atender a más visitantes a la vez.',
    de_DE:
      'Dawarich bittet dich, die Adresse für die Links in seinen E-Mails zu bestätigen, und fragt erneut, wenn diese Adresse entfernt wird. Sein Webserver braucht außerdem weniger Speicher, und die neue Aktion Worker-Anzahl festlegen lässt ihn mehr Besucher gleichzeitig bedienen.',
    pl_PL:
      'Dawarich prosi o potwierdzenie adresu używanego w linkach w jego wiadomościach e-mail i pyta ponownie, gdy ten adres zostanie usunięty. Jego serwer WWW zużywa też mniej pamięci, a nowa akcja Ustaw liczbę procesów pozwala mu obsłużyć więcej odwiedzających jednocześnie.',
    fr_FR:
      "Dawarich vous demande de confirmer l'adresse utilisée dans les liens de ses e-mails, et vous la redemande si cette adresse est supprimée. Son serveur web utilise aussi moins de mémoire, et la nouvelle action Définir le nombre de processus lui permet de servir plus de visiteurs à la fois.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
