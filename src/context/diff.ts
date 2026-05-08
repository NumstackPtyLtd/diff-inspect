import type { DiffInspectVcs, DiffContext } from '../types.js'

/** Extract diff context from a merge request. */
export async function gatherDiff(vcs: DiffInspectVcs, projectId: number, mrIid: number): Promise<DiffContext> {
  const files = await vcs.getMergeRequestDiff(projectId, mrIid)

  let totalAdditions = 0
  let totalDeletions = 0

  const mapped = files.map((f) => {
    const additions = countLines(f.diff, '+')
    const deletions = countLines(f.diff, '-')
    totalAdditions += additions
    totalDeletions += deletions

    return {
      path: f.newPath,
      oldPath: f.isRenamed ? f.oldPath : undefined,
      additions,
      deletions,
      patch: f.diff,
      isNew: f.isNew,
      isDeleted: f.isDeleted,
      isRenamed: f.isRenamed,
    }
  })

  return {
    files: mapped,
    totalAdditions,
    totalDeletions,
    totalFiles: files.length,
  }
}

function countLines(patch: string, prefix: '+' | '-'): number {
  if (!patch) return 0
  return patch.split('\n').filter((line) => line.startsWith(prefix) && !line.startsWith(prefix + prefix + prefix)).length
}
