import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

import { select } from '@clack/prompts'

import { normalizeAnswer } from './normalizeAnswer'
import { SUPPORTED_PACKAGE_MANAGERS, type PackageManager } from './constants'

// decide which package manager to use
export default async function getPackageManager() {
  const LOCKFILE_TO_PACKAGE_MANAGER: Record<string, PackageManager> = {
    'pnpm-lock.yaml': 'pnpm',
    'yarn.lock': 'yarn',
    'package-lock.json': 'npm',
    'npm-shrinkwrap.json': 'npm',
  }

  let pm: PackageManager = 'npm'
  const pmCandidates: PackageManager[] = []
  for (const [lockfile, pmName] of Object.entries(LOCKFILE_TO_PACKAGE_MANAGER)) {
    if (existsSync(resolve(cwd(), lockfile))) {
      pmCandidates.push(pmName)
    }
  }
  if (pmCandidates.length === 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    pm = pmCandidates[0]!
  } else if (pmCandidates.length > 1) {
    pm = await normalizeAnswer(
      select({
        message:
          'More than one lockfile found, please select the package manager you would like to use',
        options: pmCandidates.map((candidate) => ({
          value: candidate,
          label: candidate,
        })),
      }),
    )
  } else {
    pm = await normalizeAnswer(
      select({
        message: 'Cannot infer which package manager to use, please select',
        options: SUPPORTED_PACKAGE_MANAGERS.map((candidate) => ({
          value: candidate,
          label: candidate,
        })),
      }),
    )
  }

  return pm
}
