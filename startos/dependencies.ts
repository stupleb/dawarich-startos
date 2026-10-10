import { storeJson } from './fileModels/store.json'
import { recorderDescription } from './manifest/i18n'
import { RECORDER_ID } from './utils'
import { sdk } from './sdk'

export const dependencies = sdk.Dependencies.of().addDependency(
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
