import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import {
  listDawarichAccounts,
  listRecorderUsers,
  recorderInstalled,
} from '../recorder'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  recorderUser: Value.dynamicSelect(async ({ effects }) => {
    const users = await listRecorderUsers(effects)
    return {
      name: i18n('OwnTracks Recorder user'),
      description: i18n(
        'Only users whose phones have already sent a location are listed.',
      ),
      values: Object.fromEntries(users.map((u) => [u, u])),
      default: users[0] ?? '',
      disabled: users.length
        ? false
        : i18n('No OwnTracks Recorder user has recorded a location yet'),
    }
  }),
  userId: Value.dynamicSelect(async ({ effects }) => {
    const accounts = await listDawarichAccounts(effects)
    return {
      name: i18n('Dawarich account'),
      description: i18n('The account whose history receives the locations.'),
      values: Object.fromEntries(accounts.map((a) => [String(a.id), a.email])),
      default: accounts.length ? String(accounts[0].id) : '',
    }
  }),
})

export const linkRecorderUser = sdk.Action.withInput(
  'link-recorder-user',

  async ({ effects }) => ({
    name: i18n('Link OwnTracks Recorder User'),
    description: i18n(
      "Import an OwnTracks Recorder user's location history into a Dawarich account, then keep adding their new locations. Dawarich restarts to apply the change.",
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('OwnTracks Recorder'),
    visibility: (await recorderInstalled(effects).const())
      ? 'enabled'
      : { disabled: i18n('Install OwnTracks Recorder first') },
  }),

  inputSpec,

  async () => ({}),

  async ({ effects, input }) => {
    const accounts = await listDawarichAccounts(effects)
    const account = accounts.find((a) => String(a.id) === input.userId)
    if (!account)
      throw new Error(i18n('That Dawarich account no longer exists'))

    const links = (await storeJson.read((s) => s.recorderLinks).once()) ?? []
    await storeJson.merge(effects, {
      recorderLinks: [
        ...links.filter((l) => l.recorderUser !== input.recorderUser),
        {
          recorderUser: input.recorderUser,
          userId: account.id,
          email: account.email,
        },
      ],
    })

    return {
      version: '1',
      title: i18n('Linked'),
      message: i18n(
        'Dawarich imports this user’s history after it restarts, then adds each new location within about 15 seconds.',
      ),
      result: null,
    }
  },
)
