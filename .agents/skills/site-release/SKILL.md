---
name: site-release
description: Verify, commit, push, and publish prepared changes to Li Yunfei's GitHub Pages academic site when the user requests a release or repository update.
---

Inspect Git status, current branch, remote, and diff. The intended repository is `Mantains/mantains.github.io`. Preserve unrelated working changes and never force-push. Run `npm run verify` against the exact content being released. Check relevant local pages when layout or rendering changed.

Respect the requested destination: a preview stays local; a branch push updates that branch; publishing uses the approved production path. `main` automatically publishes through `.github/workflows/deploy.yml`. Approval to prepare content is not approval to publish; an explicit publishing request is sufficient authorization and should not trigger another confirmation.

Commit only intended files with a clear message, push using existing authentication, and inspect GitHub Actions for that commit. Keep credentials out of source, arguments, logs, and generated pages. Follow up on build failures before reporting success. Confirm the final public URL returns the expected content. Report the commit, URL, and any remaining verification limitation.
