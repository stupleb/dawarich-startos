import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  AIRTRAIL_ID,
  adoptAirtrailKey,
  airtrailAccount,
  airtrailBridgeAddress,
  airtrailConfirmTaskId,
  airtrailVersionRange,
  revokeAirtrailAccess,
  updateAirtrailConnection,
  withDependency,
} from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  userId: Value.dynamicSelect(async () => {
    const connections =
      (await storeJson.read((s) => s.airtrailConnections).once()) ?? []
    return {
      name: i18n('Dawarich account'),
      values: Object.fromEntries(
        connections.flatMap((c) =>
          c.held
            ? [
                [
                  String(c.userId),
                  `${c.email} → ${c.held.username} (${c.held.displayName})`,
                ],
              ]
            : [],
        ),
      ),
      default: null,
    }
  }),
  decision: Value.select({
    name: i18n('Decision'),
    values: {
      use: i18n('Use this AirTrail account'),
      refuse: i18n('Refuse it and revoke the key'),
    },
    default: 'use',
  }),
})

export const confirmAirtrailAccount = sdk.Action.withInput(
  'confirm-airtrail-account',

  async ({ effects }) => ({
    name: i18n('Confirm AirTrail Account'),
    description: i18n(
      'Use or refuse the AirTrail account approved for a person when it isn’t the one Connect AirTrail was given. Nothing is imported until you choose.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('AirTrail'),
    visibility: (await storeJson
      .read((s) => s.airtrailConnections.some((c) => c.held))
      .const(effects))
      ? 'enabled'
      : 'hidden',
  }),

  inputSpec,

  async () => ({}),

  async ({ effects, input }) => {
    const c = (
      (await storeJson.read((s) => s.airtrailConnections).once()) ?? []
    ).find((x) => String(x.userId) === input.userId)
    const key = c?.pendingKey
    if (!c || !key || !c.held)
      throw new Error(
        i18n('Nothing is waiting for confirmation for that account'),
      )
    if (
      !(await sdk.getStatus(effects, { packageId: AIRTRAIL_ID }).once())
        ?.started
    )
      throw new Error(i18n('Start AirTrail first'))
    const drop = async () => {
      await updateAirtrailConnection(effects, c.userId, (current) =>
        current?.key ? { ...current, pendingKey: null, held: null } : null,
      )
      await sdk.action.clearTask(effects, airtrailConfirmTaskId(c.userId))
    }

    if (input.decision === 'refuse') {
      await withDependency(effects, AIRTRAIL_ID, airtrailVersionRange, () =>
        revokeAirtrailAccess(effects, key.keyHash),
      )
      await drop()
      return {
        version: '1',
        title: i18n('AirTrail Account Refused'),
        message: i18n(
          'Dawarich revoked the key in AirTrail, and nothing was imported.',
        ),
        result: null,
      }
    }

    const address = await airtrailBridgeAddress(effects).once()
    if (!address)
      throw new Error(i18n('AirTrail has no address Dawarich can reach'))
    const url = `http://${address}`
    const account = await airtrailAccount(url, key.secret)
    if (account === 'no-answer')
      throw new Error(i18n('Waiting for AirTrail to answer'))
    if (account === 'unapproved') {
      await drop()
      throw new Error(
        i18n(
          'AirTrail no longer accepts that key. Run Connect AirTrail again.',
        ),
      )
    }
    const problem = await adoptAirtrailKey(effects, c, key, url, account, true)
    await sdk.action.clearTask(effects, airtrailConfirmTaskId(c.userId))
    if (problem && problem !== 'held')
      throw new Error(
        i18n(
          'Dawarich could not use AirTrail for ${email} (${detail}). Run Connect AirTrail again.',
          { email: c.email, detail: problem.detail || problem.code },
        ),
      )
    return {
      version: '1',
      title: i18n('AirTrail Account Confirmed'),
      message: i18n(
        'Dawarich now imports the flights of the AirTrail account ${username} into ${email}.',
        { username: account.username, email: c.email },
      ),
      result: null,
    }
  },
)
