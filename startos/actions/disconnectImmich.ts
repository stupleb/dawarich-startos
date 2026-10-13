import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  deleteImmichKey,
  IMMICH_ID,
  immichVersion,
  listDawarichAccounts,
  saveImmichSettings,
  withImmichDependency,
} from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  userId: Value.dynamicSelect(async () => {
    const connections =
      (await storeJson.read((s) => s.immichConnections).once()) ?? []
    return {
      name: i18n('Dawarich account'),
      values: Object.fromEntries(
        connections.map((c) => [String(c.userId), c.email]),
      ),
      default: null,
    }
  }),
})

export const disconnectImmich = sdk.Action.withInput(
  'disconnect-immich',

  async ({ effects }) => ({
    name: i18n('Disconnect Immich'),
    description: i18n(
      'Stop showing a person’s Immich photos in Dawarich, and delete the Immich API key Dawarich used for them.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('Immich'),
    visibility: (await storeJson
      .read((s) => s.immichConnections.length > 0)
      .const(effects))
      ? 'enabled'
      : 'hidden',
  }),

  inputSpec,

  async () => ({}),

  async ({ effects, input }) => {
    const connections =
      (await storeJson.read((s) => s.immichConnections).once()) ?? []
    const connection = connections.find(
      (c) => String(c.userId) === input.userId,
    )
    if (!connection)
      throw new Error(i18n('That account is not connected to Immich'))
    // An uninstalled Immich took its keys with it.
    if (await immichVersion(effects).once()) {
      if (
        !(await sdk.getStatus(effects, { packageId: IMMICH_ID }).once())
          ?.started
      )
        throw new Error(i18n('Start Immich first'))
      await withImmichDependency(effects, () =>
        deleteImmichKey(effects, connection.immichUserId, connection.keyId),
      )
    }
    if (
      (await listDawarichAccounts(effects)).some(
        (a) => a.id === connection.userId,
      )
    )
      await saveImmichSettings(effects, connection.userId, '', '')
    await storeJson.merge(effects, {
      immichConnections: connections.filter((c) => c !== connection),
    })
    return {
      version: '1',
      title: i18n('Immich Disconnected'),
      message: i18n(
        'Dawarich no longer reads ${email}’s Immich photos, and the key it used is deleted from Immich.',
        { email: connection.email },
      ),
      result: null,
    }
  },
)
