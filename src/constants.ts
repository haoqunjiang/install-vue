export const CORE_VUE_PACKAGES = [
  'vue',
  '@vue/compiler-core',
  '@vue/compiler-dom',
  '@vue/compiler-sfc',
  '@vue/compiler-ssr',
  '@vue/reactivity',
  '@vue/runtime-core',
  '@vue/runtime-dom',
  '@vue/server-renderer',
  '@vue/shared',
  '@vue/compat',
] as const

export const NPM_DIST_TAGS = ['alpha', 'beta', 'rc'] as const
export const PKG_PR_NEW_TAGS = ['edge', 'commit', 'pr'] as const
export const SPECIFIC_NPM_VERSION = 'version'

export const BRANCH_FOR_EDGE_RELEASES = 'main'

type ArrayElement<A> = A extends readonly (infer T)[] ? T : never

declare global {
  // the RELEASE_TAG would be replaced at build time
  const RELEASE_TAG:
    | ArrayElement<typeof NPM_DIST_TAGS>
    | ArrayElement<typeof PKG_PR_NEW_TAGS>
    | typeof SPECIFIC_NPM_VERSION
}

export const SUPPORTED_PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const
export type PackageManager = ArrayElement<typeof SUPPORTED_PACKAGE_MANAGERS>
