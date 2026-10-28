import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.18.1:0',
  releaseNotes: {
    en_US:
      'Updated Dawarich to 1.18.1: geofencing with webhooks, privacy zones that also hide data on your own map, Areas merged into Places, and a choice of date and time formats. [Full release notes](https://github.com/Freika/dawarich/releases/tag/1.18.1)\n\nBack up Dawarich before updating. After the update it reworks tracks, flights, digests, places and visits across your whole history in the background, which can take hours on a long history and cannot be undone.',
    es_ES:
      'Dawarich actualizado a 1.18.1: geovallas con webhooks, zonas de privacidad que también ocultan datos en tu propio mapa, las Áreas se integran en los Lugares y puedes elegir el formato de fecha y hora. [Notas completas](https://github.com/Freika/dawarich/releases/tag/1.18.1)\n\nHaz una copia de seguridad de Dawarich antes de actualizar. Tras la actualización, rehace en segundo plano los trayectos, vuelos, resúmenes, lugares y visitas de todo tu historial, lo que puede llevar horas con un historial largo y no se puede deshacer.',
    de_DE:
      'Dawarich auf 1.18.1 aktualisiert: Geofencing mit Webhooks, Privatsphäre-Zonen, die Daten auch auf deiner eigenen Karte ausblenden, Bereiche werden zu Orten, und Datums- und Zeitformate sind wählbar. [Vollständige Versionshinweise](https://github.com/Freika/dawarich/releases/tag/1.18.1)\n\nSichere Dawarich vor dem Update. Danach überarbeitet es im Hintergrund Strecken, Flüge, Rückblicke, Orte und Besuche deines gesamten Verlaufs. Das kann bei einem langen Verlauf Stunden dauern und lässt sich nicht rückgängig machen.',
    pl_PL:
      'Zaktualizowano Dawarich do wersji 1.18.1: geofencing z webhookami, strefy prywatności ukrywające dane także na Twojej mapie, Obszary połączone z Miejscami oraz wybór formatu daty i godziny. [Pełne informacje o wydaniu](https://github.com/Freika/dawarich/releases/tag/1.18.1)\n\nZrób kopię zapasową Dawarich przed aktualizacją. Po aktualizacji w tle przelicza trasy, loty, podsumowania, miejsca i wizyty z całej historii, co przy długiej historii może potrwać godziny i nie da się tego cofnąć.',
    fr_FR:
      "Dawarich mis à jour vers 1.18.1 : géorepérage avec webhooks, zones de confidentialité qui masquent aussi les données sur votre propre carte, Zones fusionnées dans les Lieux, et choix du format de date et d'heure. [Notes de version complètes](https://github.com/Freika/dawarich/releases/tag/1.18.1)\n\nSauvegardez Dawarich avant de mettre à jour. Après la mise à jour, il retravaille en arrière-plan les trajets, vols, bilans, lieux et visites de tout votre historique, ce qui peut prendre des heures avec un long historique et ne peut pas être annulé.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
