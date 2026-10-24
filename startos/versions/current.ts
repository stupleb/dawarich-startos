import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.17.0:0',
  releaseNotes: {
    en_US:
      'Updated Dawarich to 1.17.0: long trips and the points page open much faster, large imports need less memory, and Foursquare Swarm check-ins can be imported. Server-side poster rendering moves to a Node.js release with a security fix. [Full release notes](https://github.com/Freika/dawarich/releases/tag/1.17.0)',
    es_ES:
      'Dawarich actualizado a 1.17.0: los viajes largos y la página de puntos se abren mucho más rápido, las importaciones grandes necesitan menos memoria y se pueden importar los check-ins de Foursquare Swarm. La generación de pósteres en el servidor pasa a una versión de Node.js con una corrección de seguridad. [Notas completas](https://github.com/Freika/dawarich/releases/tag/1.17.0)',
    de_DE:
      'Dawarich auf 1.17.0 aktualisiert: Lange Reisen und die Punkteseite öffnen sich viel schneller, große Importe brauchen weniger Speicher, und Check-ins aus Foursquare Swarm lassen sich importieren. Das Erstellen von Postern auf dem Server läuft jetzt mit einer Node.js-Version, die eine Sicherheitslücke schließt. [Vollständige Versionshinweise](https://github.com/Freika/dawarich/releases/tag/1.17.0)',
    pl_PL:
      'Zaktualizowano Dawarich do wersji 1.17.0: długie podróże i strona punktów otwierają się znacznie szybciej, duże importy zużywają mniej pamięci, a zameldowania z Foursquare Swarm można importować. Tworzenie plakatów na serwerze korzysta teraz z wersji Node.js z poprawką bezpieczeństwa. [Pełne informacje o wydaniu](https://github.com/Freika/dawarich/releases/tag/1.17.0)',
    fr_FR:
      "Dawarich mis à jour vers 1.17.0 : les longs voyages et la page des points s'ouvrent bien plus vite, les gros imports demandent moins de mémoire, et les check-ins de Foursquare Swarm peuvent être importés. La création des affiches sur le serveur passe à une version de Node.js qui corrige une faille de sécurité. [Notes de version complètes](https://github.com/Freika/dawarich/releases/tag/1.17.0)",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
