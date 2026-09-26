import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { getRandomPassword, randomString } from '../utils'

export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') {
    await storeJson.merge(effects, {})
    return
  }

  await storeJson.merge(effects, {
    postgresPassword: getRandomPassword(),
    secretKeyBase: randomString('a-f,0-9', 128),
    otpPrimaryKey: randomString('a-z,A-Z,0-9', 32),
    otpDeterministicKey: randomString('a-z,A-Z,0-9', 32),
    otpKeyDerivationSalt: randomString('a-z,A-Z,0-9', 32),
  })
})
