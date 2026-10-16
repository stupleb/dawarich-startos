import { actions } from '../actions'
import { restoreInit } from '../backups'
import { dependencies } from '../dependencies'
import { storeJson } from '../fileModels/store.json'
import { setInterfaces } from '../interfaces'
import { sdk } from '../sdk'
import { revokeImmichAccess } from '../utils'
import { versionGraph } from '../versions'
import { seedFiles } from './seedFiles'
import { watchAdminPassword } from './watchAdminPassword'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  seedFiles,
  setInterfaces,
  actions,
  dependencies,
  watchAdminPassword,
)

export const uninit = sdk.setupUninit(versionGraph, async (effects, target) => {
  if (
    target === null &&
    (await storeJson.read((s) => s.immichConnections.length > 0).once())
  )
    await revokeImmichAccess(effects, null).catch((e) =>
      console.error(`Could not revoke Dawarich's access to Immich: ${e}`),
    )
})
