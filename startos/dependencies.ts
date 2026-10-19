import { storeJson } from './fileModels/store.json'
import {
  immichDescription,
  photonDescription,
  recorderDescription,
} from './manifest/i18n'
import { IMMICH_ID, immichVersionRange, PHOTON_ID, RECORDER_ID } from './utils'
import { sdk } from './sdk'

export const dependencies = sdk.Dependencies.of()
  .addDependency(
    sdk.Dependency.optional(RECORDER_ID, {
      description: recorderDescription,
      metadata: {
        title: 'OwnTracks Recorder',
        icon: 'https://raw.githubusercontent.com/Start9Labs/owntracks-recorder-startos/59d00e24b751a0de64bdfbbfcaef400b35384f79/icon.svg',
      },
      versionRange: '>=1.0.1:4',
      kind: 'running',
      healthChecks: ['mosquitto', 'recorder'],
      enabled: async ({ effects }) =>
        !!(await storeJson
          .read((s) => s.recorderLinks.length > 0)
          .const(effects)),
    }),
  )
  .addDependency(
    sdk.Dependency.optional(IMMICH_ID, {
      description: immichDescription,
      metadata: {
        title: 'Immich',
        icon: 'https://raw.githubusercontent.com/Start9Labs/immich-startos/da17fb7111c995469eea10131aaf37caf43d4fd1/icon.svg',
      },
      versionRange: immichVersionRange,
      kind: 'running',
      healthChecks: [],
      enabled: async ({ effects }) =>
        !!(await storeJson
          .read((s) => s.immichConnections.length > 0)
          .const(effects)),
    }),
  )
  .addDependency(
    sdk.Dependency.optional(PHOTON_ID, {
      description: photonDescription,
      metadata: {
        title: 'Photon',
        icon: 'https://raw.githubusercontent.com/stupleb/photon-startos/279cadf622b1ce8b8d63c0bc82ed7b0f6e784755/icon.png',
      },
      versionRange: '>=1.3.0:0',
      kind: 'running',
      healthChecks: ['photon'],
      enabled: async ({ effects }) =>
        !!(await storeJson.read((s) => s.photonHost).const(effects)),
    }),
  )
