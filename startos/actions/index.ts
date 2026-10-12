import { sdk } from '../sdk'
import { primaryUrl } from '../utils'
import { configureSmtp } from './configureSmtp'
import { connectImmich } from './connectImmich'
import { disconnectImmich } from './disconnectImmich'
import { linkRecorderUser } from './linkRecorderUser'
import { setAdminPassword } from './setAdminPassword'
import { unlinkRecorderUser } from './unlinkRecorderUser'

export const actions = sdk.Actions.of()
  .addAction(setAdminPassword)
  .addAction(configureSmtp)
  .addAction(primaryUrl.action)
  .addAction(linkRecorderUser)
  .addAction(unlinkRecorderUser)
  .addAction(connectImmich)
  .addAction(disconnectImmich)
