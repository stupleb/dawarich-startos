import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { ASSETS_PATH, appMounts, getRandomPassword, railsEnv } from '../utils'

export const setAdminPassword = sdk.Action.withoutInput(
  'set-admin-password',

  async ({ effects }) => ({
    name: i18n('Set Admin Password'),
    description: i18n(
      'Generate a new password for the Dawarich admin account. The first run creates the account.',
    ),
    warning: (await storeJson.read((s) => s.adminPassword).const(effects))
      ? i18n('Replaces the current admin password.')
      : null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const store = await storeJson.read().once()
    const postgresPassword = store?.postgresPassword
    const secretKeyBase = store?.secretKeyBase
    if (!store || !postgresPassword || !secretKeyBase) {
      throw new Error(i18n('The package has not finished installing'))
    }
    const password = getRandomPassword()
    let email = store.adminEmail
    let applied = false

    if (store.adminPassword) {
      await sdk.SubContainer.withTemp(
        effects,
        { imageId: 'dawarich' },
        appMounts,
        'set-admin-password',
        async (sub) => {
          const env = {
            ...railsEnv({ ...store, postgresPassword, secretKeyBase }),
            STARTOS_ADMIN_EMAIL: store.adminEmail,
            STARTOS_ADMIN_PASSWORD: password,
            STARTOS_ADMIN_APPLY: 'true',
          }
          const probe = await sub.exec(
            ['pg_isready', '-q', '-h', '127.0.0.1', '-t', '3'],
            { env },
          )
          if (probe.exitCode !== 0) return
          const res = await sub.execFail(
            ['bundle', 'exec', 'rails', 'runner', `${ASSETS_PATH}/admin.rb`],
            { cwd: '/var/app', env },
            300_000,
          )
          email =
            res.stdout.toString().match(/^STARTOS_ADMIN_EMAIL=(.+)$/m)?.[1] ??
            email
          applied = true
        },
      )
    }

    await storeJson.merge(effects, {
      adminPassword: password,
      adminPasswordPending: !applied,
    })

    return {
      version: '1',
      title: i18n('Admin Login'),
      message: applied
        ? i18n('The new password is active. Sign in to Dawarich with it.')
        : i18n(
            'Dawarich applies this password when it next starts. Sign in with it once it is running.',
          ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Email'),
            description: null,
            value: email,
            masked: false,
            copyable: true,
            qr: false,
          },
          {
            type: 'single',
            name: i18n('Password'),
            description: null,
            value: password,
            masked: true,
            copyable: true,
            qr: false,
          },
        ],
      },
    }
  },
)
