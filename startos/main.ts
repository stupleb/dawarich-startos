import { mkdir, writeFile } from 'node:fs/promises'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { recorderInstalled, recorderMounts } from './recorder'
import { sdk } from './sdk'
import {
  ASSETS_PATH,
  DB_USER,
  RECORDER_PATH,
  SYNC_STATE_PATH,
  appMounts,
  databaseEnv,
  dbMounts,
  getApplicationHosts,
  getRootCa,
  getSmtpEnv,
  postgresEnv,
  railsEnv,
  syncStatusFile,
  uiPort,
  urlHost,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Dawarich'))

  const config = await storeJson
    .read((s) => ({
      postgresPassword: s.postgresPassword,
      secretKeyBase: s.secretKeyBase,
      otpPrimaryKey: s.otpPrimaryKey,
      otpDeterministicKey: s.otpDeterministicKey,
      otpKeyDerivationSalt: s.otpKeyDerivationSalt,
      primaryUrl: s.primaryUrl,
      smtp: s.smtp,
      recorderLinks: s.recorderLinks,
    }))
    .const(effects)
  const postgresPassword = config?.postgresPassword
  const secretKeyBase = config?.secretKeyBase
  if (!config || !postgresPassword || !secretKeyBase) {
    throw new Error('store.json is missing its generated secrets')
  }

  // Read once: the Set Admin Password action applies a password itself when
  // the database is up, and only leaves it pending when it is not.
  const admin = await storeJson
    .read((s) => ({
      email: s.adminEmail,
      password: s.adminPassword,
      pending: s.adminPasswordPending,
    }))
    .once()
  if (!admin?.password) throw new Error('No admin password is set')

  const recorderPresent = await recorderInstalled(effects).const()

  const domain = urlHost(config.primaryUrl)
  const appEnv: Record<string, string> = {
    ...railsEnv({ ...config, postgresPassword, secretKeyBase }),
    APPLICATION_PROTOCOL: 'http',
    APPLICATION_HOSTS: (await getApplicationHosts(effects)).join(','),
    WEB_CONCURRENCY: '1',
    BACKGROUND_PROCESSING_CONCURRENCY: '3',
    PROMETHEUS_EXPORTER_ENABLED: 'false',
    ...(domain ? { DOMAIN: domain } : {}),
    ...(await getSmtpEnv(effects, config.smtp)),
  }

  const postgresSub = sdk.SubContainer.of(
    effects,
    { imageId: 'postgres' },
    dbMounts,
    'postgres',
  )
  const valkeySub = sdk.SubContainer.of(
    effects,
    { imageId: 'valkey' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'valkey',
      subpath: null,
      mountpoint: '/data',
      readonly: false,
    }),
    'valkey',
  )
  const appSub = sdk.SubContainer.of(
    effects,
    { imageId: 'dawarich' },
    appMounts,
    'dawarich',
  )

  const rootfs = await appSub.rootfs
  await writeFile(
    `${rootfs}/usr/local/share/ca-certificates/startos-root-ca.crt`,
    await getRootCa(effects),
  )
  await mkdir(`${rootfs}/var/app/tmp/imports/watched`, { recursive: true })

  const links = recorderPresent ? config.recorderLinks : []

  return sdk.Daemons.of(effects)
    .addDaemon('postgres', {
      subcontainer: postgresSub,
      exec: {
        command: sdk.useEntrypoint(['-c', 'listen_addresses=127.0.0.1']),
        env: postgresEnv(postgresPassword),
      },
      ready: {
        display: null,
        fn: async () => {
          const { exitCode } = await postgresSub.exec([
            'pg_isready',
            '-q',
            '-h',
            '127.0.0.1',
            '-U',
            DB_USER,
            '-t',
            '15',
          ])
          return exitCode === 0
            ? { result: 'success', message: null }
            : {
                result: 'failure',
                message: i18n('The database is not accepting connections'),
              }
        },
      },
      requires: [],
    })
    .addDaemon('valkey', {
      subcontainer: valkeySub,
      exec: {
        command: [
          'valkey-server',
          '--bind',
          '127.0.0.1',
          '--dir',
          '/data',
          '--save',
          '300 1',
          '--loglevel',
          'warning',
          '--appendonly',
          'no',
          '--stop-writes-on-bgsave-error',
          'no',
        ],
      },
      ready: {
        display: null,
        fn: async () => {
          const res = await valkeySub.exec(['valkey-cli', 'ping'])
          return res.stdout.toString().trim() === 'PONG'
            ? { result: 'success', message: null }
            : {
                result: 'failure',
                message: i18n('The job queue is not answering'),
              }
        },
      },
      requires: [],
    })
    .addOneshot('setup', {
      subcontainer: appSub,
      exec: {
        command: [
          'sh',
          '-c',
          'update-ca-certificates >/dev/null && bundle exec rails db:migrate && bundle exec rails runner "$1"',
          'setup',
          `${ASSETS_PATH}/admin.rb`,
        ],
        cwd: '/var/app',
        env: {
          ...appEnv,
          STARTOS_ADMIN_EMAIL: admin.email,
          STARTOS_ADMIN_PASSWORD: admin.password,
          STARTOS_ADMIN_APPLY: admin.pending ? 'true' : 'false',
        },
      },
      requires: ['postgres', 'valkey'],
    })
    .addOneshot('admin-applied', {
      subcontainer: null,
      exec: {
        fn: async () => {
          const stored = await storeJson.read((s) => s.adminPassword).once()
          if (admin.pending && stored === admin.password) {
            await storeJson.merge(effects, { adminPasswordPending: false })
          }
          return null
        },
      },
      requires: ['setup'],
    })
    .addDaemon('web', {
      subcontainer: appSub,
      exec: {
        command: [
          'web-entrypoint.sh',
          'bin/rails',
          'server',
          '-p',
          String(uiPort),
          '-b',
          '0.0.0.0',
        ],
        cwd: '/var/app',
        env: appEnv,
      },
      ready: {
        display: i18n('Web Interface'),
        gracePeriod: 300_000,
        // Puma binds only once the app has loaded.
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, uiPort, {
            successMessage: i18n('The web interface is ready'),
            errorMessage: i18n('The web interface is not ready'),
          }),
      },
      requires: ['admin-applied'],
    })
    .addDaemon('sidekiq', {
      subcontainer: appSub,
      exec: {
        command: ['sidekiq-entrypoint.sh', 'sidekiq'],
        cwd: '/var/app',
        env: appEnv,
      },
      ready: {
        display: i18n('Background Jobs'),
        gracePeriod: 120_000,
        fn: async () => {
          const res = await valkeySub.exec([
            'valkey-cli',
            '-n',
            '1',
            'SCARD',
            'processes',
          ])
          return Number(res.stdout.toString().trim()) > 0
            ? {
                result: 'success',
                message: i18n('The background job worker is running'),
              }
            : {
                result: 'failure',
                message: i18n('The background job worker is not running'),
              }
        },
      },
      requires: ['web'],
    })
    .addDaemon('recorder-sync', () =>
      links.length
        ? {
            subcontainer: sdk.SubContainer.of(
              effects,
              { imageId: 'dawarich' },
              recorderMounts
                .mountAssets({ subpath: null, mountpoint: ASSETS_PATH })
                .mountVolume({
                  volumeId: 'main',
                  subpath: 'recorder-sync',
                  mountpoint: SYNC_STATE_PATH,
                  readonly: false,
                }),
              'recorder-sync',
            ),
            exec: {
              command: ['ruby', `${ASSETS_PATH}/recorder-sync.rb`],
              env: {
                ...databaseEnv(postgresPassword),
                RECORDER_REC_DIR: RECORDER_PATH,
                SYNC_STATE_DIR: SYNC_STATE_PATH,
                DAWARICH_URL: `http://127.0.0.1:${uiPort}`,
                SYNC_LINKS: JSON.stringify(
                  links.map((l) => ({
                    recorderUser: l.recorderUser,
                    userId: l.userId,
                  })),
                ),
              },
            },
            ready: {
              display: i18n('OwnTracks Recorder Sync'),
              gracePeriod: 60_000,
              fn: async () => {
                const status = await syncStatusFile.read().once()
                const states = Object.values(status?.links ?? {})
                const failed = states.find((s) => s.state === 'error')
                if (failed) {
                  return {
                    result: 'failure',
                    message: failed.error ?? i18n('Sync failed'),
                  }
                }
                if (states.length < links.length) {
                  return {
                    result: 'starting',
                    message: i18n('Waiting for the first sync'),
                  }
                }
                if (states.some((s) => s.state === 'importing')) {
                  return {
                    result: 'loading',
                    message: i18n('Importing location history'),
                  }
                }
                return {
                  result: 'success',
                  message: i18n('Following OwnTracks Recorder'),
                }
              },
            },
            requires: ['web'],
          }
        : null,
    )
    .addHealthCheck('recorder-missing', () =>
      config.recorderLinks.length && !recorderPresent
        ? {
            ready: {
              display: i18n('OwnTracks Recorder Sync'),
              fn: () => ({
                result: 'failure',
                message: i18n(
                  'OwnTracks Recorder is not installed, so linked users are not being followed',
                ),
              }),
            },
            requires: ['web'],
          }
        : null,
    )
})
