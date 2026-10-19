import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  IMMICH_ID,
  immichVersionRange,
  immichMinVersion,
  immichSupported,
  immichVersion,
  listDawarichAccounts,
  newImmichKey,
  requestImmichAccess,
  revokeImmichAccess,
  updateImmichConnection,
  withDependency,
} from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  userId: Value.dynamicSelect(async ({ effects }) => {
    const accounts = await listDawarichAccounts(effects)
    return {
      name: i18n('Dawarich account'),
      description: i18n(
        'Approve the request in Immich with the Immich account that uses the same email address.',
      ),
      values: Object.fromEntries(accounts.map((a) => [String(a.id), a.email])),
      default: null,
    }
  }),
  enrich: Value.toggle({
    name: i18n('Add locations to photos'),
    description: i18n(
      'Lets Dawarich’s Enrich feature write positions from this person’s location history into their Immich photos that have none. Off, Dawarich can only read their photos.',
    ),
    default: false,
  }),
})

export const connectImmich = sdk.Action.withInput(
  'connect-immich',

  async ({ effects }) => {
    const version = await immichVersion(effects).const()
    return {
      name: i18n('Connect Immich'),
      description: i18n(
        'Show a person’s Immich photos on their Dawarich map. Dawarich asks Immich for access, and you approve it in Immich’s tasks.',
      ),
      warning: null,
      allowedStatuses: 'only-running',
      group: i18n('Immich'),
      visibility: !version
        ? 'hidden'
        : immichSupported(version)
          ? 'enabled'
          : {
              disabled: i18n('Requires Immich ${version} or later', {
                version: immichMinVersion,
              }),
            },
    }
  },

  inputSpec,

  async () => ({}),

  async ({ effects, input }) => {
    const account = (await listDawarichAccounts(effects)).find(
      (a) => String(a.id) === input.userId,
    )
    if (!account)
      throw new Error(i18n('That Dawarich account no longer exists'))
    if (
      !(await sdk.getStatus(effects, { packageId: IMMICH_ID }).once())?.started
    )
      throw new Error(i18n('Start Immich first'))

    const previous = (
      (await storeJson.read((s) => s.immichConnections).once()) ?? []
    ).find((c) => c.userId === account.id)
    const pendingKey = newImmichKey(input.enrich)
    await withDependency(effects, IMMICH_ID, immichVersionRange, async () => {
      if (previous?.pendingKey)
        await revokeImmichAccess(effects, previous.pendingKey.keyHash)
      await updateImmichConnection(effects, account.id, (current) => ({
        userId: account.id,
        email: account.email,
        key: current?.key ?? null,
        pendingKey,
        problem: null,
      }))
      await requestImmichAccess(effects, pendingKey, account.email).catch(
        async (e) => {
          await updateImmichConnection(effects, account.id, (current) =>
            current?.key ? { ...current, pendingKey: null } : null,
          )
          throw e
        },
      )
    })

    return {
      version: '1',
      title: i18n('Immich Access Requested'),
      message: i18n(
        'In Immich’s tasks, approve Dawarich’s request with the Immich account that uses ${email}. Dawarich then finishes connecting by itself, and its Immich health check shows when it has.',
        { email: account.email },
      ),
      result: null,
    }
  },
)
