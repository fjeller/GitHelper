import type { Operation, OperationContext, OperationLogEntry, OperationResult } from './types'
import { getGit, validateRepo, sanitizeBranchName, makeLogEntry } from '../services/git.service'

function getProtectedBranchName(context: OperationContext): string {
  return sanitizeBranchName(context.config.masterBranch || 'main')
}

function cannotDeleteProtectedBranch(
  branchName: string,
  protectedBranchName: string,
  repos: string[]
): OperationResult {
  return {
    success: false,
    summary: `Branch '${branchName}' is configured as the master branch and cannot be deleted`,
    logs: [makeLogEntry('error', `Branch '${branchName}' is configured as the master branch and cannot be deleted`)],
    perRepo: repos.map(repository => ({
      repository,
      status: 'failed',
      detail: `Protected branch '${protectedBranchName}' cannot be deleted`,
    })),
  }
}

export const deleteBranchOperation: Operation = {
  id: 'delete-branch',
  name: 'Delete Branch',
  description: 'Delete a branch locally and remotely across selected repositories.',
  parameters: [
    {
      id: 'branchName',
      label: 'Branch Name',
      type: 'text',
      required: true,
      placeholder: 'feature/my-feature',
    },
  ],
  repoSelection: 'user',
  supportsDryRun: true,

  async dryRun(repos, params, log, abortSignal, context) {
    const branchName = sanitizeBranchName(params.branchName as string)
    const protectedBranchName = getProtectedBranchName(context)
    const logs: OperationLogEntry[] = []
    const perRepo: OperationResult['perRepo'] = []

    if (branchName === protectedBranchName) {
      const result = cannotDeleteProtectedBranch(branchName, protectedBranchName, repos)
      result.logs.forEach(log)
      return result
    }

    log(makeLogEntry('info', `Dry run: checking which repos have branch '${branchName}'`))
    logs.push(makeLogEntry('info', `Dry run: checking branch '${branchName}'`))

    for (const repoPath of repos) {
      if (abortSignal.aborted) break
      try {
        validateRepo(repoPath)
        const git = getGit(repoPath)
        await git.fetch(['--all', '--prune'])

        const localBranches = await git.branchLocal()
        const remoteSummary = await git.branch(['-r'])
        const existsLocal = localBranches.all.includes(branchName)
        const existsRemote = remoteSummary.all.some(b => b.trim() === `origin/${branchName}`)

        const detail = [existsLocal && 'local', existsRemote && 'remote'].filter(Boolean).join(', ')
        if (existsLocal || existsRemote) {
          log(makeLogEntry('info', `Would delete: ${detail}`, repoPath))
          logs.push(makeLogEntry('info', `Would delete: ${detail}`, repoPath))
          perRepo.push({ repository: repoPath, status: 'success', detail: `Would delete (${detail})` })
        } else {
          log(makeLogEntry('info', `Branch does not exist — nothing to delete`, repoPath))
          logs.push(makeLogEntry('info', `Branch does not exist`, repoPath))
          perRepo.push({ repository: repoPath, status: 'skipped', detail: 'Branch does not exist' })
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        log(makeLogEntry('error', message, repoPath))
        logs.push(makeLogEntry('error', message, repoPath))
        perRepo.push({ repository: repoPath, status: 'failed', detail: message })
      }
    }

    return {
      success: true,
      summary: `Dry run complete for branch '${branchName}'`,
      logs,
      perRepo,
    }
  },

  async execute(repos, params, log, abortSignal, context) {
    const branchName = sanitizeBranchName(params.branchName as string)
    const protectedBranchName = getProtectedBranchName(context)
    const logs: OperationLogEntry[] = []
    const perRepo: OperationResult['perRepo'] = []
    let successCount = 0

    if (branchName === protectedBranchName) {
      const result = cannotDeleteProtectedBranch(branchName, protectedBranchName, repos)
      result.logs.forEach(log)
      return result
    }

    for (const repoPath of repos) {
      if (abortSignal.aborted) {
        perRepo.push({ repository: repoPath, status: 'skipped', detail: 'Aborted' })
        continue
      }

      log(makeLogEntry('info', `Processing ${repoPath}`, repoPath))
      logs.push(makeLogEntry('info', `Processing`, repoPath))

      try {
        validateRepo(repoPath)
        const git = getGit(repoPath)
        await git.fetch(['--all', '--prune'])

        // Switch away from target branch if currently on it
        const status = await git.status()
        if (status.current === branchName) {
          await git.checkout(protectedBranchName)
          log(makeLogEntry('info', `Switched from '${branchName}' to '${protectedBranchName}'`, repoPath))
          logs.push(makeLogEntry('info', `Switched from '${branchName}' to '${protectedBranchName}'`, repoPath))
        }

        // Delete local branch if exists
        const localBranches = await git.branchLocal()
        if (localBranches.all.includes(branchName)) {
          await git.branch(['-D', branchName])
          log(makeLogEntry('success', `Deleted local branch '${branchName}'`, repoPath))
          logs.push(makeLogEntry('success', `Deleted local branch`, repoPath))
        } else {
          log(makeLogEntry('info', `No local branch '${branchName}'`, repoPath))
          logs.push(makeLogEntry('info', `No local branch`, repoPath))
        }

        // Delete remote branch if exists
        const remoteSummary = await git.branch(['-r'])
        if (remoteSummary.all.some(b => b.trim() === `origin/${branchName}`)) {
          await git.raw(['push', 'origin', '--delete', branchName])
          log(makeLogEntry('success', `Deleted remote branch '${branchName}'`, repoPath))
          logs.push(makeLogEntry('success', `Deleted remote branch`, repoPath))
        } else {
          log(makeLogEntry('info', `No remote branch '${branchName}'`, repoPath))
          logs.push(makeLogEntry('info', `No remote branch`, repoPath))
        }

        perRepo.push({ repository: repoPath, status: 'success' })
        successCount++
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        log(makeLogEntry('error', `Failed: ${message}`, repoPath))
        logs.push(makeLogEntry('error', `Failed: ${message}`, repoPath))
        perRepo.push({ repository: repoPath, status: 'failed', detail: message })
      }
    }

    return {
      success: successCount === repos.length,
      summary: `Branch '${branchName}' deleted in ${successCount}/${repos.length} repositories`,
      logs,
      perRepo,
    }
  },
}
