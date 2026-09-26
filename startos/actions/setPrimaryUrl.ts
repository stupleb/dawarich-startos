import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { getNonLocalUrls } from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  url: Value.dynamicSelect(async ({ effects }) => {
    const urls = await getNonLocalUrls(effects)
    return {
      name: i18n('URL'),
      values: urls.reduce(
        (obj, url) => ({ ...obj, [url]: url }),
        {} as Record<string, string>,
      ),
      default: '',
    }
  }),
})

export const setPrimaryUrl = sdk.Action.withInput(
  'set-primary-url',

  async ({ effects }) => ({
    name: i18n('Set Primary URL'),
    description: i18n(
      'Choose the address Dawarich puts in the links of the emails it sends. Dawarich restarts to apply the change.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => ({
    url: (await storeJson.read((s) => s.primaryUrl).once()) || undefined,
  }),

  async ({ effects, input }) =>
    storeJson.merge(effects, { primaryUrl: input.url }),
)
