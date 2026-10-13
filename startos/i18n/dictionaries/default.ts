export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Dawarich': 0,
  'The database is not accepting connections': 1,
  'The job queue is not answering': 2,
  'Web Interface': 3,
  'The web interface is ready': 4,
  'The web interface is not ready': 5,
  'Background Jobs': 6,
  'The background job worker is running': 7,
  'The background job worker is not running': 8,
  'OwnTracks Recorder Sync': 9,
  'Waiting for the first sync': 11,
  'Importing location history': 12,
  'OwnTracks Recorder is not installed, so linked users are not being followed': 14,
  'Paused while OwnTracks Recorder is stopped': 52,
  'The linked Dawarich account no longer exists. Unlink this user and link it again.': 53,
  'Dawarich rejected the linked account’s API key': 54,
  'Dawarich could not import ${detail}. Restart Dawarich to try again.': 55,
  'Sync failed: ${detail}': 56,
  'Following OwnTracks Recorder. Newest location: ${newest}': 57,

  // interfaces.ts
  'Web UI': 15,
  'The Dawarich web app, and the address phone apps send locations to': 16,

  // init
  'Create the admin account before starting Dawarich': 17,

  // actions/setAdminPassword.ts
  'Set Admin Password': 19,
  'Choose the email the Dawarich admin signs in with and generate a new password for it. The first run creates the account.': 20,
  'Replaces the current admin password.': 21,
  'The package has not finished installing': 22,
  'Admin Login': 23,
  'The new password is active. Sign in to Dawarich with it.': 24,
  'Dawarich applies this password when it next starts. Sign in with it once it is running.': 25,
  Email: 26,
  Password: 27,
  'The address the admin signs in to Dawarich with. Changing it here renames the admin account.': 41,
  'Must be a valid email address': 48,
  'That email already belongs to another Dawarich account': 49,
  'Dawarich could not apply the password. The service log has the details.': 50,

  // actions/configureSmtp.ts
  'Configure SMTP': 28,
  'Let Dawarich send email: password resets, family invitations and monthly digests. Dawarich restarts to apply the change.': 29,

  // utils.ts (Set Primary URL)
  URL: 30,
  'Set Primary URL': 31,
  'Choose the address Dawarich puts in the links of the emails it sends. Dawarich restarts to apply the change.': 32,
  'Only HTTPS addresses are listed, because the links in Dawarich’s emails always use HTTPS.': 58,

  // actions/linkRecorderUser.ts
  'OwnTracks Recorder user': 33,
  'Only users whose phones have already sent a location are listed.': 34,
  'No OwnTracks Recorder user has recorded a location yet': 35,
  'Dawarich account': 36,
  'The account whose history receives the locations.': 37,
  'Link OwnTracks Recorder User': 38,
  "Import an OwnTracks Recorder user's location history into a Dawarich account, then keep adding their new locations. Dawarich restarts to apply the change.": 39,
  'OwnTracks Recorder': 40,
  'That Dawarich account no longer exists': 42,
  Linked: 43,
  'Dawarich imports this user’s history after it restarts, then adds each new location within about 15 seconds.': 44,
  'That OwnTracks Recorder user has no stored locations': 51,

  // actions/unlinkRecorderUser.ts
  'Linked user': 45,
  'Unlink OwnTracks Recorder User': 46,
  'Stop adding an OwnTracks Recorder user’s new locations to Dawarich. Locations already in Dawarich stay. Dawarich restarts to apply the change.': 47,

  // utils.ts (Immich)
  'Immich did not return an API key': 59,
  'Dawarich could not save the Immich settings. The service log has the details.': 60,

  // actions/connectImmich.ts
  'Connected to the Immich account with the same email address.': 61,
  'Add locations to photos': 62,
  'Lets Dawarich’s Enrich feature write positions from this person’s location history into their Immich photos that have none. Off, Dawarich can only read their photos.': 63,
  'Connect Immich': 64,
  'Show a person’s Immich photos on their Dawarich map. Connects their Dawarich account to the Immich account with the same email address, using a new Immich API key.': 65,
  Immich: 66,
  'Requires Immich ${version} or later': 67,
  'Start Immich first': 68,
  'Immich has no address Dawarich can reach': 69,
  'No Immich account uses ${email}. Give both accounts the same email address, or connect this person on their Integrations page in Dawarich with an API key they create in Immich.': 70,
  'Dawarich could not reach Immich: ${detail}': 71,
  'Immich Connected': 72,
  'Dawarich shows this person’s Immich photos on their map. Immich lists the key Dawarich uses as “Dawarich” among that account’s API keys.': 73,
  'Immich account': 74,
  Access: 75,
  'Read photos and add locations': 76,
  'Read photos': 77,

  // actions/disconnectImmich.ts
  'Disconnect Immich': 78,
  'Stop showing a person’s Immich photos in Dawarich, and delete the Immich API key Dawarich used for them.': 79,
  'That account is not connected to Immich': 80,
  'Immich Disconnected': 81,
  'Dawarich no longer reads ${email}’s Immich photos, and the key it used is deleted from Immich.': 82,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
