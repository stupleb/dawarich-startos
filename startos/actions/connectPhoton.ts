import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  photonBridgeAddress,
  photonInstalled,
  savePhotonSettings,
} from '../utils'

export const connectPhoton = sdk.Action.withoutInput(
  'connect-photon',

  async ({ effects }) => ({
    name: i18n('Connect Photon'),
    description: i18n(
      'Look up the addresses of locations with Photon. Replaces the address lookup set under Settings → Instance.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('Photon'),
    visibility: (await photonInstalled(effects).const()) ? 'enabled' : 'hidden',
  }),

  async ({ effects }) => {
    const address = await photonBridgeAddress(effects).once()
    if (!address)
      throw new Error(i18n('Photon has no address Dawarich can reach'))
    await savePhotonSettings(effects, address, null)
    await storeJson.merge(effects, { photonHost: address })
    return {
      version: '1',
      title: i18n('Photon Connected'),
      message: i18n(
        'Dawarich looks up addresses with Photon. Photon knows only the countries chosen in it, so locations elsewhere get no address.',
      ),
      result: null,
    }
  },
)
