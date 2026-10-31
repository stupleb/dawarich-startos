import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.20.0:0',
  releaseNotes: {
    en_US:
      'Updated Dawarich to 1.20.0: achievement cards for the cities, national parks and countries you explore, a Fog of War built on the same explored areas, archived places, and no more spikes from cell-tower positions in the Android app. Release notes: [1.19.0](https://github.com/Freika/dawarich/releases/tag/1.19.0), [1.20.0](https://github.com/Freika/dawarich/releases/tag/1.20.0)\n\nBack up Dawarich before updating. After the update it reprocesses your whole history in the background, which can take hours on a long history and cannot be undone.',
    es_ES:
      'Dawarich actualizado a 1.20.0: tarjetas de logros por las ciudades, parques nacionales y países que exploras, un Fog of War basado en esas mismas zonas exploradas, lugares archivados y sin picos por las posiciones de antenas de telefonía en la app de Android. Notas de la versión: [1.19.0](https://github.com/Freika/dawarich/releases/tag/1.19.0), [1.20.0](https://github.com/Freika/dawarich/releases/tag/1.20.0)\n\nHaz una copia de seguridad de Dawarich antes de actualizar. Tras la actualización, reprocesa en segundo plano todo tu historial, lo que puede llevar horas con un historial largo y no se puede deshacer.',
    de_DE:
      'Dawarich auf 1.20.0 aktualisiert: Erfolgskarten für die Städte, Nationalparks und Länder, die du erkundest, ein Fog of War auf Grundlage derselben erkundeten Gebiete, archivierte Orte und keine Ausreißer mehr durch Funkmasten-Positionen der Android-App. Versionshinweise: [1.19.0](https://github.com/Freika/dawarich/releases/tag/1.19.0), [1.20.0](https://github.com/Freika/dawarich/releases/tag/1.20.0)\n\nSichere Dawarich vor dem Update. Danach verarbeitet es im Hintergrund deinen gesamten Verlauf neu. Das kann bei einem langen Verlauf Stunden dauern und lässt sich nicht rückgängig machen.',
    pl_PL:
      'Zaktualizowano Dawarich do wersji 1.20.0: karty osiągnięć za odkrywane miasta, parki narodowe i kraje, Fog of War oparty na tych samych odkrytych obszarach, archiwizowanie miejsc oraz koniec skoków na mapie przez pozycje z masztów komórkowych w aplikacji na Androida. Informacje o wydaniu: [1.19.0](https://github.com/Freika/dawarich/releases/tag/1.19.0), [1.20.0](https://github.com/Freika/dawarich/releases/tag/1.20.0)\n\nZrób kopię zapasową Dawarich przed aktualizacją. Po aktualizacji w tle przetwarza ponownie całą historię, co przy długiej historii może potrwać godziny i nie da się tego cofnąć.',
    fr_FR:
      "Dawarich mis à jour vers 1.20.0 : des cartes de succès pour les villes, parcs nationaux et pays que vous explorez, un Fog of War fondé sur ces mêmes zones explorées, l'archivage des lieux, et plus de pics dus aux positions d'antennes relais dans l'application Android. Notes de version : [1.19.0](https://github.com/Freika/dawarich/releases/tag/1.19.0), [1.20.0](https://github.com/Freika/dawarich/releases/tag/1.20.0)\n\nSauvegardez Dawarich avant de mettre à jour. Après la mise à jour, il retraite en arrière-plan tout votre historique, ce qui peut prendre des heures avec un long historique et ne peut pas être annulé.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
