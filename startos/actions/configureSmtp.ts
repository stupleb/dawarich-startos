import { smtpPrefill } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec } = sdk

const inputSpec = InputSpec.of({
  smtp: sdk.inputSpecConstants.smtpInputSpec,
})

export const configureSmtp = sdk.Action.withInput(
  'configure-smtp',

  async ({ effects }) => ({
    name: i18n('Configure SMTP'),
    description: i18n(
      'Let Dawarich send email: password resets, family invitations and monthly digests. Dawarich restarts to apply the change.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => {
    const smtp = await storeJson.read((s) => s.smtp).once()
    if (!smtp || smtp.selection === 'disabled') return {}
    return { smtp: smtpPrefill(smtp) }
  },

  async ({ effects, input }) => storeJson.merge(effects, { smtp: input.smtp }),
)
