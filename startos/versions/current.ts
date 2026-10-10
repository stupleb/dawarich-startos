import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const current = VersionInfo.of({
  version: '1.15.3:0',
  releaseNotes: {
    en_US: `Updated Dawarich to 1.15.3, which adds private trip sharing with family members and editable account names. [Full release notes](https://github.com/Freika/dawarich/releases/tag/1.15.3)

- Set Admin Password asks for the email you sign in with, and can change it.
- Dawarich warns when a linked OwnTracks Recorder is stopped, and its sync check shows each linked user's newest location.
- The OwnTracks Recorder actions appear once OwnTracks Recorder is installed.
- Links in Dawarich's emails switch to a working address when the chosen one is removed.
- Backups of large location histories no longer time out.`,
    es_ES: `Dawarich actualizado a 1.15.3, que añade viajes compartidos de forma privada con los miembros de la familia y nombres de cuenta editables. [Notas completas](https://github.com/Freika/dawarich/releases/tag/1.15.3)

- Establecer contraseña de administrador pide el correo con el que inicias sesión y permite cambiarlo.
- Dawarich avisa cuando un OwnTracks Recorder vinculado está detenido, y su comprobación de sincronización muestra la ubicación más reciente de cada usuario vinculado.
- Las acciones de OwnTracks Recorder aparecen cuando OwnTracks Recorder está instalado.
- Los enlaces de los correos de Dawarich pasan a una dirección que funcione cuando se elimina la elegida.
- Las copias de seguridad de historiales de ubicación grandes ya no agotan el tiempo de espera.`,
    de_DE: `Dawarich auf 1.15.3 aktualisiert: Reisen lassen sich privat mit Familienmitgliedern teilen, und Kontonamen sind bearbeitbar. [Vollständige Versionshinweise](https://github.com/Freika/dawarich/releases/tag/1.15.3)

- Admin-Passwort festlegen fragt nach der E-Mail-Adresse, mit der du dich anmeldest, und kann sie ändern.
- Dawarich warnt, wenn ein verknüpfter OwnTracks Recorder gestoppt ist, und seine Synchronisationsprüfung zeigt den neuesten Standort jedes verknüpften Benutzers.
- Die OwnTracks-Recorder-Aktionen erscheinen, sobald OwnTracks Recorder installiert ist.
- Links in Dawarichs E-Mails wechseln zu einer funktionierenden Adresse, wenn die gewählte entfernt wird.
- Sicherungen großer Standortverläufe brechen nicht mehr wegen Zeitüberschreitung ab.`,
    pl_PL: `Zaktualizowano Dawarich do wersji 1.15.3, która dodaje prywatne udostępnianie podróży członkom rodziny i edytowalne nazwy kont. [Pełne informacje o wydaniu](https://github.com/Freika/dawarich/releases/tag/1.15.3)

- Ustaw hasło administratora pyta o adres e-mail, którym się logujesz, i pozwala go zmienić.
- Dawarich ostrzega, gdy połączony OwnTracks Recorder jest zatrzymany, a jego sprawdzenie synchronizacji pokazuje najnowszą lokalizację każdego połączonego użytkownika.
- Akcje OwnTracks Recorder pojawiają się po zainstalowaniu OwnTracks Recorder.
- Linki w wiadomościach e-mail Dawarich przechodzą na działający adres, gdy wybrany zostanie usunięty.
- Kopie zapasowe dużych historii lokalizacji nie przekraczają już limitu czasu.`,
    fr_FR: `Dawarich mis à jour vers 1.15.3, qui permet de partager des voyages en privé avec les membres de la famille et de modifier le nom du compte. [Notes de version complètes](https://github.com/Freika/dawarich/releases/tag/1.15.3)

- Définir le mot de passe administrateur demande l'e-mail avec lequel vous vous connectez et permet de le changer.
- Dawarich vous avertit quand un OwnTracks Recorder lié est arrêté, et sa vérification de synchronisation indique la position la plus récente de chaque utilisateur lié.
- Les actions OwnTracks Recorder apparaissent une fois OwnTracks Recorder installé.
- Les liens des e-mails de Dawarich passent à une adresse qui fonctionne quand celle choisie est supprimée.
- Les sauvegardes d'historiques de localisation volumineux n'expirent plus.`,
  },
  migrations: {
    // Clears the primary-URL task 1.15.2:0's watcher could leave raised.
    up: async ({ effects }) => {
      await sdk.action.clearTask(effects, 'dawarich:set-primary-url')
    },
    down: IMPOSSIBLE,
  },
})
