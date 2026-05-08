import type { BlameContext, CommitContext, AuthorProfile } from '../types.js'

/** Build an author profile from blame and commit data. */
export function buildAuthorProfile(
  prAuthor: string,
  blame: BlameContext[],
  commits: CommitContext[]
): AuthorProfile {
  // Count how many blame lines belong to the PR author
  const totalBlameLines = blame.length
  const authorBlameLines = blame.filter((b) => b.originalAuthor === prAuthor).length
  const ownershipPercent = totalBlameLines > 0 ? Math.round((authorBlameLines / totalBlameLines) * 100) : 0

  // Count commits by this author on the affected files
  const authorCommits = commits.filter((c) => c.author === prAuthor)
  const commitCount = authorCommits.length

  // Find first and last contribution
  const sorted = [...authorCommits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const firstContribution = sorted.length > 0 ? sorted[0].date : null
  const lastContribution = sorted.length > 0 ? sorted[sorted.length - 1].date : null

  return {
    commitCount,
    ownershipPercent,
    firstContribution,
    lastContribution,
    familiarity: classifyFamiliarity(commitCount, ownershipPercent),
  }
}

function classifyFamiliarity(commitCount: number, ownershipPercent: number): AuthorProfile['familiarity'] {
  if (commitCount === 0) return 'first_time'
  if (ownershipPercent >= 50 || commitCount >= 20) return 'owner'
  if (commitCount >= 5) return 'regular'
  return 'occasional'
}
