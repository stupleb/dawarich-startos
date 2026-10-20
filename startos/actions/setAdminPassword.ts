import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  ASSETS_PATH,
  appMounts,
  getRandomPassword,
  queryDatabase,
  railsEnv,
} from '../utils'

const { InputSpec, Value } = sdk

const emailRegex = utils.Patterns.email.regex

const inputSpec = InputSpec.of({
  email: Value.text({
    name: i18n('Email'),
    description: i18n(
      'The address the admin signs in to Dawarich with. Changing it here renames the admin account.',
    ),
    required: true,
    default: null,
    placeholder: 'you@example.com',
    inputmode: 'email',
    patterns: [
      { regex: emailRegex, description: i18n('Must be a valid email address') },
    ],
  }),
})

export const setAdminPassword = sdk.Action.withInput(
  'set-admin-password',

  async ({ effects }) => ({
    name: i18n('Set Admin Password'),
    description: i18n(
      'Choose the email the Dawarich admin signs in with and generate a new password for it. The first run creates the account.',
    ),
    warning: (await storeJson.read((s) => s.adminPassword).const(effects))
      ? i18n('Replaces the current admin password.')
      : null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  // The account's email may have been changed inside Dawarich since the package set it.
  async ({ effects }) => {
    const store = await storeJson.read().once()
    if (!store?.adminPassword) return {}
    const live = await queryDatabase(
      effects,
      'SELECT email FROM users WHERE admin ORDER BY id LIMIT 1',
    )
    return { email: live?.trim() || store.adminEmail }
  },

  async ({ effects, input }) => {
    const email = input.email.toLowerCase()

    const store = await storeJson.read().once()
    const postgresPassword = store?.postgresPassword
    const secretKeyBase = store?.secretKeyBase
    if (!store || !postgresPassword || !secretKeyBase) {
      throw new Error(i18n('The package has not finished installing'))
    }
    const password = getRandomPassword()
    let signInEmail = email
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
            STARTOS_ADMIN_EMAIL: email,
            STARTOS_ADMIN_PASSWORD: password,
            STARTOS_ADMIN_APPLY: 'true',
            STARTOS_ADMIN_STRICT: 'true',
          }
          const probe = await sub.exec(
            ['pg_isready', '-q', '-h', '127.0.0.1', '-t', '3'],
            { env },
          )
          if (probe.exitCode !== 0) return
          const res = await sub.exec(
            ['bundle', 'exec', 'rails', 'runner', `${ASSETS_PATH}/admin.rb`],
            { cwd: '/var/app', env, timeout: 300_000 },
          )
          const stdout = res.stdout.toString()
          const stderr = res.stderr.toString()
          if (stderr.includes('STARTOS_ADMIN_EMAIL_TAKEN')) {
            throw new Error(
              i18n('That email already belongs to another Dawarich account'),
            )
          }
          if (res.exitCode !== 0) {
            console.error(`admin.rb failed: ${stderr}`)
            throw new Error(
              i18n(
                'Dawarich could not apply the password. The service log has the details.',
              ),
            )
          }
          signInEmail =
            stdout.match(/^STARTOS_ADMIN_EMAIL=(.+)$/m)?.[1] ?? signInEmail
          applied = true
        },
      )
    }

    await storeJson.merge(effects, {
      adminEmail: signInEmail,
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
            value: signInEmail,
            masked: false,
            copyable: true,
            qr: false,
            launchable: false,
          },
          {
            type: 'single',
            name: i18n('Password'),
            description: null,
            value: password,
            masked: true,
            copyable: true,
            qr: false,
            launchable: false,
          },
        ],
      },
    }
  },
)
