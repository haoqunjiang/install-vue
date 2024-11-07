import { CORE_VUE_PACKAGES, BRANCH_FOR_EDGE_RELEASES } from './constants'

export default function generateOverridesMap(exactVersion?: string): Record<string, string> {
  return Object.fromEntries(
    CORE_VUE_PACKAGES.map((name) => {
      switch (RELEASE_TAG) {
        case 'alpha':
        case 'beta':
        case 'rc':
          return [name, exactVersion ?? RELEASE_TAG]
        case 'version':
          if (!exactVersion) throw new Error('Please provide a version to install')
          return [name, exactVersion]
        case 'commit':
          if (!exactVersion) throw new Error('Please provide a short commit hash to install')
          return [name, `https://pkg.pr.new/vuejs/core/${name}@${exactVersion}`]
        case 'pr':
          if (!exactVersion) throw new Error('Please provide a PR number to install')
          return [name, `https://pkg.pr.new/vuejs/core/${name}@${exactVersion}`]
        case 'edge':
          return [name, `https://pkg.pr.new/vuejs/core/${name}@${BRANCH_FOR_EDGE_RELEASES}`]
      }
    }),
  )
}
