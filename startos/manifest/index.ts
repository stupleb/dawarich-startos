import { setupManifest } from '@start9labs/start-sdk'
import { long, recorderDescription, short } from './i18n'

export const manifest = setupManifest({
  id: 'dawarich',
  title: 'Dawarich',
  license: 'AGPL-3.0',
  packageRepo: 'https://github.com/stupleb/dawarich-startos',
  upstreamRepo: 'https://github.com/Freika/dawarich',
  marketingUrl: 'https://dawarich.app',
  donationUrl: 'https://ko-fi.com/H2H3IDYDD',
  description: { short, long },
  volumes: ['startos', 'main', 'db', 'valkey'],
  images: {
    dawarich: {
      source: { dockerTag: 'freikin/dawarich:1.15.2' },
      arch: ['x86_64', 'aarch64'],
    },
    postgres: {
      source: { dockerBuild: { workdir: './postgis' } },
      arch: ['x86_64', 'aarch64'],
    },
    valkey: {
      source: { dockerTag: 'valkey/valkey:9.1.2-alpine' },
      arch: ['x86_64', 'aarch64'],
    },
  },
  dependencies: {
    'owntracks-recorder': {
      description: recorderDescription,
      optional: true,
      metadata: {
        title: 'OwnTracks Recorder',
        icon: 'https://raw.githubusercontent.com/Start9Labs/owntracks-recorder-startos/59d00e24b751a0de64bdfbbfcaef400b35384f79/icon.svg',
      },
    },
  },
})
