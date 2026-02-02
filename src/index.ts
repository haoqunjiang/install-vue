#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { parseArgs } from 'node:util'

import { intro, outro, log, confirm, spinner } from '@clack/prompts'
import { execa, ExecaError } from 'execa'
import pico from 'picocolors'

import { normalizeAnswer } from './normalizeAnswer'
import preflightCheck from './preflightCheck'
import getPackageManager from './getPackageManager'
import applyOverrides from './applyOverrides'

// parse the command-line arguments
// npx install-vue@pr 12272
// npx install-vue@commit 664d2e5
// npx install-vue@version 3.5.3
const { positionals } = parseArgs({
  allowPositionals: true,
})

intro('Installing Vue.js')
await preflightCheck()

const packageManager = await getPackageManager()
const workspaceRoot = cwd()
const packageJsonPath = resolve(workspaceRoot, './package.json')

const { pkg, modifiedFiles } = await applyOverrides(
  packageManager,
  JSON.parse(readFileSync(packageJsonPath, 'utf-8')),
  workspaceRoot,
  positionals[0],
)

// Write package.json if it was modified
if (modifiedFiles.includes('package.json')) {
  writeFileSync(packageJsonPath, JSON.stringify(pkg, undefined, 2) + '\n', 'utf-8')
}

const fileList = modifiedFiles.map((f) => pico.yellow(f)).join(', ')
log.step(
  `Updated ${fileList} for ${pico.magenta(packageManager)} dependency overrides`,
)

// prompt & run install
const shouldInstall = await normalizeAnswer(
  confirm({
    message: `Run ${pico.magenta(
      `${packageManager} install`,
    )} to install the updated dependencies?`,
    initialValue: true,
  }),
)
// Note:
// there's an issue claiming that `npm install` doesn't always work
// https://github.com/npm/cli/issues/5850
// but I can't reproduce it locally with the vue.js overrides in place
// so I'm not sure if we need to do something special here
if (shouldInstall) {
  const s = spinner()
  s.start(`Installing via ${pico.magenta(packageManager)}`)
  try {
    await execa(packageManager, ['install'], { stdio: 'pipe' })
    s.stop(`Installed via ${packageManager}`)
  } catch (e) {
    s.stop(pico.red('Installation failed'))
    log.error((e as ExecaError).stderr?.toString() || (e as ExecaError).message)
    process.exit(1)
  }
  outro(`Done!`)
} else {
  outro(`Done! Don't forget to run ${pico.magenta(`${packageManager} install`)} later.`)
}
