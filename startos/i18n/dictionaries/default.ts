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
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
