import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  workers: Value.number({
    name: i18n('Web Workers'),
    description: i18n(
      'How many requests Dawarich serves at once. Each worker beyond the first is another process, so more workers handle more simultaneous visitors at the cost of more memory.',
    ),
    required: true,
    default: 1,
    min: 1,
    max: 8,
    step: 1,
    integer: true,
    units: i18n('workers'),
  }),
})

export const setWorkerCount = sdk.Action.withInput(
  'set-worker-count',

  async () => ({
    name: i18n('Set Worker Count'),
    description: i18n(
      'Trade memory for concurrency. Dawarich restarts to apply the change.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async () => ({
    workers: (await storeJson.read((s) => s.webWorkers).once()) ?? undefined,
  }),

  async ({ effects, input }) =>
    storeJson.merge(effects, { webWorkers: input.workers }),
)
