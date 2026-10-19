import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { savePhotonSettings } from '../utils'

export const disconnectPhoton = sdk.Action.withoutInput(
  'disconnect-photon',

  async ({ effects }) => ({
    name: i18n('Disconnect Photon'),
    description: i18n(
      'Stop looking up addresses with Photon. Addresses Dawarich already found stay.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('Photon'),
    visibility: (await storeJson.read((s) => s.photonHost).const(effects))
      ? 'enabled'
      : 'hidden',
  }),

  async ({ effects }) => {
    const host = await storeJson.read((s) => s.photonHost).once()
    if (!host) throw new Error(i18n('Dawarich is not connected to Photon'))
    const outcome = await savePhotonSettings(effects, '', host)
    await storeJson.merge(effects, { photonHost: null })
    return {
      version: '1',
      title: i18n('Photon Disconnected'),
      message:
        outcome === 'written'
          ? i18n('Dawarich no longer looks up addresses with Photon.')
          : i18n(
              'The address lookup under Settings → Instance was changed there, so it stays as it is.',
            ),
      result: null,
    }
  },
)
