import type { DiffInspectVcs, DiffContext, CommitContext } from '../types.js'

/** Gather recent commit history for affected files. */
export async function gatherCommits(
  vcs: DiffInspectVcs,
  projectId: number,
  diff: DiffContext,
  limit: number = 10
): Promise<CommitContext[]> {
  if (!vcs.getCommitHistory) return []

  const seen = new Set<string>()
  const results: CommitContext[] = []

  for (const file of diff.files) {
    try {
      const commits = await vcs.getCommitHistory(projectId, file.path, limit)

      for (const commit of commits) {
        if (seen.has(commit.sha)) continue
        seen.add(commit.sha)

        results.push({
          sha: commit.sha,
          author: commit.author,
          date: commit.date,
          message: commit.message,
          filesChanged: commit.filesChanged,
        })
      }
    } catch {
      // Skip files where history fails
    }
  }

  // Sort by date descending (most recent first)
  results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return results.slice(0, limit)
}
