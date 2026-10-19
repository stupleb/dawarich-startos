import {
  ExtendedVersion,
  FileHelper,
  healthFns,
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
import { createHash, randomBytes } from 'node:crypto'
import { manifest as recorderManifest } from 'owntracks-recorder-startos/startos/manifest'
import {
  AirtrailConnection,
  AirtrailKey,
  ImmichConnection,
  ImmichKey,
  storeJson,
} from './fileModels/store.json'
import { confirmAirtrailAccount } from './actions/confirmAirtrailAccount'
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
export const immichMinVersion = '3.3.3:1'
export const immichVersionRange = `>=${immichMinVersion}`
export const AIRTRAIL_ID = 'airtrail'
export const airtrailVersionRange = '>=3.13.0:0'
// AirTrail's web binding (airtrail-startos/startos/utils.ts).
const airtrailHostId = 'main'
const airtrailPort = 3000
export const PHOTON_ID = 'photon'
// Photon's API binding (photon-startos/startos/utils.ts).
const photonHostId = 'api'
const photonPort = 2322

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

export function immichInstalled(effects: T.Effects) {
  return sdk.getServiceManifest(effects, IMMICH_ID, (m) => m !== null)
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

// Dependent-only actions admit only a declared dependent; on success the store keeps it declared.
export async function withDependency<R>(
  effects: T.Effects,
  id: string,
  versionRange: string,
  fn: () => Promise<R>,
): Promise<R> {
  const previous = await effects.getDependencies()
  if (!previous.some((d) => d.id === id))
    await effects.setDependencies({
      dependencies: [
        ...previous,
        { id, kind: 'running', versionRange, healthChecks: [] },
      ],
    })
  try {
    return await fn()
  } catch (e) {
    await effects.setDependencies({ dependencies: previous })
    throw e
  }
}

// ASCII on purpose: AirTrail NFKC-normalises a key before hashing it.
export function newKey(): AirtrailKey {
  const secret = randomBytes(32).toString('base64url')
  return { secret, keyHash: createHash('sha256').update(secret).digest('hex') }
}

export function newImmichKey(enrich: boolean): ImmichKey {
  return { ...newKey(), enrich }
}

// Immich releases differ in whether their form takes a label and offers asset.update.
export async function requestImmichAccess(
  effects: T.Effects,
  key: ImmichKey,
  label: string,
) {
  await sdk.action.run({
    effects,
    packageId: IMMICH_ID,
    actionId: 'request-access',
    input: ({ spec }) => {
      if (
        key.enrich &&
        !(
          spec.permissions?.type === 'multiselect' &&
          'asset.update' in spec.permissions.values
        )
      )
        throw new Error(
          i18n(
            'This Immich can’t let Dawarich add locations to photos. Run Connect Immich with Add locations to photos off, or update Immich.',
          ),
        )
      return {
        keyHash: key.keyHash,
        permissions: [
          'asset.read',
          'asset.view',
          'user.read',
          ...(key.enrich ? ['asset.update'] : []),
        ],
        ...('label' in spec ? { label: label.slice(0, 64) } : {}),
      }
    },
  })
}

// A null hash revokes every key Dawarich holds in Immich.
export async function revokeImmichAccess(
  effects: T.Effects,
  keyHash: string | null,
) {
  await sdk.action.run({
    effects,
    packageId: IMMICH_ID,
    actionId: 'revoke-access',
    input: () => ({ keyHash }),
  })
}

// Immich answers 401 until the user approves the key.
async function immichKeyAccount(url: string, secret: string) {
  const res = await fetch(`${url}/api/users/me`, {
    headers: { 'x-api-key': secret },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null)
  if (res?.status === 401) return 'unapproved'
  if (!res?.ok) return 'no-answer'
  return (await res.json()) as { email: string }
}

export async function updateImmichConnection(
  effects: T.Effects,
  userId: number,
  change: (c: ImmichConnection | undefined) => ImmichConnection | null,
): Promise<ImmichConnection | null> {
  let next: ImmichConnection | null = null
  await storeJson.update(effects, (s) => {
    if (!s) return null
    next = change(s.immichConnections.find((c) => c.userId === userId))
    return {
      ...s,
      immichConnections: [
        ...s.immichConnections.filter((c) => c.userId !== userId),
        ...(next ? [next] : []),
      ],
    }
  })
  return next
}

// Resolves Dawarich's connection-test alert, or null when the settings saved cleanly.
export async function saveConnectionSettings(
  effects: T.Effects,
  service: 'immich' | 'airtrail',
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
    `save-${service}-settings`,
    async (sub) => {
      const res = await sub.exec(
        ['bundle', 'exec', 'rails', 'runner', `${ASSETS_PATH}/${service}.rb`],
        {
          cwd: '/var/app',
          env: {
            ...railsEnv({ ...store, postgresPassword, secretKeyBase }),
            STARTOS_USER_ID: String(userId),
            STARTOS_URL: url,
            STARTOS_API_KEY: apiKey,
          },
          timeout: 300_000,
        },
      )
      if (res.exitCode === 0) return null
      const alerts = [
        ...res.stdout.toString().matchAll(/^STARTOS_ALERT=(.*)$/gm),
      ].map((m) => m[1])
      if (res.exitCode === 2 && alerts.length) return alerts.join(' ')
      console.error(`${service}.rb failed: ${res.stderr.toString()}`)
      throw new Error(
        i18n(
          'Dawarich could not save the integration settings. The service log has the details.',
        ),
      )
    },
  )
}

// Puts a key Immich approved into use, or withdraws it with the reason it can't be used.
async function adoptImmichKey(
  effects: T.Effects,
  c: ImmichConnection,
  key: ImmichKey,
  url: string,
  immichEmail: string,
): Promise<ImmichConnection['problem']> {
  let problem: ImmichConnection['problem'] = null
  if (immichEmail.toLowerCase() !== c.email.toLowerCase()) {
    problem = { code: 'wrong-account', detail: immichEmail }
  } else if (
    !(await listDawarichAccounts(effects)).some((a) => a.id === c.userId)
  ) {
    problem = { code: 'account-missing', detail: '' }
  } else {
    const alert = await saveConnectionSettings(
      effects,
      'immich',
      c.userId,
      url,
      key.secret,
    )
    if (alert) problem = { code: 'failed', detail: alert }
  }
  if (problem) await revokeImmichAccess(effects, key.keyHash)

  const now = await updateImmichConnection(effects, c.userId, (current) =>
    current?.pendingKey?.keyHash !== key.keyHash
      ? (current ?? null)
      : problem
        ? { ...current, pendingKey: null, problem }
        : { ...current, key, pendingKey: null, problem: null },
  )
  if (problem) return problem
  // Disconnect Immich ran while the settings were being saved.
  if (!now) await saveConnectionSettings(effects, 'immich', c.userId, '', '')
  else if (
    now.key?.keyHash === key.keyHash &&
    c.key &&
    c.key.keyHash !== key.keyHash
  )
    await revokeImmichAccess(effects, c.key.keyHash).catch((e) =>
      console.error(`Could not revoke the replaced Immich key: ${e}`),
    )
  return null
}

// Also puts the keys Immich has approved into use.
export async function checkImmichAccess(
  effects: T.Effects,
): Promise<healthFns.HealthCheckResult> {
  const connections = (
    (await storeJson.read((s) => s.immichConnections).once()) ?? []
  ).filter((c) => c.key || c.pendingKey || c.problem)
  if (!connections.length)
    return {
      result: 'disabled',
      message: i18n('No Dawarich account is connected to Immich'),
    }
  if (!(await sdk.getStatus(effects, { packageId: IMMICH_ID }).once())?.started)
    return {
      result: 'loading',
      message: i18n('Paused while Immich is stopped'),
    }
  const address = await immichBridgeAddress(effects).once()
  if (!address)
    return {
      result: 'failure',
      message: i18n('Immich has no address Dawarich can reach'),
    }
  const url = `http://${address}`
  const noAnswer: healthFns.HealthCheckResult = {
    result: 'loading',
    message: i18n('Waiting for Immich to answer'),
  }

  const failures: string[] = []
  const waiting: string[] = []
  const connected: string[] = []
  for (const c of connections) {
    const { email } = c
    let problem = c.problem
    if (c.pendingKey) {
      const account = await immichKeyAccount(url, c.pendingKey.secret)
      if (account === 'no-answer') return noAnswer
      if (account === 'unapproved') {
        waiting.push(
          i18n(
            'Approve Dawarich’s request for ${email} in Immich’s tasks. If you denied it, run Disconnect Immich to stop asking, or Connect Immich to ask again.',
            { email },
          ),
        )
        continue
      }
      problem = await adoptImmichKey(
        effects,
        c,
        c.pendingKey,
        url,
        account.email,
      )
      if (!problem) {
        connected.push(email)
        continue
      }
    }
    if (problem) {
      failures.push(
        problem.code === 'wrong-account'
          ? i18n(
              'Immich approved the request for ${email} with the account ${immich}. Run Connect Immich again and approve it with the Immich account that uses ${email}.',
              { email, immich: problem.detail },
            )
          : problem.code === 'account-missing'
            ? i18n(
                'The Dawarich account ${email} no longer exists. Run Disconnect Immich for it.',
                { email },
              )
            : i18n(
                'Dawarich could not use Immich for ${email} (${detail}). Run Connect Immich again.',
                { email, detail: problem.detail },
              ),
      )
      continue
    }
    if (c.key) {
      const account = await immichKeyAccount(url, c.key.secret)
      if (account === 'no-answer') return noAnswer
      if (account === 'unapproved')
        failures.push(
          i18n(
            'Immich no longer accepts the key for ${email}. Run Connect Immich again.',
            { email },
          ),
        )
      else connected.push(email)
    }
  }
  if (failures.length) return { result: 'failure', message: failures.join(' ') }
  if (waiting.length) return { result: 'loading', message: waiting.join(' ') }
  return {
    result: 'success',
    message: i18n('Connected: ${accounts}', { accounts: connected.join(', ') }),
  }
}

export function photonInstalled(effects: T.Effects) {
  return sdk.getServiceManifest(effects, PHOTON_ID, (m) => m !== null)
}

export function photonBridgeAddress(effects: T.Effects) {
  return sdk.host.getBridgeAddress(effects, {
    packageId: PHOTON_ID,
    hostId: photonHostId,
    internalPort: photonPort,
    ssl: false,
  })
}

// An empty host clears the lookup; with `expected`, a host the admin has since changed is kept.
export async function savePhotonSettings(
  effects: T.Effects,
  host: string,
  expected: string | null,
): Promise<'written' | 'kept'> {
  const store = await storeJson.read().once()
  const postgresPassword = store?.postgresPassword
  const secretKeyBase = store?.secretKeyBase
  if (!store || !postgresPassword || !secretKeyBase)
    throw new Error(i18n('The package has not finished installing'))
  return sdk.SubContainer.withTemp(
    effects,
    { imageId: 'dawarich' },
    appMounts,
    'save-photon-settings',
    async (sub) => {
      const res = await sub.exec(
        ['bundle', 'exec', 'rails', 'runner', `${ASSETS_PATH}/photon.rb`],
        {
          cwd: '/var/app',
          env: {
            ...railsEnv({ ...store, postgresPassword, secretKeyBase }),
            STARTOS_PHOTON_HOST: host,
            ...(expected ? { STARTOS_PHOTON_EXPECT: expected } : {}),
          },
          timeout: 300_000,
        },
      )
      const outcome = res.stdout
        .toString()
        .match(/^STARTOS_PHOTON=(\w+)$/m)?.[1]
      if (res.exitCode !== 0 || (outcome !== 'written' && outcome !== 'kept')) {
        console.error(`photon.rb failed: ${res.stderr.toString()}`)
        throw new Error(
          i18n(
            'Dawarich could not save the address lookup settings. The service log has the details.',
          ),
        )
      }
      return outcome
    },
  )
}

export function airtrailInstalled(effects: T.Effects) {
  return sdk.getServiceManifest(effects, AIRTRAIL_ID, (m) => m !== null)
}

export function airtrailBridgeAddress(effects: T.Effects) {
  return sdk.host.getBridgeAddress(effects, {
    packageId: AIRTRAIL_ID,
    hostId: airtrailHostId,
    internalPort: airtrailPort,
    ssl: false,
  })
}

export async function requestAirtrailAccess(
  effects: T.Effects,
  key: AirtrailKey,
  label: string,
) {
  await sdk.action.run({
    effects,
    packageId: AIRTRAIL_ID,
    actionId: 'request-access',
    input: () => ({
      keyHash: key.keyHash,
      permissions: ['flight.read.own', 'profile.read'],
      label: label.slice(0, 64),
    }),
  })
}

// A null hash revokes every key Dawarich holds in AirTrail.
export async function revokeAirtrailAccess(
  effects: T.Effects,
  keyHash: string | null,
) {
  await sdk.action.run({
    effects,
    packageId: AIRTRAIL_ID,
    actionId: 'revoke-access',
    input: () => ({ keyHash }),
  })
}

// AirTrail answers 401 until the user approves the key.
export async function airtrailAccount(url: string, secret: string) {
  const res = await fetch(`${url}/api/v1/me`, {
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null)
  if (res?.status === 401) return 'unapproved'
  if (!res?.ok) return 'no-answer'
  return (
    (await res.json()) as {
      data: { id: string; username: string; displayName: string }
    }
  ).data
}

export async function updateAirtrailConnection(
  effects: T.Effects,
  userId: number,
  change: (c: AirtrailConnection | undefined) => AirtrailConnection | null,
): Promise<AirtrailConnection | null> {
  let next: AirtrailConnection | null = null
  await storeJson.update(effects, (s) => {
    if (!s) return null
    next = change(s.airtrailConnections.find((c) => c.userId === userId))
    return {
      ...s,
      airtrailConnections: [
        ...s.airtrailConnections.filter((c) => c.userId !== userId),
        ...(next ? [next] : []),
      ],
    }
  })
  return next
}

export const airtrailConfirmTaskId = (userId: number) =>
  `airtrail-confirm:${userId}`

// Puts an approved key into use, holds it for Confirm AirTrail Account when it opens another account
// than expected, or withdraws it with the reason it can't be used.
export async function adoptAirtrailKey(
  effects: T.Effects,
  c: AirtrailConnection,
  key: AirtrailKey,
  url: string,
  account: { id: string; username: string; displayName: string },
  confirmed: boolean,
): Promise<AirtrailConnection['problem'] | 'held'> {
  if (
    !confirmed &&
    account.username.toLowerCase() !== c.username.toLowerCase()
  ) {
    await updateAirtrailConnection(effects, c.userId, (current) =>
      current?.pendingKey?.keyHash === key.keyHash
        ? {
            ...current,
            held: {
              id: account.id,
              username: account.username,
              displayName: account.displayName,
            },
          }
        : (current ?? null),
    )
    await sdk.action.createOwnTask(
      effects,
      confirmAirtrailAccount,
      'important',
      {
        reason: i18n('Confirm the AirTrail account approved for ${email}', {
          email: c.email,
        }),
        replayId: airtrailConfirmTaskId(c.userId),
        input: {
          kind: 'partial',
          accept: [{ userId: String(c.userId) }],
          set: { userId: String(c.userId) },
        },
      },
    )
    return 'held'
  }
  let problem: AirtrailConnection['problem'] = null
  if (!(await listDawarichAccounts(effects)).some((a) => a.id === c.userId)) {
    problem = { code: 'account-missing', detail: '' }
  } else {
    const alert = await saveConnectionSettings(
      effects,
      'airtrail',
      c.userId,
      url,
      key.secret,
    )
    if (alert) problem = { code: 'failed', detail: alert }
  }
  if (problem) await revokeAirtrailAccess(effects, key.keyHash)

  const now = await updateAirtrailConnection(effects, c.userId, (current) =>
    current?.pendingKey?.keyHash !== key.keyHash
      ? (current ?? null)
      : problem
        ? { ...current, pendingKey: null, held: null, problem }
        : {
            ...current,
            key,
            airtrailUserId: account.id,
            pendingKey: null,
            held: null,
            problem: null,
          },
  )
  if (problem) return problem
  // Disconnect AirTrail ran while the settings were being saved.
  if (!now) await saveConnectionSettings(effects, 'airtrail', c.userId, '', '')
  else if (
    now.key?.keyHash === key.keyHash &&
    c.key &&
    c.key.keyHash !== key.keyHash
  )
    await revokeAirtrailAccess(effects, c.key.keyHash).catch((e) =>
      console.error(`Could not revoke the replaced AirTrail key: ${e}`),
    )
  return null
}

// Also puts the keys AirTrail has approved into use.
export async function checkAirtrailAccess(
  effects: T.Effects,
): Promise<healthFns.HealthCheckResult> {
  const connections = (
    (await storeJson.read((s) => s.airtrailConnections).once()) ?? []
  ).filter((c) => c.key || c.pendingKey || c.problem)
  if (!connections.length)
    return {
      result: 'disabled',
      message: i18n('No Dawarich account is connected to AirTrail'),
    }
  if (
    !(await sdk.getStatus(effects, { packageId: AIRTRAIL_ID }).once())?.started
  )
    return {
      result: 'loading',
      message: i18n('Paused while AirTrail is stopped'),
    }
  const address = await airtrailBridgeAddress(effects).once()
  if (!address)
    return {
      result: 'failure',
      message: i18n('AirTrail has no address Dawarich can reach'),
    }
  const url = `http://${address}`
  const noAnswer: healthFns.HealthCheckResult = {
    result: 'loading',
    message: i18n('Waiting for AirTrail to answer'),
  }

  const failures: string[] = []
  const waiting: string[] = []
  const connected: string[] = []
  for (const c of connections) {
    const { email, username } = c
    let problem = c.problem
    if (c.pendingKey && c.held) {
      waiting.push(
        i18n(
          '${email}: AirTrail approved the account ${actual} (${displayName}), not ${username}. Run Confirm AirTrail Account to use it or refuse it.',
          {
            email,
            actual: c.held.username,
            displayName: c.held.displayName,
            username,
          },
        ),
      )
      continue
    }
    if (c.pendingKey) {
      const account = await airtrailAccount(url, c.pendingKey.secret)
      if (account === 'no-answer') return noAnswer
      if (account === 'unapproved') {
        waiting.push(
          i18n(
            'Approve Dawarich’s request for ${email} in AirTrail’s tasks, with the AirTrail account ${username}. If you denied it, run Disconnect AirTrail to stop asking, or Connect AirTrail to ask again.',
            { email, username },
          ),
        )
        continue
      }
      const outcome = await adoptAirtrailKey(
        effects,
        c,
        c.pendingKey,
        url,
        account,
        false,
      )
      if (outcome === 'held') {
        waiting.push(
          i18n(
            '${email}: AirTrail approved the account ${actual} (${displayName}), not ${username}. Run Confirm AirTrail Account to use it or refuse it.',
            {
              email,
              actual: account.username,
              displayName: account.displayName,
              username,
            },
          ),
        )
        continue
      }
      problem = outcome
      if (!problem) {
        connected.push(`${email} → ${account.username}`)
        continue
      }
    }
    if (problem) {
      failures.push(
        problem.code === 'account-missing'
          ? i18n(
              'The Dawarich account ${email} no longer exists. Run Disconnect AirTrail for it.',
              { email },
            )
          : i18n(
              'Dawarich could not use AirTrail for ${email} (${detail}). Run Connect AirTrail again.',
              { email, detail: problem.detail },
            ),
      )
      continue
    }
    if (c.key) {
      const account = await airtrailAccount(url, c.key.secret)
      if (account === 'no-answer') return noAnswer
      if (account === 'unapproved')
        failures.push(
          i18n(
            'AirTrail no longer accepts the key for ${email}. Run Connect AirTrail again.',
            { email },
          ),
        )
      else connected.push(`${email} → ${account.username}`)
    }
  }
  if (failures.length) return { result: 'failure', message: failures.join(' ') }
  if (waiting.length) return { result: 'loading', message: waiting.join(' ') }
  return {
    result: 'success',
    message: i18n('Connected: ${accounts}', { accounts: connected.join(', ') }),
  }
}
