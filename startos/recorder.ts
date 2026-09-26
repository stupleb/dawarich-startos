import { T } from '@start9labs/start-sdk'
import { manifest as recorderManifest } from 'owntracks-recorder-startos/startos/manifest'
import { sdk } from './sdk'
import { DB_NAME, DB_USER, RECORDER_PATH, getDatabasePassword } from './utils'

export const RECORDER_ID = 'owntracks-recorder'

// The Recorder publishes its web map on this host; it exists exactly while the
// Recorder is installed.
export function recorderInstalled(effects: T.Effects) {
  return sdk.host.get(
    effects,
    { packageId: RECORDER_ID, hostId: 'ui-multi' },
    (host) => host !== null,
  )
}

export const recorderMounts = sdk.Mounts.of().mountDependency<
  typeof recorderManifest
>({
  dependencyId: RECORDER_ID,
  volumeId: 'main',
  subpath: 'recorder/rec',
  mountpoint: RECORDER_PATH,
  readonly: true,
})

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
  const password = await getDatabasePassword()
  return sdk.SubContainer.withTemp(
    effects,
    { imageId: 'postgres' },
    sdk.Mounts.of(),
    'list-dawarich-accounts',
    async (sub) => {
      const res = await sub.execFail(
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
          'SELECT id, email FROM users ORDER BY id',
        ],
        { env: { PGPASSWORD: password } },
      )
      return res.stdout
        .toString()
        .split('\n')
        .filter((line) => line.includes('\t'))
        .map((line) => {
          const [id, email] = line.split('\t')
          return { id: Number(id), email }
        })
    },
  )
}
