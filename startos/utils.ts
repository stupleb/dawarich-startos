import {
  ExtendedVersion,
  FileHelper,
  SmtpSelection,
  T,
  utils,
  VersionRange,
  z,
} from '@start9labs/start-sdk'
import {
  uiHostId as immichHostId,
  uiPort as immichPort,
} from 'immich-startos/startos/utils'
import { manifest as recorderManifest } from 'owntracks-recorder-startos/startos/manifest'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'

export const uiPort = 3000
export const uiHostId = 'main'
export const uiInterfaceId = 'ui'

export const POSTGRES_PATH = '/var/lib/postgresql'
export const DB_NAME = 'dawarich'
export const DB_USER = 'postgres'

export const ASSETS_PATH = '/startos'
export const RECORDER_ID = 'owntracks-recorder'
export const RECORDER_PATH = '/recorder'
export const SYNC_STATE_PATH = '/sync'
export const IMMICH_ID = 'immich'
export const immichMinVersion = '3.3.1:2'
export const immichVersionRange = `>=${immichMinVersion}`

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

export const recorderMounts = sdk.Mounts.of().mountDependency<
  typeof recorderManifest
>({
  dependencyId: RECORDER_ID,
  volumeId: 'main',
  subpath: 'recorder/rec',
  mountpoint: RECORDER_PATH,
  readonly: true,
})

