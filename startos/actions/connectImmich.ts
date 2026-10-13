import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  createImmichKey,
  deleteImmichKey,
  IMMICH_ID,
  immichBridgeAddress,
  immichMinVersion,
  immichSupported,
  immichVersion,
  listDawarichAccounts,
  listImmichUsers,
  saveImmichSettings,
  withImmichDependency,
} from '../utils'

const { InputSpec, Value } = sdk

const readPermissions = ['asset.read', 'asset.view']

const inputSpec = InputSpec.of({
  userId: Value.dynamicSelect(async ({ effects }) => {
    const accounts = await listDawarichAccounts(effects)
    return {
      name: i18n('Dawarich account'),
      description: i18n(
        'Connected to the Immich account with the same email address.',
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
        'Show a person’s Immich photos on their Dawarich map. Connects their Dawarich account to the Immich account with the same email address, using a new Immich API key.',
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
    const address = await immichBridgeAddress(effects).once()
    if (!address)
      throw new Error(i18n('Immich has no address Dawarich can reach'))

    const immichAccount = await withImmichDependency(effects, async () => {
      const match = (await listImmichUsers(effects)).find(
        (u) => u.email.toLowerCase() === account.email.toLowerCase(),
      )
      if (!match)
        throw new Error(
          i18n(
            'No Immich account uses ${email}. Give both accounts the same email address, or connect this person on their Integrations page in Dawarich with an API key they create in Immich.',
            { email: account.email },
          ),
        )
      const key = await createImmichKey(
        effects,
        match.id,
        input.enrich ? [...readPermissions, 'asset.update'] : readPermissions,
      )
      const discardKey = () =>
        deleteImmichKey(effects, match.id, key.id).catch((e) =>
          console.error(`Could not delete the unused Immich key: ${e}`),
        )
      const alert = await saveImmichSettings(
        effects,
        account.id,
        `http://${address}`,
        key.secret,
      ).catch(async (e) => {
        await discardKey()
        throw e
      })
      if (alert) {
        await discardKey()
        throw new Error(
          i18n('Dawarich could not reach Immich: ${detail}', { detail: alert }),
        )
      }
      const connections =
        (await storeJson.read((s) => s.immichConnections).once()) ?? []
      const replaced = connections.find((c) => c.userId === account.id)
      await storeJson.merge(effects, {
        immichConnections: [
          ...connections.filter((c) => c !== replaced),
          {
            userId: account.id,
            email: account.email,
            immichUserId: match.id,
            keyId: key.id,
          },
        ],
      })
      if (replaced)
        await deleteImmichKey(
          effects,
          replaced.immichUserId,
          replaced.keyId,
        ).catch((e) =>
          console.error(`Could not delete the replaced Immich key: ${e}`),
        )
      return match
    })

    return {
      version: '1',
      title: i18n('Immich Connected'),
      message: i18n(
        'Dawarich shows this person’s Immich photos on their map. Immich lists the key Dawarich uses as “Dawarich” among that account’s API keys.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Dawarich account'),
            description: null,
            value: account.email,
            masked: false,
            copyable: false,
            qr: false,
          },
          {
            type: 'single',
            name: i18n('Immich account'),
            description: null,
            value: immichAccount.email,
            masked: false,
            copyable: false,
            qr: false,
          },
          {
            type: 'single',
            name: i18n('Access'),
            description: null,
            value: input.enrich
              ? i18n('Read photos and add locations')
              : i18n('Read photos'),
            masked: false,
            copyable: false,
            qr: false,
          },
        ],
      },
    }
  },
)
