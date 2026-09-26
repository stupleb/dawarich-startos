import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  recorderUser: Value.dynamicSelect(async ({ effects }) => {
    const links = (await storeJson.read((s) => s.recorderLinks).once()) ?? []
    return {
      name: i18n('Linked user'),
      values: Object.fromEntries(
        links.map((l) => [l.recorderUser, `${l.recorderUser} → ${l.email}`]),
      ),
      default: links[0]?.recorderUser ?? '',
    }
  }),
})

export const unlinkRecorderUser = sdk.Action.withInput(
  'unlink-recorder-user',

  async ({ effects }) => ({
    name: i18n('Unlink OwnTracks Recorder User'),
    description: i18n(
      'Stop adding an OwnTracks Recorder user’s new locations to Dawarich. Locations already in Dawarich stay. Dawarich restarts to apply the change.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('OwnTracks Recorder'),
    visibility: (await storeJson
      .read((s) => s.recorderLinks.length > 0)
      .const(effects))
      ? 'enabled'
      : 'hidden',
  }),

  inputSpec,

  async () => ({}),

  async ({ effects, input }) => {
    const links = (await storeJson.read((s) => s.recorderLinks).once()) ?? []
    await storeJson.merge(effects, {
      recorderLinks: links.filter((l) => l.recorderUser !== input.recorderUser),
    })
  },
)
