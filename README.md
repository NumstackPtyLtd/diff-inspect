# @supaproxy/diff-inspect

Repository investigation for AI-powered tools. Extracts diff, blame, commit history, author profiles, and scope analysis from merge requests via a pluggable VCS interface.

## Install

```bash
npm install @supaproxy/diff-inspect
```

## Overview

`diff-inspect` gathers structured context from a merge request and returns it as a typed bundle. It does not call AI and does not manage token budgets. The consumer decides what to include in their prompt.

The package is VCS-agnostic. Any provider that implements the `DiffInspectVcs` interface works (GitHub, GitLab, Bitbucket, local git).

## Usage

```typescript
import { inspect } from '@supaproxy/diff-inspect'
import type { DiffInspectVcs } from '@supaproxy/diff-inspect'

// Implement the VCS interface for your platform
const vcs: DiffInspectVcs = {
  getMergeRequestDiff: async (projectId, mrIid) => { /* ... */ },
  getMergeRequestVersion: async (projectId, mrIid) => { /* ... */ },
  getFileContent: async (projectId, filePath, ref) => { /* ... */ },
  getFileBlame: async (projectId, filePath, ref) => { /* ... */ },
  getCommitHistory: async (projectId, filePath, limit) => { /* ... */ },
}

const result = await inspect({
  vcs,
  projectId: 42,
  mr: {
    iid: 123,
    baseSha: 'abc123',
    headSha: 'def456',
    author: 'alice',
  },
})

// result.diff     — what changed (files, additions, deletions, patches)
// result.blame    — who wrote the lines being modified
// result.commits  — recent commit history on affected files
// result.author   — how familiar the PR author is with the affected code
// result.related  — other people's recent work on the same files
// result.scope    — how broad the change is (focused, moderate, sprawling)
```

### Selective context gathering

Only gather the context types you need:

```typescript
const result = await inspect({
  vcs,
  projectId: 42,
  mr: { iid: 123, baseSha: 'abc123', headSha: 'def456', author: 'alice' },
  include: ['diff', 'scope'],
})
```

Available values for `include`: `'diff'`, `'blame'`, `'commits'`, `'author'`, `'related'`, `'scope'`.

The diff is always gathered regardless of the `include` option, because all other context types depend on it.

## DiffInspectVcs interface

This is the port that VCS providers must implement.

```typescript
interface DiffInspectVcs {
  getMergeRequestDiff(projectId: number, mrIid: number): Promise<DiffFile[]>
  getMergeRequestVersion(projectId: number, mrIid: number): Promise<DiffVersion | null>
  getFileContent(projectId: number, filePath: string, ref: string): Promise<string | null>
  getFileBlame?(projectId: number, filePath: string, ref: string): Promise<BlameLine[]>
  getCommitHistory?(projectId: number, filePath: string, limit: number): Promise<Commit[]>
}
```

Required methods:

- **getMergeRequestDiff**: returns the list of changed files with their patches.
- **getMergeRequestVersion**: returns the SHA references (base, start, head) for diff positioning.
- **getFileContent**: returns the content of a file at a specific ref.

Optional methods:

- **getFileBlame**: returns blame data for a file. If not implemented, blame context is skipped.
- **getCommitHistory**: returns recent commits touching a file. If not implemented, commit and author context is skipped.

## Context gatherers

Each context type is gathered by an independent function:

### Diff context

What changed. Always gathered. Returns files with paths, additions, deletions, patches, and flags for new, deleted, and renamed files.

### Blame context

Who wrote the lines being modified. Calls `getFileBlame` on the base SHA for each modified file (skipping new and deleted files). Each blame line is classified by age: `'recent'` (under 30 days), `'stable'` (under 1 year), or `'ancient'` (over 1 year).

### Commit context

Recent history on affected files. Calls `getCommitHistory` for each changed file, deduplicates by SHA, and returns the most recent commits sorted by date.

### Author profile

How familiar the merge request author is with the affected code. Derived from blame and commit data (no VCS calls). Returns commit count, ownership percentage, and a familiarity classification:

- `'owner'`: 50%+ ownership or 20+ commits
- `'regular'`: 5+ commits
- `'occasional'`: 1 to 4 commits
- `'first_time'`: no prior commits on the affected files

### Related changes

Other people's recent activity on the same files. Derived from commit history, filtered to exclude the merge request author. Shows which files overlap with the current change.

### Scope analysis

How broad the change is. Derived from the diff context. Infers modules from directory structure and classifies the change:

- `'focused'`: 3 or fewer files, 1 module
- `'moderate'`: up to 10 files, up to 3 modules
- `'sprawling'`: anything larger

## Exports

```typescript
// Main function
export { inspect }

// Types
export type {
  DiffInspectVcs,
  DiffFile,
  DiffVersion,
  BlameLine,
  Commit,
  InspectOptions,
  InspectInclude,
  InspectionResult,
  DiffContext,
  BlameContext,
  CommitContext,
  AuthorProfile,
  RelatedChange,
  ScopeAnalysis,
}
```

## Licence

MIT
