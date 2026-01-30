#!/usr/bin/env node

import fs from 'node:fs'

import { $ } from 'execa'
import {
  intro,
  outro,
  select,
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

const s = spinner()
s.start(`Tagging v${newVersion}`)

await $`pnpm version ${newVersion}`

s.stop(`Tagged v${newVersion}`)

const pushSpinner = spinner()
pushSpinner.start('Pushing to GitHub...')

await $`git push origin main --follow-tags`

pushSpinner.stop('Pushed to GitHub')

outro(`Done! The release workflow will be triggered automatically.
Check the GitHub Actions tab for the publishing progress:
https://github.com/haoqunjiang/install-vue/actions`)
