---
name: "bump-version"
description: "Bumps the version of the monorepo and all workspace packages. Invoke when the user asks to bump the version, create a new release, or update package versions."
---

# Bump Version

This skill automates the process of bumping the version for the `n8n-nodes-agent-brains` monorepo.

## Steps to Bump Version

When the user requests a version bump (e.g., patch, minor, major), follow these steps:

1. **Determine the bump type**: Ask the user if they want a `patch`, `minor`, or `major` bump if they haven't specified.
2. **Bump workspace packages**: Run `npm version <type> --workspaces` to bump all packages in the `packages/` directory.
3. **Bump root package**: Run `npm version <type> --no-git-tag-version` to bump the root `package.json` without creating a git tag yet.
4. **Commit the changes**: Run `git add . && git commit -m "chore: bump version to <new-version>"`.
5. **Create the git tag**: Run `git tag <new-version>`.
6. **Push to remote**: Instruct the user to push the changes and the tag to both `origin` and `github` remotes using:
   ```bash
   git push origin master && git push origin <new-version>
   git push github master && git push github <new-version>
   ```
