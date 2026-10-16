import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.15.3:2',
  releaseNotes: {
    en_US:
      'Connect Immich shows a person’s Immich photos on their Dawarich map once you approve Dawarich’s request in Immich’s tasks with that person’s Immich account. Needs Immich 3.3.3:1 or later.',
    es_ES:
      'Conectar Immich muestra las fotos de Immich de una persona en su mapa de Dawarich en cuanto apruebas la solicitud de Dawarich en las tareas de Immich con la cuenta de Immich de esa persona. Requiere Immich 3.3.3:1 o posterior.',
    de_DE:
      'Immich verbinden zeigt die Immich-Fotos einer Person auf ihrer Dawarich-Karte, sobald du die Anfrage von Dawarich in den Aufgaben von Immich mit dem Immich-Konto dieser Person genehmigst. Erfordert Immich 3.3.3:1 oder neuer.',
    pl_PL:
      'Połącz Immich pokazuje zdjęcia osoby z Immich na jej mapie w Dawarich, gdy tylko zatwierdzisz prośbę Dawarich w zadaniach Immich kontem Immich tej osoby. Wymaga Immich 3.3.3:1 lub nowszego.',
    fr_FR:
      'Connecter Immich affiche les photos Immich d’une personne sur sa carte Dawarich dès que vous approuvez la demande de Dawarich dans les tâches d’Immich avec le compte Immich de cette personne. Nécessite Immich 3.3.3:1 ou ultérieur.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
