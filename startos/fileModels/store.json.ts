import { FileHelper, smtpShape, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const recorderLink = z.looseObject({
  recorderUser: z.string(),
  userId: z.number().int(),
  email: z.string(),
})

const shape = z.looseObject({
  postgresPassword: z.string().optional().catch(undefined),
  secretKeyBase: z.string().optional().catch(undefined),
  otpPrimaryKey: z.string().optional().catch(undefined),
  otpDeterministicKey: z.string().optional().catch(undefined),
  otpKeyDerivationSalt: z.string().optional().catch(undefined),
  adminEmail: z.string().optional().catch(undefined),
  adminPassword: z.string().optional().catch(undefined),
  // Set when the password could not reach the database; setup applies it on the next start.
  adminPasswordPending: z.boolean().catch(false),
  primaryUrl: z.string().optional().catch(undefined),
  smtp: smtpShape,
  recorderLinks: z.array(recorderLink).catch([]),
})

export type RecorderLink = z.infer<typeof recorderLink>

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: './store.json' },
  shape,
)
