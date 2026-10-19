import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  AIRTRAIL_ID,
  airtrailConfirmTaskId,
  airtrailInstalled,
  airtrailVersionRange,
  listDawarichAccounts,
  revokeAirtrailAccess,
  saveConnectionSettings,
  updateAirtrailConnection,
  withDependency,
} from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  userId: Value.dynamicSelect(async () => {
    const connections =
      (await storeJson.read((s) => s.airtrailConnections).once()) ?? []
    return {
      name: i18n('Dawarich account'),
      values: Object.fromEntries(
        connections.map((c) => [String(c.userId), c.email]),
      ),
      default: null,
    }
  }),
})

export const disconnectAirtrail = sdk.Action.withInput(
  'disconnect-airtrail',

  async ({ effects }) => ({
    name: i18n('Disconnect AirTrail'),
    description: i18n(
      'Stop importing a person’s AirTrail flights, and revoke Dawarich’s access in AirTrail for them.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('AirTrail'),
    visibility: (await storeJson
      .read((s) => s.airtrailConnections.length > 0)
      .const(effects))
      ? 'enabled'
      : 'hidden',
  }),

  inputSpec,

  async () => ({}),

  async ({ effects, input }) => {
    const connection = (
      (await storeJson.read((s) => s.airtrailConnections).once()) ?? []
    ).find((c) => String(c.userId) === input.userId)
    if (!connection)
      throw new Error(i18n('That account is not connected to AirTrail'))
    // An uninstalled AirTrail took its keys with it.
    if (await airtrailInstalled(effects).once()) {
      if (
        !(await sdk.getStatus(effects, { packageId: AIRTRAIL_ID }).once())
          ?.started
      )
        throw new Error(i18n('Start AirTrail first'))
      await withDependency(
        effects,
        AIRTRAIL_ID,
        airtrailVersionRange,
        async () => {
          for (const key of [connection.key, connection.pendingKey])
            if (key) await revokeAirtrailAccess(effects, key.keyHash)
        },
      )
    }
    if (
      (await listDawarichAccounts(effects)).some(
        (a) => a.id === connection.userId,
      )
    )
      await saveConnectionSettings(
        effects,
        'airtrail',
        connection.userId,
        '',
        '',
      )
    await updateAirtrailConnection(effects, connection.userId, () => null)
    await sdk.action.clearTask(
      effects,
      airtrailConfirmTaskId(connection.userId),
    )
    return {
      version: '1',
      title: i18n('AirTrail Disconnected'),
      message: i18n(
        'Dawarich no longer reads ${email}’s AirTrail flights, and its access in AirTrail is revoked.',
        { email: connection.email },
      ),
      result: null,
    }
  },
)
