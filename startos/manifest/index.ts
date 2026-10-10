import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

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
      source: { dockerTag: 'freikin/dawarich:1.15.3' },
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
})
