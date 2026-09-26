import { setAdminPassword } from '../actions/setAdminPassword'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const watchAdminPassword = sdk.setupOnInit(async (effects) => {
  const password = await storeJson.read((s) => s.adminPassword).const(effects)
  if (!password) {
    await sdk.action.createOwnTask(effects, setAdminPassword, 'critical', {
      reason: i18n('Create the admin account before starting Dawarich'),
    })
  }
})
