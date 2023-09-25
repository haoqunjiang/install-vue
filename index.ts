#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { parseArgs } from 'node:util'

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
import { execa, ExecaError } from 'execa'
import pico from 'picocolors'

// normalize the prompt answer and deal with cancel operations
function normalizeAnswer<T>(cancellable: T | symbol): T {
  if (isCancel(cancellable)) {
    cancel('Operation cancelled.')
    process.exit(0)
  } else {
    return cancellable
  }
}

// the RELEASE_TAG would be replaced at build time
declare global {
  const RELEASE_TAG: 'canary' | 'canary-minor' | 'alpha' | 'beta' | 'rc'
}

// parse the command-line arguments
// npx install-vue@canary --version 3.20230911.0
const { values: args } = parseArgs({
  options: {
    version: {
      type: 'string',
    },
  },
})

const packageJsonPath = resolve(cwd(), './package.json')
if (!existsSync(packageJsonPath)) {
  throw new Error('Cannot find package.json in the current directory')
}
const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

intro('Installing Vue.js')

// decide which package manager to use
const SUPPORTED_PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn'] as const
type PackageManager = (typeof SUPPORTED_PACKAGE_MANAGERS)[number]
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
  pm = normalizeAnswer(
    await select({
      message:
        'More than one lockfile found, please select the package manager you would like to use',
      options: pmCandidates.map((candidate) => ({
        value: candidate,
        label: candidate,
      })),
    }),
  )
} else {
  pm = normalizeAnswer(
    await select({
      message: 'Cannot infer which package manager to use, please select',
      options: SUPPORTED_PACKAGE_MANAGERS.map((candidate) => ({
        value: candidate,
        label: candidate,
      })),
    }),
  )
}

const CORE_VUE_PACKAGES = [
  'vue',
  '@vue/compiler-core',
  '@vue/compiler-dom',
  '@vue/compiler-sfc',
  '@vue/compiler-ssr',
  '@vue/reactivity',
  // TODO: remove reactivity-transform
  '@vue/reactivity-transform',
  '@vue/runtime-core',
  '@vue/runtime-dom',
  '@vue/server-renderer',
  '@vue/shared',
  '@vue/compat',
]
const toCanaryPackageName = (name: string) =>
  name === 'vue' ? '@vue/canary' : `${name}-canary`

function getOverrides(version?: string): Record<string, string> {
  return Object.fromEntries(
    CORE_VUE_PACKAGES.map((name) => {
      const packageName = RELEASE_TAG.startsWith('canary')
        ? toCanaryPackageName(name)
        : name

      if (RELEASE_TAG === 'canary') {
        return [name, `${packageName}${version ? `@${version}` : ''}}`]
      } else if (RELEASE_TAG === 'canary-minor') {
        return [name, `${packageName}@${version ?? 'minor'}}`]
      } else {
        return [name, `${packageName}@${version ?? RELEASE_TAG}`]
      }
    }),
  )
}

// apply the overrides to the package.json
if (pm === 'npm') {
  // https://github.com/npm/rfcs/blob/main/accepted/0036-overrides.md
  // Must use exact version (won't work without version or with `@latest`)
  let targetVersion: string
  if (args.version) {
    targetVersion = args.version
  } else {
    const corePackageName = RELEASE_TAG.startsWith('canary')
      ? '@vue/canary'
      : 'vue'
    let distTag: string = RELEASE_TAG
    if (RELEASE_TAG === 'canary') {
      distTag = 'latest'
    } else if (RELEASE_TAG === 'canary-minor') {
      distTag = 'minor'
    }

    const s = spinner()
    s.start(`Checking for the latest ${RELEASE_TAG} version`)
    const { stdout } = await execa(
      'npm',
      ['info', `${corePackageName}@${distTag}`, 'version', '--json'],
      { stdio: 'pipe' },
    )
    targetVersion = JSON.parse(stdout)
    s.stop(`Found ${RELEASE_TAG} version ${pico.yellow(targetVersion)}`)
  }

  let overrides: Record<string, string> = getOverrides(targetVersion)
  pkg.overrides = {
    ...pkg.overrides,
    ...overrides,
  }

  // NPM requires direct dependencies to be rewritten too
  for (const dependencyName of CORE_VUE_PACKAGES) {
    for (const dependencyType of [
      'dependencies',
      'devDependencies',
      'optionalDependencies',
    ]) {
      if (pkg[dependencyType]?.[dependencyName]) {
        pkg[dependencyType][dependencyName] = overrides[dependencyName]
      }
    }
  }
} else if (pm === 'pnpm') {
  const overrides = getOverrides()

  pkg.pnpm ??= {}

  // https://pnpm.io/package_json#pnpmoverrides
  // pnpm & npm overrides differs slightly on their abilities: https://github.com/npm/rfcs/pull/129/files#r440478558
  // so they use different configuration fields
  pkg.pnpm.overrides = {
    ...pkg.pnpm.overrides,
    ...overrides,
  }

  // https://pnpm.io/package_json#pnpmpeerdependencyrulesallowany
  pkg.pnpm.peerDependencyRules ??= {}
  pkg.pnpm.peerDependencyRules.allowAny ??= []
  pkg.pnpm.peerDependencyRules.allowAny.push('vue')
} else if (pm === 'yarn') {
  // https://github.com/yarnpkg/rfcs/blob/master/implemented/0000-selective-versions-resolutions.md
  pkg.resolutions = {
    ...pkg.resolutions,
    ...getOverrides(),
  }
} else {
  // unreachable
}

// write pkg back
writeFileSync(
  packageJsonPath,
  JSON.stringify(pkg, undefined, 2) + '\n',
  'utf-8',
)

log.step(
  `Updated ${pico.yellow('package.json')} for ${pico.magenta(
    pm,
  )} dependency overrides`,
)

// prompt & run install
const shouldInstall = normalizeAnswer(
  await confirm({
    message: `Run ${pico.magenta(
      `${pm} install`,
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
  s.start(`Installing via ${pm}`)
  try {
    await execa(pm, ['install'], { stdio: 'pipe' })
    s.stop(`Installed via ${pm}`)
  } catch (e) {
    s.stop(pico.red('Installation failed'))
    log.error((e as ExecaError).stderr || (e as ExecaError).message)
    process.exit(1)
  }
  outro(`Done!`)
} else {
  outro(`Done! Don't forget to run ${pico.magenta(`${pm} install`)} later.`)
}
