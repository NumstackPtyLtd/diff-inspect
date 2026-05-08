import { describe, it, expect, vi } from 'vitest'
import { inspect } from './inspector.js'
import type { DiffInspectVcs, DiffFile, BlameLine, Commit } from './types.js'

function mockVcs(overrides: Partial<DiffInspectVcs> = {}): DiffInspectVcs {
  return {
    getMergeRequestDiff: vi.fn().mockResolvedValue([]),
    getMergeRequestVersion: vi.fn().mockResolvedValue(null),
    getFileContent: vi.fn().mockResolvedValue(null),
    getFileBlame: vi.fn().mockResolvedValue([]),
    getCommitHistory: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

const baseMr = { iid: 1, baseSha: 'base', headSha: 'head', author: 'elvis' }

describe('inspect', () => {
  it('returns empty context for empty diff', async () => {
    const result = await inspect({ vcs: mockVcs(), projectId: 1, mr: baseMr })

    expect(result.diff.totalFiles).toBe(0)
    expect(result.diff.totalAdditions).toBe(0)
    expect(result.blame).toEqual([])
    expect(result.commits).toEqual([])
    expect(result.related).toEqual([])
    expect(result.author.familiarity).toBe('first_time')
    expect(result.scope.containment).toBe('focused')
  })

  it('extracts diff context from files', async () => {
    const files: DiffFile[] = [
      { oldPath: 'a.ts', newPath: 'a.ts', diff: '+line1\n+line2\n-removed', isNew: false, isDeleted: false, isRenamed: false },
      { oldPath: 'b.ts', newPath: 'b.ts', diff: '+added', isNew: true, isDeleted: false, isRenamed: false },
    ]
    const vcs = mockVcs({ getMergeRequestDiff: vi.fn().mockResolvedValue(files) })

    const result = await inspect({ vcs, projectId: 1, mr: baseMr })

    expect(result.diff.totalFiles).toBe(2)
    expect(result.diff.totalAdditions).toBe(3)
    expect(result.diff.totalDeletions).toBe(1)
    expect(result.diff.files[0].path).toBe('a.ts')
    expect(result.diff.files[1].isNew).toBe(true)
  })

  it('gathers blame for modified files', async () => {
    const files: DiffFile[] = [
      { oldPath: 'a.ts', newPath: 'a.ts', diff: '+change', isNew: false, isDeleted: false, isRenamed: false },
    ]
    const blameLines: BlameLine[] = [
      { line: 1, author: 'sibusiso', date: '2026-01-01', commitSha: 'abc', commitMessage: 'init' },
    ]
    const vcs = mockVcs({
      getMergeRequestDiff: vi.fn().mockResolvedValue(files),
      getFileBlame: vi.fn().mockResolvedValue(blameLines),
    })

    const result = await inspect({ vcs, projectId: 1, mr: baseMr })

    expect(result.blame).toHaveLength(1)
    expect(result.blame[0].originalAuthor).toBe('sibusiso')
    expect(result.blame[0].file).toBe('a.ts')
  })

  it('skips blame for new files', async () => {
    const files: DiffFile[] = [
      { oldPath: 'new.ts', newPath: 'new.ts', diff: '+code', isNew: true, isDeleted: false, isRenamed: false },
    ]
    const vcs = mockVcs({
      getMergeRequestDiff: vi.fn().mockResolvedValue(files),
      getFileBlame: vi.fn().mockResolvedValue([]),
    })

    const result = await inspect({ vcs, projectId: 1, mr: baseMr })

    expect(result.blame).toEqual([])
    expect(vcs.getFileBlame).not.toHaveBeenCalled()
  })

  it('classifies blame age correctly', async () => {
    const now = new Date()
    const recent = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const stable = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString()
    const ancient = new Date(now.getTime() - 500 * 24 * 60 * 60 * 1000).toISOString()

    const files: DiffFile[] = [
      { oldPath: 'a.ts', newPath: 'a.ts', diff: '+x', isNew: false, isDeleted: false, isRenamed: false },
    ]
    const blameLines: BlameLine[] = [
      { line: 1, author: 'a', date: recent, commitSha: '1', commitMessage: 'r' },
      { line: 2, author: 'b', date: stable, commitSha: '2', commitMessage: 's' },
      { line: 3, author: 'c', date: ancient, commitSha: '3', commitMessage: 'a' },
    ]
    const vcs = mockVcs({
      getMergeRequestDiff: vi.fn().mockResolvedValue(files),
      getFileBlame: vi.fn().mockResolvedValue(blameLines),
    })

    const result = await inspect({ vcs, projectId: 1, mr: baseMr })

    expect(result.blame[0].age).toBe('recent')
    expect(result.blame[1].age).toBe('stable')
    expect(result.blame[2].age).toBe('ancient')
  })

  it('builds author profile from blame and commits', async () => {
    const files: DiffFile[] = [
      { oldPath: 'a.ts', newPath: 'a.ts', diff: '+x', isNew: false, isDeleted: false, isRenamed: false },
    ]
    const blameLines: BlameLine[] = [
      { line: 1, author: 'elvis', date: '2026-01-01', commitSha: '1', commitMessage: 'a' },
      { line: 2, author: 'elvis', date: '2026-01-01', commitSha: '1', commitMessage: 'a' },
      { line: 3, author: 'other', date: '2025-06-01', commitSha: '2', commitMessage: 'b' },
    ]
    const commits: Commit[] = [
      { sha: '1', author: 'elvis', date: '2026-01-01', message: 'a', filesChanged: ['a.ts'] },
      { sha: '2', author: 'elvis', date: '2025-06-01', message: 'b', filesChanged: ['a.ts'] },
      { sha: '3', author: 'elvis', date: '2025-01-01', message: 'c', filesChanged: ['a.ts'] },
      { sha: '4', author: 'elvis', date: '2024-06-01', message: 'd', filesChanged: ['a.ts'] },
      { sha: '5', author: 'elvis', date: '2024-01-01', message: 'e', filesChanged: ['a.ts'] },
      { sha: '6', author: 'other', date: '2025-06-01', message: 'f', filesChanged: ['a.ts'] },
    ]
    const vcs = mockVcs({
      getMergeRequestDiff: vi.fn().mockResolvedValue(files),
      getFileBlame: vi.fn().mockResolvedValue(blameLines),
      getCommitHistory: vi.fn().mockResolvedValue(commits),
    })

    const result = await inspect({ vcs, projectId: 1, mr: baseMr })

    expect(result.author.commitCount).toBe(5)
    expect(result.author.ownershipPercent).toBe(67)
    expect(result.author.familiarity).toBe('owner')
  })

  it('classifies first-time contributor', async () => {
    const files: DiffFile[] = [
      { oldPath: 'a.ts', newPath: 'a.ts', diff: '+x', isNew: false, isDeleted: false, isRenamed: false },
    ]
    const blameLines: BlameLine[] = [
      { line: 1, author: 'other', date: '2026-01-01', commitSha: '1', commitMessage: 'a' },
    ]
    const commits: Commit[] = [
      { sha: '1', author: 'other', date: '2026-01-01', message: 'a', filesChanged: ['a.ts'] },
    ]
    const vcs = mockVcs({
      getMergeRequestDiff: vi.fn().mockResolvedValue(files),
      getFileBlame: vi.fn().mockResolvedValue(blameLines),
      getCommitHistory: vi.fn().mockResolvedValue(commits),
    })

    const result = await inspect({ vcs, projectId: 1, mr: baseMr })

    expect(result.author.commitCount).toBe(0)
    expect(result.author.familiarity).toBe('first_time')
  })

  it('finds related changes from other authors', async () => {
    const files: DiffFile[] = [
      { oldPath: 'a.ts', newPath: 'a.ts', diff: '+x', isNew: false, isDeleted: false, isRenamed: false },
    ]
    const commits: Commit[] = [
      { sha: '1', author: 'elvis', date: '2026-01-01', message: 'my change', filesChanged: ['a.ts'] },
      { sha: '2', author: 'sarah', date: '2026-01-02', message: 'her change', filesChanged: ['a.ts', 'b.ts'] },
    ]
    const vcs = mockVcs({
      getMergeRequestDiff: vi.fn().mockResolvedValue(files),
      getCommitHistory: vi.fn().mockResolvedValue(commits),
    })

    const result = await inspect({ vcs, projectId: 1, mr: baseMr })

    expect(result.related).toHaveLength(1)
    expect(result.related[0].author).toBe('sarah')
    expect(result.related[0].filesOverlap).toEqual(['a.ts'])
  })

  it('analyses scope for focused change', async () => {
    const files: DiffFile[] = [
      { oldPath: 'src/payments/pay.ts', newPath: 'src/payments/pay.ts', diff: '+x', isNew: false, isDeleted: false, isRenamed: false },
    ]
    const vcs = mockVcs({ getMergeRequestDiff: vi.fn().mockResolvedValue(files) })

    const result = await inspect({ vcs, projectId: 1, mr: baseMr })

    expect(result.scope.filesChanged).toBe(1)
    expect(result.scope.containment).toBe('focused')
    expect(result.scope.modulesAffected).toEqual(['src/payments'])
  })

  it('analyses scope for sprawling change', async () => {
    const files: DiffFile[] = Array.from({ length: 15 }, (_, i) => ({
      oldPath: `src/module${i}/file.ts`,
      newPath: `src/module${i}/file.ts`,
      diff: '+x\n+y',
      isNew: i < 3,
      isDeleted: i === 14,
      isRenamed: false,
    }))
    const vcs = mockVcs({ getMergeRequestDiff: vi.fn().mockResolvedValue(files) })

    const result = await inspect({ vcs, projectId: 1, mr: baseMr })

    expect(result.scope.filesChanged).toBe(15)
    expect(result.scope.containment).toBe('sprawling')
    expect(result.scope.newFiles).toBe(3)
    expect(result.scope.deletedFiles).toBe(1)
  })

  it('detects renamed files', async () => {
    const files: DiffFile[] = [
      { oldPath: 'old.ts', newPath: 'new.ts', diff: '', isNew: false, isDeleted: false, isRenamed: true },
    ]
    const vcs = mockVcs({ getMergeRequestDiff: vi.fn().mockResolvedValue(files) })

    const result = await inspect({ vcs, projectId: 1, mr: baseMr })

    expect(result.scope.renamedFiles).toBe(1)
    expect(result.diff.files[0].oldPath).toBe('old.ts')
    expect(result.diff.files[0].path).toBe('new.ts')
  })

  it('respects include filter', async () => {
    const files: DiffFile[] = [
      { oldPath: 'a.ts', newPath: 'a.ts', diff: '+x', isNew: false, isDeleted: false, isRenamed: false },
    ]
    const vcs = mockVcs({
      getMergeRequestDiff: vi.fn().mockResolvedValue(files),
      getFileBlame: vi.fn().mockResolvedValue([]),
      getCommitHistory: vi.fn().mockResolvedValue([]),
    })

    const result = await inspect({ vcs, projectId: 1, mr: baseMr, include: ['diff', 'scope'] })

    expect(result.diff.totalFiles).toBe(1)
    expect(result.scope.filesChanged).toBe(1)
    // Blame and commits should not have been called
    expect(vcs.getFileBlame).not.toHaveBeenCalled()
    expect(vcs.getCommitHistory).not.toHaveBeenCalled()
    expect(result.blame).toEqual([])
    expect(result.commits).toEqual([])
  })

  it('works without optional VCS methods', async () => {
    const files: DiffFile[] = [
      { oldPath: 'a.ts', newPath: 'a.ts', diff: '+x', isNew: false, isDeleted: false, isRenamed: false },
    ]
    // VCS without getFileBlame or getCommitHistory
    const vcs: DiffInspectVcs = {
      getMergeRequestDiff: vi.fn().mockResolvedValue(files),
      getMergeRequestVersion: vi.fn().mockResolvedValue(null),
      getFileContent: vi.fn().mockResolvedValue(null),
    }

    const result = await inspect({ vcs, projectId: 1, mr: baseMr })

    expect(result.diff.totalFiles).toBe(1)
    expect(result.blame).toEqual([])
    expect(result.commits).toEqual([])
    expect(result.author.familiarity).toBe('first_time')
  })
})
