import { CORE_VUE_PACKAGES, BRANCH_FOR_EDGE_RELEASES } from './constants'

async function getLatestCommit(branch: string): Promise<string> {
  const response = await fetch(`https://api.github.com/repos/vuejs/core/branches/${branch}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch latest commit from GitHub: ${response.statusText}`)
  }
  const data = (await response.json()) as { commit: { sha: string } }
  return data.commit.sha.substring(0, 7)
}

export default async function generateOverridesMap(
  exactVersion?: string,
): Promise<Record<string, string>> {
  let edgeCommit: string | undefined
  if (RELEASE_TAG === 'edge') {
    // branch alias in pkg.pr.new doesn't work as expected,
    // so we need to resolve the latest commit ourselves
    // https://github.com/stackblitz-labs/pkg.pr.new/issues/394
    edgeCommit = await getLatestCommit(BRANCH_FOR_EDGE_RELEASES)
  }

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
          return [name, `https://pkg.pr.new/vuejs/core/${name}@${edgeCommit}`]
      }
    }),
  )
}
