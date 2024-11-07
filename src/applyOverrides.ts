import { execa } from 'execa'
import pico from 'picocolors'
import { spinner } from '@clack/prompts'

import { CORE_VUE_PACKAGES, NPM_DIST_TAGS, type PackageManager } from './constants'
import generateOverridesMap from './generateOverridesMap'

export default async function applyOverrides(
  pm: PackageManager,
  pkg: any,
  versionArgument?: string,
) {
  if (pm === 'npm') {
    let exactVersion = versionArgument

    // https://github.com/npm/rfcs/blob/main/accepted/0036-overrides.md
    // Must use exact version (won't work without version or with `@latest`)
    // PKG_PR_NEW_TAGS are not affected here, though.
    // @ts-expect-error
    if (NPM_DIST_TAGS.includes(RELEASE_TAG) && !exactVersion) {
      let distTag: string = RELEASE_TAG

      const s = spinner()
      s.start(`Checking for the latest ${RELEASE_TAG} version`)
      const { stdout } = await execa('npm', ['info', `vue@${distTag}`, 'version', '--json'], {
        stdio: 'pipe',
      })
      exactVersion = JSON.parse(stdout)
      s.stop(`Found ${RELEASE_TAG} version ${pico.yellow(exactVersion)}`)
    }

    let overrides: Record<string, string> = generateOverridesMap(exactVersion)
    pkg.overrides = {
      ...pkg.overrides,
      ...overrides,
    }

    // NPM requires direct dependencies to be rewritten too
    for (const dependencyName of CORE_VUE_PACKAGES) {
      for (const dependencyType of ['dependencies', 'devDependencies', 'optionalDependencies']) {
        if (pkg[dependencyType]?.[dependencyName]) {
          pkg[dependencyType][dependencyName] = overrides[dependencyName]
        }
      }
    }
  } else if (pm === 'pnpm') {
    const overrides = generateOverridesMap(versionArgument)

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
      ...generateOverridesMap(versionArgument),
    }
  } else {
    // unreachable
  }

  return pkg
}
