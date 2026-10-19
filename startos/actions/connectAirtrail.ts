import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  AIRTRAIL_ID,
  airtrailConfirmTaskId,
  airtrailInstalled,
  airtrailVersionRange,
  listDawarichAccounts,
  newKey,
  requestAirtrailAccess,
  revokeAirtrailAccess,
  updateAirtrailConnection,
  withDependency,
} from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  userId: Value.dynamicSelect(async ({ effects }) => {
    const accounts = await listDawarichAccounts(effects)
    return {
      name: i18n('Dawarich account'),
      values: Object.fromEntries(accounts.map((a) => [String(a.id), a.email])),
      default: null,
    }
  }),
  username: Value.text({
    name: i18n('AirTrail username'),
    description: i18n(
      'The person’s username in AirTrail. Dawarich checks that the account approved in AirTrail is this one.',
    ),
    required: true,
    default: null,
  }),
})

export const connectAirtrail = sdk.Action.withInput(
  'connect-airtrail',

  async ({ effects }) => ({
    name: i18n('Connect AirTrail'),
    description: i18n(
      'Import a person’s AirTrail flights into Dawarich. Dawarich asks AirTrail for access, and you approve it in AirTrail’s tasks.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('AirTrail'),
    visibility: (await airtrailInstalled(effects).const())
      ? 'enabled'
      : 'hidden',
  }),

  inputSpec,

  async () => ({}),

  async ({ effects, input }) => {
    const account = (await listDawarichAccounts(effects)).find(
      (a) => String(a.id) === input.userId,
    )
    if (!account)
      throw new Error(i18n('That Dawarich account no longer exists'))
    if (
      !(await sdk.getStatus(effects, { packageId: AIRTRAIL_ID }).once())
        ?.started
    )
      throw new Error(i18n('Start AirTrail first'))

    const username = input.username.trim()
    const previous = (
      (await storeJson.read((s) => s.airtrailConnections).once()) ?? []
    ).find((c) => c.userId === account.id)
    const pendingKey = newKey()
    await withDependency(
      effects,
      AIRTRAIL_ID,
      airtrailVersionRange,
      async () => {
        if (previous?.pendingKey)
          await revokeAirtrailAccess(effects, previous.pendingKey.keyHash)
        await updateAirtrailConnection(effects, account.id, (current) => ({
          userId: account.id,
          email: account.email,
          username,
          airtrailUserId: current?.airtrailUserId ?? null,
          held: null,
          key: current?.key ?? null,
          pendingKey,
          problem: null,
        }))
        await requestAirtrailAccess(
          effects,
          pendingKey,
          `${account.email} → ${username}`,
        ).catch(async (e) => {
          await updateAirtrailConnection(effects, account.id, (current) =>
            current?.key ? { ...current, pendingKey: null } : null,
          )
          throw e
        })
      },
    )

    await sdk.action.clearTask(effects, airtrailConfirmTaskId(account.id))

    return {
      version: '1',
      title: i18n('AirTrail Access Requested'),
      message: i18n(
        'In AirTrail’s tasks, approve Dawarich’s request with the AirTrail account ${username}. Dawarich then finishes connecting by itself and imports their flights, and its AirTrail health check shows when it has.',
        { username },
      ),
      result: null,
    }
  },
)
