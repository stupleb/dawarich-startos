import { FileHelper, SmtpSelection, T, utils, z } from '@start9labs/start-sdk'
import { storeJson } from './fileModels/store.json'
import { sdk } from './sdk'

export const uiPort = 3000
export const uiHostId = 'main'
export const uiInterfaceId = 'ui'

export const POSTGRES_PATH = '/var/lib/postgresql'
export const DB_NAME = 'dawarich'
export const DB_USER = 'postgres'

export const ASSETS_PATH = '/startos'
export const RECORDER_PATH = '/recorder'
export const SYNC_STATE_PATH = '/sync'

export const dbMounts = sdk.Mounts.of().mountVolume({
  volumeId: 'db',
  subpath: null,
  mountpoint: POSTGRES_PATH,
  readonly: false,
})

export const appMounts = sdk.Mounts.of()
  .mountVolume({
    volumeId: 'main',
    subpath: 'storage',
    mountpoint: '/var/app/storage',
    readonly: false,
  })
  .mountAssets({ subpath: null, mountpoint: ASSETS_PATH })

export function randomString(charset: string, len: number): string {
  return utils.getDefaultString({ charset, len })
}

export function getRandomPassword(): string {
  return randomString('a-z,A-Z,0-9', 32)
}

// The root is the last certificate of any chain the OS mints.
export async function getRootCa(effects: T.Effects): Promise<string> {
  const chain = await effects.getSslCertificate({ hostnames: [] })
  return chain[chain.length - 1]
}

export async function getDatabasePassword(): Promise<string> {
  const password = await storeJson.read((s) => s.postgresPassword).once()
  if (!password) throw new Error('No postgresPassword in store.json')
  return password
}

export function postgresEnv(password: string) {
  return {
    POSTGRES_DB: DB_NAME,
    POSTGRES_USER: DB_USER,
    POSTGRES_PASSWORD: password,
  }
}

// Rails reads these, plus the libpq variables psql uses.
export function databaseEnv(password: string) {
  return {
    DATABASE_HOST: '127.0.0.1',
    DATABASE_PORT: '5432',
    DATABASE_USERNAME: DB_USER,
    DATABASE_PASSWORD: password,
    DATABASE_NAME: DB_NAME,
    PGHOST: '127.0.0.1',
    PGUSER: DB_USER,
    PGPASSWORD: password,
    PGDATABASE: DB_NAME,
  }
}

type Secrets = {
  postgresPassword: string
  secretKeyBase: string
  otpPrimaryKey?: string
  otpDeterministicKey?: string
  otpKeyDerivationSalt?: string
}

// What any Rails process of this package needs, serving or not.
export function railsEnv(secrets: Secrets): Record<string, string> {
  const { otpPrimaryKey, otpDeterministicKey, otpKeyDerivationSalt } = secrets
  return {
    RAILS_ENV: 'production',
    SELF_HOSTED: 'true',
    RAILS_LOG_TO_STDOUT: 'true',
    TIME_ZONE: 'UTC',
    REDIS_URL: 'redis://127.0.0.1:6379',
    SECRET_KEY_BASE: secrets.secretKeyBase,
    ...databaseEnv(secrets.postgresPassword),
    ...(otpPrimaryKey && otpDeterministicKey && otpKeyDerivationSalt
      ? {
          OTP_ENCRYPTION_PRIMARY_KEY: otpPrimaryKey,
          OTP_ENCRYPTION_DETERMINISTIC_KEY: otpDeterministicKey,
          OTP_ENCRYPTION_KEY_DERIVATION_SALT: otpKeyDerivationSalt,
        }
      : {}),
  }
}

export async function getNonLocalUrls(effects: T.Effects): Promise<string[]> {
  return sdk.host
    .getOwn(effects, uiHostId, (host) => {
      if (!host) return []
      const ui = Object.values(host.bindings)
        .flatMap((b) => Object.values(b.interfaces))
        .find((i) => i.id === uiInterfaceId)
      return ui?.addressInfo.nonLocal.format() || []
    })
    .const()
}

// The hostnames Rails accepts in the Host header.
export async function getApplicationHosts(
  effects: T.Effects,
): Promise<string[]> {
  const hostnames = await sdk.host
    .getOwn(effects, uiHostId, (host) => {
      if (!host) return []
      const ui = Object.values(host.bindings)
        .flatMap((b) => Object.values(b.interfaces))
        .find((i) => i.id === uiInterfaceId)
      if (!ui) return []
      return [
        ...new Set(
          ui.addressInfo
            .filter({ exclude: { kind: ['link-local', 'bridge'] } })
            .format('hostname-info')
            .map((h) =>
              h.metadata.kind === 'ipv6' ? `[${h.hostname}]` : h.hostname,
            ),
        ),
      ].sort()
    })
    .const()
  const osIp = await sdk.getOsIp(effects)
  return [...new Set([...hostnames, osIp, 'localhost', '127.0.0.1', '[::1]'])]
}

// Host (with any port) of the primary URL, for links in Dawarich's emails.
export function urlHost(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    return new URL(url).host || undefined
  } catch {
    return undefined
  }
}

export async function getSmtpEnv(
  effects: T.Effects,
  smtp: SmtpSelection,
): Promise<Record<string, string>> {
  let creds: T.SmtpValue | null = null
  if (smtp.selection === 'system') {
    creds = await sdk.getSystemSmtp(effects).const()
    if (creds && smtp.value.customFrom) creds.from = smtp.value.customFrom
  } else if (smtp.selection === 'custom') {
    const { host, from, username, password, security } =
      smtp.value.provider.value
    creds = {
      host,
      port: Number(security.value.port),
      from,
      username,
      password: password ?? null,
      security: security.selection,
    }
  }
  if (!creds) return {}

  const fromAddress = creds.from.match(/<([^>]+)>/)?.[1] ?? creds.from
  const env: Record<string, string> = {
    SMTP_SERVER: creds.host,
    SMTP_PORT: String(creds.port),
    SMTP_FROM: creds.from,
    SMTP_SSL: creds.security === 'tls' ? 'true' : 'false',
    SMTP_STARTTLS: creds.security === 'starttls' ? 'true' : 'false',
  }
  const domain = fromAddress.split('@')[1]
  if (domain) env.SMTP_DOMAIN = domain
  if (creds.username) {
    env.SMTP_USERNAME = creds.username
    env.SMTP_PASSWORD = creds.password ?? ''
  } else {
    env.SMTP_AUTHENTICATION = 'none'
  }
  return env
}

export const syncStatusFile = FileHelper.json(
  { base: sdk.volumes.main, subpath: './recorder-sync/status.json' },
  z.object({
    updatedAt: z.string().catch(''),
    links: z
      .record(
        z.string(),
        z.object({
          state: z.string().catch('importing'),
          error: z.string().optional().catch(undefined),
          lastPointAt: z.string().optional().catch(undefined),
        }),
      )
      .catch({}),
  }),
)
