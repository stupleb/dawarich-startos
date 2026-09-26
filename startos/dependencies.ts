import { T } from '@start9labs/start-sdk'
import { storeJson } from './fileModels/store.json'
import { sdk } from './sdk'

export const setDependencies = sdk.setupDependencies(async ({ effects }) => {
  const linked = await storeJson
    .read((s) => s.recorderLinks.length > 0)
    .const(effects)

  const deps: T.CurrentDependenciesResult<any> = {}
  if (linked) {
    deps['owntracks-recorder'] = {
      kind: 'exists',
      versionRange: '>=1.0.1:4',
    }
  }
  return deps
})
