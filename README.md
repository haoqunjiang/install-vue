> Install Vue.js prereleases, done correctly.

## Usage

To install the latest edge release of Vue.js (the released artifacts from the latest commit in [vuejs/core#main](https://github.com/vuejs/core/commits/main/)) in your project, run:

```sh
npx install-vue@edge
```

Other tags are also available.

| command                          | description                                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npx install-vue@edge`           | Install the latest commit from the main branch.                                                             |
| `npx install-vue@pr 12272`       | Install the release from a specific PR (e.g. [#12272](https://github.com/vuejs/core/pull/12272))            |
| `npx install-vue@commit 664d2e5` | Install the release from a specific commit (e.g. [664d2e5](https://github.com/vuejs/core/runs/32138997733)) |
| `npx install-vue@alpha`          | Install the latest alpha version from npm.                                                                  |
| `npx install-vue@beta`           | Install the latest beta version from npm.                                                                   |
| `npx install-vue@rc`             | Install the latest release candidate version from npm.                                                      |
| `npx install-vue@version 3.5.3`  | Install a specific Vue.js version from npm.                                                                 |

> [!IMPORTANT]  
> The `edge`, `commit` and `pr` releases are powered by [pkg.pr.new](https://github.com/stackblitz-labs/pkg.pr.new). The releases will be removed from cloud storage after 6 months, or 30 days without any downloads. So please don't rely on them for production use.
