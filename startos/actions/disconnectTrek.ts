import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  listDawarichAccounts,
  revokeTrekAccess,
  saveConnectionSettings,
  TREK_ID,
  trekInstalled,
  trekVersionRange,
  updateTrekConnection,
  withDependency,
} from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  userId: Value.dynamicSelect(async () => {
    const connections =
      (await storeJson.read((s) => s.trekConnections).once()) ?? []
    return {
      name: i18n('Dawarich account'),
      values: Object.fromEntries(
        connections.map((c) => [String(c.userId), c.email]),
      ),
      default: null,
    }
  }),
})

export const disconnectTrek = sdk.Action.withInput(
  'disconnect-trek',

  async ({ effects }) => ({
    name: i18n('Disconnect TREK'),
    description: i18n(
      'Stop syncing a person’s TREK trips, and revoke Dawarich’s access in TREK for them. Trips already imported stay in Dawarich.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('TREK'),
    visibility: (await storeJson
      .read((s) => s.trekConnections.length > 0)
      .const(effects))
      ? 'enabled'
      : 'hidden',
  }),

  inputSpec,

  async () => ({}),

  async ({ effects, input }) => {
    const connection = (
      (await storeJson.read((s) => s.trekConnections).once()) ?? []
    ).find((c) => String(c.userId) === input.userId)
    if (!connection)
      throw new Error(i18n('That account is not connected to TREK'))
    // An uninstalled TREK took its keys with it.
    if (await trekInstalled(effects).once()) {
      if (
        !(await sdk.getStatus(effects, { packageId: TREK_ID }).once())?.started
      )
        throw new Error(i18n('Start TREK first'))
      await withDependency(effects, TREK_ID, trekVersionRange, async () => {
        for (const key of [connection.key, connection.pendingKey])
          if (key) await revokeTrekAccess(effects, key.keyHash)
      })
    }
    if (
      connection.key &&
      (await listDawarichAccounts(effects)).some(
        (a) => a.id === connection.userId,
      )
    )
      await saveConnectionSettings(
        effects,
        'trek',
        connection.userId,
        '',
        connection.key.secret,
      )
    await updateTrekConnection(effects, connection.userId, () => null)
    return {
      version: '1',
      title: i18n('TREK Disconnected'),
      message: i18n(
        'Dawarich no longer syncs ${email}’s TREK trips, and its access in TREK is revoked. The trips already imported stay.',
        { email: connection.email },
      ),
      result: null,
    }
  },
)