// Dawarich writes https:// into every email link, so only TLS addresses can be primary.
export const primaryUrl = sdk.setupPrimaryUrl({
  id: 'set-primary-url',
  hostId: uiHostId,
  interfaceId: uiInterfaceId,
  metadata: {
    name: i18n('Set Primary URL'),
    description: i18n(
      'Choose the address Dawarich puts in the links of the emails it sends. Dawarich restarts to apply the change.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },
  field: {
    name: i18n('URL'),
    description: i18n(
      'Only HTTPS addresses are listed, because the links in Dawarich’s emails always use HTTPS.',
    ),
  },
  get: storeJson.read((s) => s.primaryUrl),
  set: (effects, url) => storeJson.merge(effects, { primaryUrl: url }),
  ssl: true,
})

export function randomString(charset: string, len: number): string {
  return utils.getDefaultString({ charset, len })
}

export function getRandomPassword(): string {
  return randomString('a-z,A-Z,0-9', 32)
}

// psql output of a query, or null when the database is not answering.
export async function queryDatabase(
  effects: T.Effects,
  sql: string,
): Promise<string | null> {
  const password = await storeJson.read((s) => s.postgresPassword).once()
  if (!password) return null
  return sdk.SubContainer.withTemp(
    effects,
    { imageId: 'postgres' },
    sdk.Mounts.of(),
    'query-database',
    async (sub) => {
      const res = await sub.exec(
        [
          'psql',
          '-h',
          '127.0.0.1',
          '-U',
          DB_USER,
          '-d',
          DB_NAME,
          '-tA',
          '-F',
          '\t',
          '-c',
          sql,
        ],
        { env: { PGPASSWORD: password } },
      )
      return res.exitCode === 0 ? res.stdout.toString() : null
    },
  )
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

// Rails reads the DATABASE_* names; psql reads the PG* ones.
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

export function urlHost(url: string | null): string | undefined {
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
  z.looseObject({
    links: z
      .record(
        z.string(),
        z.looseObject({
          state: z.string().catch('importing'),
          code: z.string().optional().catch(undefined),
          detail: z.string().optional().catch(undefined),
          newestAt: z.string().optional().catch(undefined),
        }),
      )
      .catch({}),
  }),
)

export function recorderInstalled(effects: T.Effects) {
  return sdk.getServiceManifest(effects, RECORDER_ID, (m) => m !== null)
}

// Recorder users that have stored at least one publish.
export async function listRecorderUsers(effects: T.Effects): Promise<string[]> {
  try {
    return await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'valkey' },
      recorderMounts,
      'list-recorder-users',
      async (sub) => {
        const res = await sub.execFail([
          'find',
          RECORDER_PATH,
          '-mindepth',
          '1',
          '-maxdepth',
          '1',
          '-type',
          'd',
        ])
        return res.stdout
          .toString()
          .split('\n')
          .map((line) => line.slice(RECORDER_PATH.length + 1))
          .filter((name) => name.length > 0)
          .sort()
      },
    )
  } catch {
    return []
  }
}

export async function listDawarichAccounts(
  effects: T.Effects,
): Promise<{ id: number; email: string }[]> {
  const out = await queryDatabase(
    effects,
    'SELECT id, email FROM users ORDER BY id',
  )
  return (out ?? '')
    .split('\n')
    .filter((line) => line.includes('\t'))
    .map((line) => {
      const [id, email] = line.split('\t')
      return { id: Number(id), email }
    })
}

export function immichVersion(effects: T.Effects) {
  return sdk.getServiceManifest(effects, IMMICH_ID, (m) => m?.version ?? null)
}

export function immichSupported(version: string) {
  return ExtendedVersion.parse(version).satisfies(
    VersionRange.parse(immichVersionRange),
  )
}

export function immichBridgeAddress(effects: T.Effects) {
  return sdk.host.getBridgeAddress(effects, {
    packageId: IMMICH_ID,
    hostId: immichHostId,
    internalPort: immichPort,
    ssl: false,
  })
}

// Immich's actions admit only a declared dependent; on success the store keeps Immich declared.
export async function withImmichDependency<R>(
  effects: T.Effects,
  fn: () => Promise<R>,
): Promise<R> {
  const previous = await effects.getDependencies()
  if (!previous.some((d) => d.id === IMMICH_ID))
    await effects.setDependencies({
      dependencies: [
        ...previous,
        {
          id: IMMICH_ID,
          kind: 'running',
          versionRange: immichVersionRange,
          healthChecks: [],
        },
      ],
    })
  try {
    return await fn()
  } catch (e) {
    await effects.setDependencies({ dependencies: previous })
    throw e
  }
}

export async function listImmichUsers(
  effects: T.Effects,
): Promise<{ id: string; email: string }[]> {
  // sdk.action.run sends no `input` for an action without one, which StartOS rejects.
  const res = await effects.action.run({
    packageId: IMMICH_ID,
    actionId: 'list-users',
    input: {},
  })
  return res?.version === '1' && res.result?.type === 'group'
    ? res.result.value.flatMap((m) =>
        m.type === 'single' ? [{ id: m.value, email: m.name }] : [],
      )
    : []
}

export async function createImmichKey(
  effects: T.Effects,
  userId: string,
  permissions: string[],
): Promise<{ secret: string; id: string }> {
  const res = await sdk.action.run({
    effects,
    packageId: IMMICH_ID,
    actionId: 'create-api-key',
    input: () => ({ userId, name: 'Dawarich', permissions }),
  })
  const fields: Record<string, string> = Object.fromEntries(
    res?.version === '1' && res.result?.type === 'group'
      ? res.result.value.flatMap((m) =>
          m.type === 'single' ? [[m.name, m.value]] : [],
        )
      : [],
  )
  if (!fields.secret || !fields.id)
    throw new Error(i18n('Immich did not return an API key'))
  return { secret: fields.secret, id: fields.id }
}

// Succeeds when the key is already gone.
export async function deleteImmichKey(
  effects: T.Effects,
  userId: string,
  keyId: string,
) {
  await sdk.action.run({
    effects,
    packageId: IMMICH_ID,
    actionId: 'delete-api-key',
    input: () => ({ userId, keyId }),
  })
}

// Resolves Dawarich's connection-test alert, or null when the settings saved cleanly.
export async function saveImmichSettings(
  effects: T.Effects,
  userId: number,
  url: string,
  apiKey: string,
): Promise<string | null> {
  const store = await storeJson.read().once()
  const postgresPassword = store?.postgresPassword
  const secretKeyBase = store?.secretKeyBase
  if (!store || !postgresPassword || !secretKeyBase)
    throw new Error(i18n('The package has not finished installing'))
  return sdk.SubContainer.withTemp(
    effects,
    { imageId: 'dawarich' },
    appMounts,
    'save-immich-settings',
    async (sub) => {
      const res = await sub.exec(
        ['bundle', 'exec', 'rails', 'runner', `${ASSETS_PATH}/immich.rb`],
        {
          cwd: '/var/app',
          env: {
            ...railsEnv({ ...store, postgresPassword, secretKeyBase }),
            STARTOS_USER_ID: String(userId),
            STARTOS_IMMICH_URL: url,
            STARTOS_IMMICH_API_KEY: apiKey,
          },
          timeout: 300_000,
        },
      )
      if (res.exitCode === 0) return null
      const alerts = [
        ...res.stdout.toString().matchAll(/^STARTOS_IMMICH_ALERT=(.*)$/gm),
      ].map((m) => m[1])
      if (res.exitCode === 2 && alerts.length) return alerts.join(' ')
      console.error(`immich.rb failed: ${res.stderr.toString()}`)
      throw new Error(
        i18n(
          'Dawarich could not save the Immich settings. The service log has the details.',
        ),
      )
    },
  )
}
