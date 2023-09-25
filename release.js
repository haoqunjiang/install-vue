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

await $`pnpm version ${newVersion}`

const releaseTags = ['canary', 'canary-minor', 'alpha', 'beta', 'rc']
for (const tag of releaseTags) {
  const s = spinner()
  s.start(`Publishing v${newVersion}-${tag}`)

  await $`pnpm version ${newVersion}-${tag} --no-git-tag-version`

  // as we rely on some CJS dependencies, we need to use `createRequire` to provide a `require` function for them
  const banner = `import { createRequire } from "module";\nconst require = createRequire(import.meta.url);\n`
  // execa automatically escapes the strings, so we don't need extra escaping
  await $`esbuild --bundle index.ts --format=esm --target=node18 --platform=node --define:RELEASE_TAG='${tag}' --banner:js=${banner} --outfile=outfile.mjs`
  await $`pnpm publish --tag ${tag} --no-git-checks`
  await $`git restore -- .`

  s.stop(`Published v${newVersion}-${tag}`)
}

await $`git push origin main --follow-tags`
outro('Done! Please check the release on GitHub.')
