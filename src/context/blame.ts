import type { DiffInspectVcs, DiffContext, BlameContext } from '../types.js'

/** Extract blame context for modified files. */
export async function gatherBlame(
  vcs: DiffInspectVcs,
  projectId: number,
  baseSha: string,
  diff: DiffContext
): Promise<BlameContext[]> {
  if (!vcs.getFileBlame) return []

  const results: BlameContext[] = []
  const now = Date.now()

  for (const file of diff.files) {
    if (file.isNew || file.isDeleted) continue

    try {
      const blameLines = await vcs.getFileBlame(projectId, file.path, baseSha)

      for (const line of blameLines) {
        results.push({
          file: file.path,
          line: line.line,
          originalAuthor: line.author,
          originalDate: line.date,
          commitMessage: line.commitMessage,
          age: classifyAge(line.date, now),
        })
      }
    } catch {
      // Skip files where blame fails (binary, too large, etc.)
    }
  }

  return results
}

function classifyAge(dateStr: string, now: number): 'recent' | 'stable' | 'ancient' {
  const age = now - new Date(dateStr).getTime()
  const days = age / (1000 * 60 * 60 * 24)
  if (days < 30) return 'recent'
  if (days < 365) return 'stable'
  return 'ancient'
}
