/** A file in a merge request diff. */
export interface DiffFile {
  oldPath: string
  newPath: string
  diff: string
  isNew: boolean
  isDeleted: boolean
  isRenamed: boolean
}

/** SHA references for diff positioning. */
export interface DiffVersion {
  baseSha: string
  startSha: string
  headSha: string
}

/** A single blame line. */
export interface BlameLine {
  line: number
  author: string
  date: string
  commitSha: string
  commitMessage: string
}

/** A commit in the history. */
export interface Commit {
  sha: string
  author: string
  date: string
  message: string
  filesChanged: string[]
}

/**
 * VCS port for diff-inspect.
 * Any VCS provider that implements this works (GitHub, GitLab, Bitbucket, local git).
 * This is a minimal subset, not the full VcsProvider from viper-vcs-providers.
 */
export interface DiffInspectVcs {
  getMergeRequestDiff(projectId: number, mrIid: number): Promise<DiffFile[]>
  getMergeRequestVersion(projectId: number, mrIid: number): Promise<DiffVersion | null>
  getFileContent(projectId: number, filePath: string, ref: string): Promise<string | null>
  getFileBlame?(projectId: number, filePath: string, ref: string): Promise<BlameLine[]>
  getCommitHistory?(projectId: number, filePath: string, limit: number): Promise<Commit[]>
}

/** Which context types to include in the inspection. */
export type InspectInclude = 'diff' | 'blame' | 'commits' | 'author' | 'related' | 'scope'

/** Options for the inspect function. */
export interface InspectOptions {
  vcs: DiffInspectVcs
  projectId: number
  mr: {
    iid: number
    baseSha: string
    headSha: string
    author: string
  }
  /** Which context types to gather. Default: all available. */
  include?: InspectInclude[]
}

/** Diff context: what changed. */
export interface DiffContext {
  files: Array<{
    path: string
    oldPath?: string
    additions: number
    deletions: number
    patch: string
    isNew: boolean
    isDeleted: boolean
    isRenamed: boolean
  }>
  totalAdditions: number
  totalDeletions: number
  totalFiles: number
}

/** Blame context: who wrote the lines being modified. */
export interface BlameContext {
  file: string
  line: number
  originalAuthor: string
  originalDate: string
  commitMessage: string
  age: 'recent' | 'stable' | 'ancient'
}

/** Commit trail: recent history on affected files. */
export interface CommitContext {
  sha: string
  author: string
  date: string
  message: string
  filesChanged: string[]
}

/** Author profile: how familiar is the PR author with the affected code. */
export interface AuthorProfile {
  commitCount: number
  ownershipPercent: number
  firstContribution: string | null
  lastContribution: string | null
  familiarity: 'owner' | 'regular' | 'occasional' | 'first_time'
}

/** Related changes: other recent activity on the same files. */
export interface RelatedChange {
  type: 'commit'
  sha: string
  author: string
  title: string
  date: string
  filesOverlap: string[]
}

/** Scope analysis: how broad is this change. */
export interface ScopeAnalysis {
  filesChanged: number
  modulesAffected: string[]
  linesAdded: number
  linesRemoved: number
  newFiles: number
  deletedFiles: number
  renamedFiles: number
  containment: 'focused' | 'moderate' | 'sprawling'
}

/** The full inspection result. */
export interface InspectionResult {
  diff: DiffContext
  blame: BlameContext[]
  commits: CommitContext[]
  author: AuthorProfile
  related: RelatedChange[]
  scope: ScopeAnalysis
}
