# @supaproxy/diff-inspect

Repository investigation package for AI-powered tools. Extracts structured context from merge request diffs: blame, commit history, author profiles, scope analysis, and related changes. Provider-agnostic; works with any VCS that implements the `DiffInspectVcs` interface.

See the [central hub](https://github.com/NumstackPtyLtd/supaproxy) for cross-repo governance, workflow, and conventions.

## Architecture

```
src/
├── types.ts              All interfaces (DiffInspectVcs, InspectOptions, InspectionResult, etc.)
├── inspector.ts          inspect() function, orchestrates context gathering
├── inspector.test.ts     Tests for the inspector
├── context/              Context gatherers (one per concern)
│   ├── diff.ts           gatherDiff: parse MR diff into structured DiffContext
│   ├── blame.ts          gatherBlame: who wrote the lines being modified
│   ├── commits.ts        gatherCommits: recent commit history on affected files
│   ├── author.ts         buildAuthorProfile: author familiarity with affected code
│   ├── related.ts        findRelatedChanges: other recent activity on same files
│   └── scope.ts          analyseScope: how broad the change is (focused, moderate, sprawling)
└── index.ts              Public exports
```

## How it works

The `inspect()` function takes an `InspectOptions` object with:

- `vcs`: any object implementing `DiffInspectVcs` (GitHub, GitLab, Bitbucket, local git)
- `projectId`, `mr` details (iid, baseSha, headSha, author)
- `include`: optional array to select which context types to gather

It returns an `InspectionResult` containing diff, blame, commits, author profile, related changes, and scope analysis. The package does not call AI or manage token budgets. The consumer decides what to include in their prompt.

## VCS port pattern

The `DiffInspectVcs` interface is the dependency inversion boundary. Any VCS provider that implements these methods works:

- `getMergeRequestDiff()` (required)
- `getMergeRequestVersion()` (required)
- `getFileContent()` (required)
- `getFileBlame()` (optional)
- `getCommitHistory()` (optional)

## Build and test

```bash
pnpm install
pnpm build          # tsc, outputs to dist/
pnpm test           # vitest run
pnpm test:watch     # vitest in watch mode
pnpm test:coverage  # vitest with coverage
```

## Publishing

```bash
pnpm build && pnpm test
# Version bump in package.json following semver
npm publish --access public
```

Published as `@supaproxy/diff-inspect` on npm. Ships compiled `dist/` directory.

## Git workflow

- NEVER push directly to main. Always create a feature branch and open a PR.
- Branch naming: `feat/`, `fix/`, `chore/`, `docs/` prefixes.
- NEVER run destructive git commands (`git push --force`, `git reset --hard`, `git clean -f`).
- Squash merge to main via GitHub UI.

## Code rules

- No `any` types. No `as any` casts. Define interfaces for all parameters and return values.
- No hardcoded provider names, model IDs, or URLs. The package is VCS-agnostic by design.
- No em dashes or en dashes. Use commas, full stops, or semicolons.
- British English throughout (analyse, colour, organisation).
- Straight quotes only. Sentence case for headings.
- Context gatherers are pure functions. No side effects, no external state.
- The `DiffInspectVcs` interface is the only external dependency boundary. Never import concrete VCS implementations.
