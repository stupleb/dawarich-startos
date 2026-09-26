import { setPrimaryUrl } from '../actions/setPrimaryUrl'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { getNonLocalUrls } from '../utils'

export const taskSetPrimaryUrl = sdk.setupOnInit(async (effects) => {
  const urls = await getNonLocalUrls(effects)
  const state = await storeJson
    .read((s) => ({
      url: s.primaryUrl,
      emailOn: s.smtp.selection !== 'disabled',
    }))
    .const(effects)
  const url = state?.url

  if (!url) {
    const local = urls.find((u) => u.includes('.local'))
    if (local) {
      await storeJson.merge(
        effects,
        { primaryUrl: local },
        { allowWriteAfterConst: true },
      )
    }
  } else if (state?.emailOn && !urls.includes(url)) {
    await sdk.action.createOwnTask(effects, setPrimaryUrl, 'important', {
      reason: i18n(
        'The address Dawarich uses in email links is gone. Choose another.',
      ),
    })
  }
})
