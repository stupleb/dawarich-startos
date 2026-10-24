import { sdk } from '../sdk'
import { primaryUrl } from '../utils'
import { configureSmtp } from './configureSmtp'
import { confirmAirtrailAccount } from './confirmAirtrailAccount'
import { connectAirtrail } from './connectAirtrail'
import { connectImmich } from './connectImmich'
import { connectPhoton } from './connectPhoton'
import { disconnectAirtrail } from './disconnectAirtrail'
import { disconnectImmich } from './disconnectImmich'
import { disconnectPhoton } from './disconnectPhoton'
import { linkRecorderUser } from './linkRecorderUser'
import { setAdminPassword } from './setAdminPassword'
import { setWorkerCount } from './setWorkerCount'
import { unlinkRecorderUser } from './unlinkRecorderUser'

export const actions = sdk.Actions.of()
  .addAction(setAdminPassword)
  .addAction(configureSmtp)
  .addAction(primaryUrl.action)
  .addAction(setWorkerCount)
  .addAction(linkRecorderUser)
  .addAction(unlinkRecorderUser)
  .addAction(connectImmich)
  .addAction(disconnectImmich)
  .addAction(connectAirtrail)
  .addAction(confirmAirtrailAccount)
  .addAction(disconnectAirtrail)
  .addAction(connectPhoton)
  .addAction(disconnectPhoton)
