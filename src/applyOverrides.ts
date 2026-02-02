import { execa } from 'execa'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pico from 'picocolors'
import { spinner } from '@clack/prompts'

import { CORE_VUE_PACKAGES, NPM_DIST_TAGS, type PackageManager } from './constants'
import generateOverridesMap from './generateOverridesMap'

export default async function applyOverrides(
  pm: PackageManager,
  pkg: any,
  workspaceRoot: string,
  versionArgument?: string,
): Promise<{ pkg: any; modifiedFiles: string[] }> {
  if (pm === 'npm' || pm === 'bun') {
    let exactVersion = versionArgument

    // https://github.com/npm/rfcs/blob/main/accepted/0036-overrides.md
    // Must use exact version (won't work without version or with `@latest`)
    // PKG_PR_NEW_TAGS are not affected here, though.
    // Note: Bun uses the same overrides syntax as npm
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

    let overrides: Record<string, string> = await generateOverridesMap(exactVersion)
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

    return { pkg, modifiedFiles: ['package.json'] }
  } else if (pm === 'pnpm') {
    const overrides = await generateOverridesMap(versionArgument)

    // pnpm now recommends putting overrides in pnpm-workspace.yaml
    // https://pnpm.io/settings#overrides
    const yamlContent = `overrides:
${Object.entries(overrides)
  .map(([key, value]) => `  '${key}': '${value}'`)
  .join('\n')}

peerDependencyRules:
  allowAny:
    - 'vue'
`

    const workspaceFilePath = resolve(workspaceRoot, 'pnpm-workspace.yaml')
    writeFileSync(workspaceFilePath, yamlContent, 'utf-8')

    return { pkg, modifiedFiles: ['pnpm-workspace.yaml'] }
  } else if (pm === 'yarn') {
    // https://github.com/yarnpkg/rfcs/blob/master/implemented/0000-selective-versions-resolutions.md
    pkg.resolutions = {
      ...pkg.resolutions,
      ...(await generateOverridesMap(versionArgument)),
    }

    return { pkg, modifiedFiles: ['package.json'] }
  } else {
    // unreachable
    throw new Error(`Unsupported package manager: ${pm}`)
  }
}
