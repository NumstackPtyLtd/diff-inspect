import type { InspectOptions, InspectionResult, InspectInclude } from './types.js'
import { gatherDiff } from './context/diff.js'
import { gatherBlame } from './context/blame.js'
import { gatherCommits } from './context/commits.js'
import { buildAuthorProfile } from './context/author.js'
import { findRelatedChanges } from './context/related.js'
import { analyseScope } from './context/scope.js'

const ALL_INCLUDES: InspectInclude[] = ['diff', 'blame', 'commits', 'author', 'related', 'scope']

/**
 * Inspect a merge request and return a structured context bundle.
 *
 * Returns everything requested. Does not call AI. Does not manage token budgets.
 * The consumer decides what to include in their prompt.
 */
export async function inspect(options: InspectOptions): Promise<InspectionResult> {
  const { vcs, projectId, mr } = options
  const include = new Set(options.include ?? ALL_INCLUDES)

  // Always gather the diff (everything else depends on it)
  const diff = await gatherDiff(vcs, projectId, mr.iid)

  // Gather blame and commits in parallel (both are independent VCS calls)
  const [blame, commits] = await Promise.all([
    include.has('blame') ? gatherBlame(vcs, projectId, mr.baseSha, diff) : Promise.resolve([]),
    include.has('commits') ? gatherCommits(vcs, projectId, diff) : Promise.resolve([]),
  ])

  // Author and related are derived from blame + commits (no VCS calls)
  const author = include.has('author')
    ? buildAuthorProfile(mr.author, blame, commits)
    : { commitCount: 0, ownershipPercent: 0, firstContribution: null, lastContribution: null, familiarity: 'first_time' as const }

  const related = include.has('related')
    ? findRelatedChanges(mr.author, diff, commits)
    : []

  // Scope is derived from diff (no VCS calls)
  const scope = include.has('scope')
    ? analyseScope(diff)
    : { filesChanged: diff.totalFiles, modulesAffected: [], linesAdded: diff.totalAdditions, linesRemoved: diff.totalDeletions, newFiles: 0, deletedFiles: 0, renamedFiles: 0, containment: 'focused' as const }

  return { diff, blame, commits, author, related, scope }
}
