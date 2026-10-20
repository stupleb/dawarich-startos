import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.16.0:0',
  releaseNotes: {
    en_US:
      'Updated Dawarich to 1.16.0: Stats and Insights become one Insights page, trips can be searched and filtered, and the map has a Family tab. [Full release notes](https://github.com/Freika/dawarich/releases/tag/1.16.0)\n\nThe first start after the update reloads country boundaries and recalculates achievements in the background, which can take a while on a long location history.',
    es_ES:
      'Dawarich actualizado a 1.16.0: Estadísticas e Insights pasan a ser una sola página de Insights, los viajes se pueden buscar y filtrar, y el mapa tiene una pestaña Familia. [Notas completas](https://github.com/Freika/dawarich/releases/tag/1.16.0)\n\nEl primer inicio tras la actualización vuelve a cargar los límites de los países y recalcula los logros en segundo plano, lo que puede tardar con un historial de ubicaciones largo.',
    de_DE:
      'Dawarich auf 1.16.0 aktualisiert: Statistiken und Insights werden zu einer Insights-Seite, Reisen lassen sich suchen und filtern, und die Karte hat einen Familien-Tab. [Vollständige Versionshinweise](https://github.com/Freika/dawarich/releases/tag/1.16.0)\n\nDer erste Start nach dem Update lädt die Ländergrenzen neu und berechnet die Erfolge im Hintergrund neu, was bei einem langen Standortverlauf eine Weile dauern kann.',
    pl_PL:
      'Zaktualizowano Dawarich do wersji 1.16.0: Statystyki i Insights tworzą jedną stronę Insights, podróże można wyszukiwać i filtrować, a mapa ma kartę Rodzina. [Pełne informacje o wydaniu](https://github.com/Freika/dawarich/releases/tag/1.16.0)\n\nPierwsze uruchomienie po aktualizacji ponownie wczytuje granice krajów i przelicza osiągnięcia w tle, co przy długiej historii lokalizacji może chwilę potrwać.',
    fr_FR:
      'Dawarich mis à jour vers 1.16.0 : Statistiques et Insights deviennent une seule page Insights, les voyages peuvent être recherchés et filtrés, et la carte a un onglet Famille. [Notes de version complètes](https://github.com/Freika/dawarich/releases/tag/1.16.0)\n\nLe premier démarrage après la mise à jour recharge les frontières des pays et recalcule les succès en arrière-plan, ce qui peut prendre un moment avec un long historique de positions.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
