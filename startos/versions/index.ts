import { VersionGraph } from '@start9labs/start-sdk'
import { current } from './current'
import { v1_15_3_0 } from './v1.15.3_0'

export const versionGraph = VersionGraph.of({
  current,
  other: [v1_15_3_0],
})
