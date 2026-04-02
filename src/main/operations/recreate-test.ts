import type { Operation, OperationLogEntry, OperationResult } from './types'
import { getGit, validateRepo, makeLogEntry } from '../services/git.service'

async function recreateBranch(
  branchName: string,
  baseBranch: string,
  repos: string[],
  log: (entry: OperationLogEntry) => void,
  abortSignal: AbortSignal,
  dryRun: boolean
): Promise<OperationResult> {
  const logs: OperationLogEntry[] = []
  const perRepo: OperationResult['perRepo'] = []
  let successCount = 0

  const prefix = dryRun ? '[Dry Run] ' : ''
  log(makeLogEntry('info', `${prefix}Re-creating branch '${branchName}' from '${baseBranch}' in all repositories`))
  logs.push(makeLogEntry('info', `${prefix}Re-creating '${branchName}' from '${baseBranch}'`))

  for (const repoPath of repos) {
    if (abortSignal.aborted) {
      perRepo.push({ repository: repoPath, status: 'skipped', detail: 'Aborted' })
      continue
    }

    log(makeLogEntry('info', `${prefix}Processing`, repoPath))
    logs.push(makeLogEntry('info', `${prefix}Processing`, repoPath))

    try {
      validateRepo(repoPath)
      const git = getGit(repoPath)
      await git.fetch(['--all', '--prune'])

      const localBranches = await git.branchLocal()
      const remoteSummary = await git.branch(['-r'])
      const existsLocal = localBranches.all.includes(branchName)
      const existsRemote = remoteSummary.all.some(b => b.trim() === `origin/${branchName}`)

      if (dryRun) {
        const parts = []
        if (existsLocal) parts.push('local')
        if (existsRemote) parts.push('remote')
        const detail = parts.length > 0
          ? `Would delete (${parts.join(', ')}) and recreate from '${baseBranch}'`
          : `Would create from '${baseBranch}' (branch does not currently exist)`
        log(makeLogEntry('info', detail, repoPath))
        logs.push(makeLogEntry('info', detail, repoPath))
        perRepo.push({ repository: repoPath, status: 'success', detail })
        successCount++
        continue
      }

      await git.checkout(baseBranch)
      await git.pull('origin', baseBranch)

      if (existsLocal) {
        await git.branch(['-D', branchName])
        log(makeLogEntry('info', `Deleted local '${branchName}'`, repoPath))
        logs.push(makeLogEntry('info', `Deleted local '${branchName}'`, repoPath))
      }

      if (existsRemote) {
        await git.raw(['push', 'origin', '--delete', branchName])
        log(makeLogEntry('info', `Deleted remote '${branchName}'`, repoPath))
        logs.push(makeLogEntry('info', `Deleted remote '${branchName}'`, repoPath))
      }

      await git.checkoutBranch(branchName, baseBranch)
      await git.push('origin', branchName, ['--set-upstream'])

      log(makeLogEntry('success', `'${branchName}' recreated and pushed`, repoPath))
      logs.push(makeLogEntry('success', `'${branchName}' recreated and pushed`, repoPath))
      perRepo.push({ repository: repoPath, status: 'success' })
      successCount++
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      log(makeLogEntry('error', `Failed: ${message}`, repoPath))
      logs.push(makeLogEntry('error', `Failed: ${message}`, repoPath))
      perRepo.push({ repository: repoPath, status: 'failed', detail: message })
    }
  }

  const verb = dryRun ? 'Dry run complete' : `'${branchName}' recreated`
  return {
    success: successCount === repos.length,
    summary: `${verb}: ${successCount}/${repos.length} repositories`,
    logs,
    perRepo,
  }
}

export const recreateTestOperation: Operation = {
  id: 'recreate-test',
  name: 'Re-Create Test',
  description: "Delete and recreate the 'test' branch from 'main' in ALL repositories.",
  parameters: [],
  repoSelection: 'all',
  supportsDryRun: true,

  async dryRun(repos, _params, log, abortSignal) {
    return recreateBranch('test', 'main', repos, log, abortSignal, true)
  },

  async execute(repos, _params, log, abortSignal) {
    return recreateBranch('test', 'main', repos, log, abortSignal, false)
  },
}
