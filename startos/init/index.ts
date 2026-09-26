import { actions } from '../actions'
import { restoreInit } from '../backups'
import { setDependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { sdk } from '../sdk'
import { versionGraph } from '../versions'
import { seedFiles } from './seedFiles'
import { taskSetPrimaryUrl } from './taskSetPrimaryUrl'
import { watchAdminPassword } from './watchAdminPassword'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  setInterfaces,
  setDependencies,
  actions,
  seedFiles,
  watchAdminPassword,
  taskSetPrimaryUrl,
)

export const uninit = sdk.setupUninit(versionGraph)
