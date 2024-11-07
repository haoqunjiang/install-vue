import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

import { execa } from 'execa'
import { log, confirm, cancel } from '@clack/prompts'

import { normalizeAnswer } from './normalizeAnswer'

export default async function preflightCheck() {
  const packageJsonPath = resolve(cwd(), './package.json')
  if (!existsSync(packageJsonPath)) {
    throw new Error('Cannot find package.json in the current directory')
  }

  try {
    const { stdout: gitStatus } = await execa('git', ['status', '--porcelain'])
    if (gitStatus.trim()) {
      log.warn(
        "There are uncommitted changes in the current repository, it's recommended to commit or stash them first.",
      )
      const shouldProceed = await normalizeAnswer(
        confirm({
          message: `Still proceed?`,
          initialValue: false,
        }),
      )

      if (!shouldProceed) {
        cancel('Operation cancelled.')
        process.exit(1)
      }
    }
  } catch {
    // Do nothing if git is not available, or if it's not a git repo
  }
}
