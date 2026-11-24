import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  listDawarichAccounts,
  newTrekKey,
  requestTrekAccess,
  revokeTrekAccess,
  TREK_ID,
  trekInstalled,
  trekVersionRange,
  updateTrekConnection,
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
})

export const connectTrek = sdk.Action.withInput(
  'connect-trek',

  async ({ effects }) => ({
    name: i18n('Connect TREK'),
    description: i18n(
      'Sync a person’s TREK trips into Dawarich. Dawarich asks TREK for access, and you approve it in TREK’s tasks.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('TREK'),
    visibility: (await trekInstalled(effects).const()) ? 'enabled' : 'hidden',
  }),

  inputSpec,

  async () => ({}),

  async ({ effects, input }) => {
    const account = (await listDawarichAccounts(effects)).find(
      (a) => String(a.id) === input.userId,
    )
    if (!account)
      throw new Error(i18n('That Dawarich account no longer exists'))
    if (!(await sdk.getStatus(effects, { packageId: TREK_ID }).once())?.started)
      throw new Error(i18n('Start TREK first'))

    const previous = (
      (await storeJson.read((s) => s.trekConnections).once()) ?? []
    ).find((c) => c.userId === account.id)
    const pendingKey = newTrekKey()
    await withDependency(effects, TREK_ID, trekVersionRange, async () => {
      if (previous?.pendingKey)
        await revokeTrekAccess(effects, previous.pendingKey.keyHash)
      await updateTrekConnection(effects, account.id, (current) => ({
        userId: account.id,
        email: account.email,
        key: current?.key ?? null,
        pendingKey,
        problem: null,
      }))
      await requestTrekAccess(effects, pendingKey, account.email).catch(
        async (e) => {
          await updateTrekConnection(effects, account.id, (current) =>
            current?.key ? { ...current, pendingKey: null } : null,
          )
          throw e
        },
      )
    })

    return {
      version: '1',
      title: i18n('TREK Access Requested'),
      message: i18n(
        'In TREK’s tasks, approve Dawarich’s request with the TREK account whose trips go to ${email}. Dawarich then finishes connecting by itself, and its TREK health check shows when it has. To choose which trips to import, sign in to Dawarich as ${email} and open Settings → Integrations → TREK.',
        { email: account.email },
      ),
      result: null,
    }
  },
)
