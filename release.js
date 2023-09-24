#!/usr/bin/env node

import fs from 'node:fs'

import { $ } from 'execa'
import {
  intro,
  outro,
  log,
  select,
  confirm,
  spinner,
  cancel,
  isCancel,
} from '@clack/prompts'
import pico from 'picocolors'
import { inc } from 'semver'

const currentVersion = JSON.parse(
  fs.readFileSync('./package.json', 'utf-8'),
).version

intro(`Releasing ${pico.underline(pico.green('install-vue'))}`)

const newVersion = await select({
  message: 'What kind of release?',
  options: ['patch', 'minor', 'major'].map((releaseType) => {
    const afterIncrement = inc(currentVersion, releaseType)
    return {
      value: afterIncrement,
      label: releaseType,
      hint: `v${currentVersion} -> v${afterIncrement}`,
    }
  }),
})

if (isCancel(newVersion)) {
  cancel('Operation cancelled.')
  process.exit(0)
}


// await $`pnpm version ${newVersion}`

const releaseTags = ['canary', 'canary-minor', 'alpha', 'beta', 'rc']
for (const tag of releaseTags) {
  // await $`pnpm version ${newVersion}-${tag} --no-git-tag-version`
  // await $`esbuild --bundle index.ts --format=esm --target=node18 --platform=node --define:RELEASE_TAG='"${tag}"' --outfile=outfile.mjs`
  // await $`pnpm publish --tag ${tag}`
  // reset the branch status
  // await $`git restore -- .`
}

outro('Done!')
