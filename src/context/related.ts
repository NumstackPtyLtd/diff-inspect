import type { DiffContext, CommitContext, RelatedChange } from '../types.js'

/** Find related changes from the commit history (other people's recent work on the same files). */
export function findRelatedChanges(
  prAuthor: string,
  diff: DiffContext,
  commits: CommitContext[]
): RelatedChange[] {
  const affectedFiles = new Set(diff.files.map((f) => f.path))

  return commits
    .filter((c) => c.author !== prAuthor)
    .map((c) => ({
      type: 'commit' as const,
      sha: c.sha,
      author: c.author,
      title: c.message.split('\n')[0],
      date: c.date,
      filesOverlap: c.filesChanged.filter((f) => affectedFiles.has(f)),
    }))
    .filter((r) => r.filesOverlap.length > 0)
}
