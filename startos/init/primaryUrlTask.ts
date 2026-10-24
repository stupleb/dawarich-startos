import { i18n } from '../i18n'
import { primaryUrl } from '../utils'

export const primaryUrlTask = primaryUrl.setupTask('important', {
  reason: i18n(
    'Choose the address Dawarich puts in the links of the emails it sends. Dawarich restarts to apply the change.',
  ),
})
