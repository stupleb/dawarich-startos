import { sdk } from '../sdk'
import { configureSmtp } from './configureSmtp'
import { linkRecorderUser } from './linkRecorderUser'
import { setAdminPassword } from './setAdminPassword'
import { setPrimaryUrl } from './setPrimaryUrl'
import { unlinkRecorderUser } from './unlinkRecorderUser'

export const actions = sdk.Actions.of()
  .addAction(setAdminPassword)
  .addAction(configureSmtp)
  .addAction(setPrimaryUrl)
  .addAction(linkRecorderUser)
  .addAction(unlinkRecorderUser)
