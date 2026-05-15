import type { Operation, OperationLogEntry, OperationResult } from './types'
import { getGit, validateRepo, sanitizeBranchName, makeLogEntry } from '../services/git.service'
import type { SimpleGit } from 'simple-git'

export const autoMergeOperation: Operation = {
  id: 'auto-merge',
  name: 'Auto-Merge',
  description: 'Merge a source branch into a target branch across selected repositories. Conflict check is mandatory before any merge.',
  parameters: [
    {
      id: 'sourceBranch',
      label: 'Source Branch',
      type: 'text',
      required: true,
      placeholder: 'development',
    },
    {
      id: 'targetBranch',
      label: 'Target Branch',
      type: 'text',
      required: true,
      placeholder: 'main',
    },
  ],
  repoSelection: 'user',
  supportsDryRun: true,

  async dryRun(repos, params, log, abortSignal) {
    return runConflictCheck(repos, params, log, abortSignal)
  },

  async execute(repos, params, log, abortSignal) {
    // Phase 1: mandatory conflict check
    const conflictResult = await runConflictCheck(repos, params, log, abortSignal)
    if (!conflictResult.success) return conflictResult
    if (abortSignal.aborted) return aborted(conflictResult.logs)

    // Phase 2: execute merges
    const sourceBranch = sanitizeBranchName(params.sourceBranch as string)
    const targetBranch = sanitizeBranchName(params.targetBranch as string)

    const logs: OperationLogEntry[] = [...conflictResult.logs]
    const perRepo: OperationResult['perRepo'] = []
    let successCount = 0
    let skippedCount = 0

    const noChangesRepos = new Set(
      conflictResult.perRepo
        .filter(r => r.status === 'skipped' && r.detail === 'No changes')
        .map(r => r.repository)
    )

    log(makeLogEntry('info', `Phase 2: Executing merges...`))
    logs.push(makeLogEntry('info', `Phase 2: Executing merges`))

    for (const repoPath of repos) {
      if (abortSignal.aborted) {
        perRepo.push({ repository: repoPath, status: 'skipped', detail: 'Aborted' })
        continue
      }

      if (noChangesRepos.has(repoPath)) {
        log(makeLogEntry('info', `Skipped — no changes`, repoPath))
        logs.push(makeLogEntry('info', `Skipped — no changes`, repoPath))
        perRepo.push({ repository: repoPath, status: 'skipped', detail: 'No changes' })
        skippedCount++
        continue
      }

      log(makeLogEntry('info', `Merging '${sourceBranch}' → '${targetBranch}'`, repoPath))
      logs.push(makeLogEntry('info', `Merging '${sourceBranch}' → '${targetBranch}'`, repoPath))

      try {
        const git = getGit(repoPath)
        await git.fetch(['--all', '--prune'])
        await git.checkout(targetBranch)
        await git.pull('origin', targetBranch)
        await ensureSourceBranch(git, sourceBranch, targetBranch)
        await git.merge([sourceBranch, '--no-ff', '-m', `[GitHelper AutoMerge] merge branch '${sourceBranch}' into '${targetBranch}'`])
        await git.push('origin', targetBranch)

        log(makeLogEntry('success', `Merge complete`, repoPath))
        logs.push(makeLogEntry('success', `Merge complete`, repoPath))
        perRepo.push({ repository: repoPath, status: 'success' })
        successCount++
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        // Attempt to abort the merge if it left us in a bad state
        try { await getGit(repoPath).merge(['--abort']) } catch { /* ignore */ }
        log(makeLogEntry('error', `Failed: ${message}`, repoPath))
        logs.push(makeLogEntry('error', `Failed: ${message}`, repoPath))
        perRepo.push({ repository: repoPath, status: 'failed', detail: message })
      }
    }

    const mergeableCount = repos.length - skippedCount
    const summaryParts = [`Merge '${sourceBranch}' → '${targetBranch}': ${successCount}/${mergeableCount} repositories succeeded`]
    if (skippedCount > 0) summaryParts.push(`${skippedCount} skipped (no changes)`)
    return {
      success: successCount === mergeableCount,
      summary: summaryParts.join(', '),
      logs,
      perRepo,
    }
  },
}

