import type { DiffContext, ScopeAnalysis } from '../types.js'

/** Analyse the scope of a change. */
export function analyseScope(diff: DiffContext): ScopeAnalysis {
  const modules = new Set<string>()
  let newFiles = 0
  let deletedFiles = 0
  let renamedFiles = 0

  for (const file of diff.files) {
    // Infer module from first two directory segments (e.g. src/payments/ → src/payments)
    const parts = file.path.split('/')
    if (parts.length >= 2) {
      modules.add(parts.slice(0, 2).join('/'))
    } else {
      modules.add(parts[0])
    }

    if (file.isNew) newFiles++
    if (file.isDeleted) deletedFiles++
    if (file.isRenamed) renamedFiles++
  }

  const modulesAffected = Array.from(modules).sort()

  return {
    filesChanged: diff.totalFiles,
    modulesAffected,
    linesAdded: diff.totalAdditions,
    linesRemoved: diff.totalDeletions,
    newFiles,
    deletedFiles,
    renamedFiles,
    containment: classifyContainment(diff.totalFiles, modulesAffected.length),
  }
}

function classifyContainment(files: number, modules: number): ScopeAnalysis['containment'] {
  if (files <= 3 && modules <= 1) return 'focused'
  if (files <= 10 && modules <= 3) return 'moderate'
  return 'sprawling'
}
