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
  'Dawarich could not save the integration settings. The service log has the details.': 60,
  'Immich has no address Dawarich can reach': 69,
  'No Dawarich account is connected to Immich': 87,
  'Paused while Immich is stopped': 88,
  'Waiting for Immich to answer': 89,
  'Approve Dawarich’s request for ${email} in Immich’s tasks. If you denied it, run Disconnect Immich to stop asking, or Connect Immich to ask again.': 90,
  'Immich approved the request for ${email} with the account ${immich}. Run Connect Immich again and approve it with the Immich account that uses ${email}.': 91,
  'The Dawarich account ${email} no longer exists. Run Disconnect Immich for it.': 92,
  'Dawarich could not use Immich for ${email} (${detail}). Run Connect Immich again.': 93,
  'Immich no longer accepts the key for ${email}. Run Connect Immich again.': 94,
  'Connected: ${accounts}': 95,
  'This Immich can’t let Dawarich add locations to photos. Run Connect Immich with Add locations to photos off, or update Immich.': 96,

  // actions/connectImmich.ts
  'Approve the request in Immich with the Immich account that uses the same email address.': 83,
  'Show a person’s Immich photos on their Dawarich map. Dawarich asks Immich for access, and you approve it in Immich’s tasks.': 84,
  'Immich Access Requested': 85,
  'In Immich’s tasks, approve Dawarich’s request with the Immich account that uses ${email}. Dawarich then finishes connecting by itself, and its Immich health check shows when it has.': 86,
  'Add locations to photos': 62,
  'Lets Dawarich’s Enrich feature write positions from this person’s location history into their Immich photos that have none. Off, Dawarich can only read their photos.': 63,
  'Connect Immich': 64,
  Immich: 66,
  'Requires Immich ${version} or later': 67,
  'Start Immich first': 68,

  // actions/disconnectImmich.ts
  'Disconnect Immich': 78,
  'Stop showing a person’s Immich photos in Dawarich, and delete the Immich API key Dawarich used for them.': 79,
  'That account is not connected to Immich': 80,
  'Immich Disconnected': 81,
  'Dawarich no longer reads ${email}’s Immich photos, and its access in Immich is revoked.': 82,

  // Photon (utils.ts, actions/connectPhoton.ts, actions/disconnectPhoton.ts)
  'Dawarich could not save the address lookup settings. The service log has the details.': 97,
  'Connect Photon': 98,
  'Look up the addresses of locations with Photon. Replaces the address lookup set under Settings → Instance.': 99,
  Photon: 100,
  'Photon has no address Dawarich can reach': 101,
  'Photon Connected': 102,
  'Dawarich looks up addresses with Photon. Photon knows only the countries chosen in it, so locations elsewhere get no address.': 103,
  'Disconnect Photon': 104,
  'Stop looking up addresses with Photon. Addresses Dawarich already found stay.': 105,
  'Dawarich is not connected to Photon': 106,
  'Photon Disconnected': 107,
  'Dawarich no longer looks up addresses with Photon.': 108,
  'The address lookup under Settings → Instance was changed there, so it stays as it is.': 109,

  // AirTrail (utils.ts, actions/connectAirtrail.ts, actions/disconnectAirtrail.ts)
  'No Dawarich account is connected to AirTrail': 110,
  'Paused while AirTrail is stopped': 111,
  'AirTrail has no address Dawarich can reach': 112,
  'Waiting for AirTrail to answer': 113,
  'Approve Dawarich’s request for ${email} in AirTrail’s tasks, with the AirTrail account ${username}. If you denied it, run Disconnect AirTrail to stop asking, or Connect AirTrail to ask again.': 114,
  'The Dawarich account ${email} no longer exists. Run Disconnect AirTrail for it.': 116,
  'Dawarich could not use AirTrail for ${email} (${detail}). Run Connect AirTrail again.': 117,
  'AirTrail no longer accepts the key for ${email}. Run Connect AirTrail again.': 118,
  'Connect AirTrail': 119,
  'Import a person’s AirTrail flights into Dawarich. Dawarich asks AirTrail for access, and you approve it in AirTrail’s tasks.': 120,
  AirTrail: 121,
  'AirTrail username': 122,
  'The person’s username in AirTrail. Dawarich checks that the account approved in AirTrail is this one.': 123,
  'Start AirTrail first': 124,
  'AirTrail Access Requested': 125,
  'In AirTrail’s tasks, approve Dawarich’s request with the AirTrail account ${username}. Dawarich then finishes connecting by itself and imports their flights, and its AirTrail health check shows when it has.': 126,
  'Disconnect AirTrail': 127,
  'Stop importing a person’s AirTrail flights, and revoke Dawarich’s access in AirTrail for them.': 128,
  'That account is not connected to AirTrail': 129,
  'AirTrail Disconnected': 130,
  'Dawarich no longer reads ${email}’s AirTrail flights, and its access in AirTrail is revoked.': 131,
  'Confirm the AirTrail account approved for ${email}': 132,
  '${email}: AirTrail approved the account ${actual} (${displayName}), not ${username}. Run Confirm AirTrail Account to use it or refuse it.': 133,
  Decision: 134,
  'Use this AirTrail account': 135,
  'Refuse it and revoke the key': 136,
  'Confirm AirTrail Account': 137,
  'Use or refuse the AirTrail account approved for a person when it isn’t the one Connect AirTrail was given. Nothing is imported until you choose.': 138,
  'Nothing is waiting for confirmation for that account': 139,
  'AirTrail Account Refused': 140,
  'Dawarich revoked the key in AirTrail, and nothing was imported.': 141,
  'AirTrail no longer accepts that key. Run Connect AirTrail again.': 142,
  'AirTrail Account Confirmed': 143,
  'Dawarich now imports the flights of the AirTrail account ${username} into ${email}.': 144,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