async function runConflictCheck(
  repos: string[],
  params: Record<string, string | boolean>,
  log: (entry: OperationLogEntry) => void,
  abortSignal: AbortSignal
): Promise<OperationResult> {
  const sourceBranch = sanitizeBranchName(params.sourceBranch as string)
  const targetBranch = sanitizeBranchName(params.targetBranch as string)

  const logs: OperationLogEntry[] = []
  const perRepo: OperationResult['perRepo'] = []
  const conflicted: string[] = []
  const noChanges: string[] = []

  log(makeLogEntry('info', `Phase 1: Conflict check — '${sourceBranch}' → '${targetBranch}'`))
  logs.push(makeLogEntry('info', `Phase 1: Conflict check — '${sourceBranch}' → '${targetBranch}'`))

  for (const repoPath of repos) {
    if (abortSignal.aborted) break

    log(makeLogEntry('info', `Checking for conflicts`, repoPath))
    logs.push(makeLogEntry('info', `Checking for conflicts`, repoPath))

    try {
      validateRepo(repoPath)
      const git = getGit(repoPath)
      await git.fetch(['--all', '--prune'])
      await git.checkout(targetBranch)
      await git.pull('origin', targetBranch)
      await ensureSourceBranch(git, sourceBranch, targetBranch)

      // Test merge
      try {
        await git.merge([sourceBranch, '--no-commit', '--no-ff'])
        // Check if there are conflicts
        const status = await git.status()
        const hasConflicts = status.conflicted.length > 0

        // Always abort the test merge
        await git.merge(['--abort']).catch(() => git.reset(['HEAD']))

        if (hasConflicts) {
          log(makeLogEntry('error', `Conflict detected with ${status.conflicted.length} conflicted file(s)`, repoPath))
          logs.push(makeLogEntry('error', `Conflicts: ${status.conflicted.join(', ')}`, repoPath))
          conflicted.push(repoPath)
          perRepo.push({ repository: repoPath, status: 'failed', detail: `${status.conflicted.length} conflict(s)` })
        } else if (status.staged.length === 0) {
          log(makeLogEntry('info', `No changes — already up to date`, repoPath))
          logs.push(makeLogEntry('info', `No changes — already up to date`, repoPath))
          noChanges.push(repoPath)
          perRepo.push({ repository: repoPath, status: 'skipped', detail: 'No changes' })
        } else {
          log(makeLogEntry('success', `No conflicts`, repoPath))
          logs.push(makeLogEntry('success', `No conflicts`, repoPath))
          perRepo.push({ repository: repoPath, status: 'success' })
        }
      } catch (mergeErr: unknown) {
        // Merge itself errored (may indicate conflicts)
        await git.merge(['--abort']).catch(() => { /* ignore */ })
        const message = mergeErr instanceof Error ? mergeErr.message : String(mergeErr)
        log(makeLogEntry('error', `Merge test failed: ${message}`, repoPath))
        logs.push(makeLogEntry('error', `Merge test failed: ${message}`, repoPath))
        conflicted.push(repoPath)
        perRepo.push({ repository: repoPath, status: 'failed', detail: message })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      log(makeLogEntry('error', `Error: ${message}`, repoPath))
      logs.push(makeLogEntry('error', `Error: ${message}`, repoPath))
      conflicted.push(repoPath)
      perRepo.push({ repository: repoPath, status: 'failed', detail: message })
    }
  }

  if (conflicted.length > 0) {
    return {
      success: false,
      summary: `Conflicts found in ${conflicted.length} repository(ies) — merge halted`,
      logs,
      perRepo,
    }
  }

  const mergeable = repos.length - noChanges.length
  const summaryParts = [`No conflicts in ${mergeable} repository(ies) — safe to merge`]
  if (noChanges.length > 0) summaryParts.push(`${noChanges.length} already up to date`)
  return {
    success: true,
    summary: summaryParts.join(', '),
    logs,
    perRepo,
  }
}

function aborted(logs: OperationLogEntry[]): OperationResult {
  return { success: false, summary: 'Operation was aborted by user', logs, perRepo: [] }
}

async function ensureSourceBranch(git: SimpleGit, sourceBranch: string, targetBranch: string): Promise<void> {
  const localBranches = await git.branchLocal()
  if (localBranches.all.includes(sourceBranch)) {
    await git.checkout(sourceBranch)
    await git.pull('origin', sourceBranch)
  } else {
    await git.checkout(['-b', sourceBranch, '--track', `origin/${sourceBranch}`])
  }
  await git.checkout(targetBranch)
}
