import type { Operation, OperationLogEntry, OperationResult } from './types'
import { getGit, validateRepo, sanitizeBranchName, makeLogEntry } from '../services/git.service'

export const createBranchOperation: Operation = {
  id: 'create-branch',
  name: 'Create New Branch',
  description: 'Create a new branch from a base branch across selected repositories.',
  parameters: [
    {
      id: 'branchName',
      label: 'Branch Name',
      type: 'text',
      required: true,
      placeholder: 'feature/my-feature',
    },
    {
      id: 'baseBranch',
      label: 'Base Branch',
      type: 'text',
      defaultValue: 'main',
      required: true,
      placeholder: 'main',
    },
  ],
  repoSelection: 'user',
  supportsDryRun: true,

  async dryRun(repos, params, log, abortSignal) {
    return runPreFlight(repos, params, log, abortSignal)
  },

  async execute(repos, params, log, abortSignal) {
    const preFlightResult = await runPreFlight(repos, params, log, abortSignal)
    if (!preFlightResult.success) return preFlightResult
    if (abortSignal.aborted) return aborted(preFlightResult.logs)

    const branchName = sanitizeBranchName(params.branchName as string)
    const baseBranch = sanitizeBranchName(params.baseBranch as string)

    const perRepo: OperationResult['perRepo'] = []
    const logs: OperationLogEntry[] = [...preFlightResult.logs]
    let successCount = 0

    for (const repoPath of repos) {
      if (abortSignal.aborted) {
        perRepo.push({ repository: repoPath, status: 'skipped', detail: 'Aborted' })
        continue
      }

      log(makeLogEntry('info', `Creating branch '${branchName}' in ${repoPath}`, repoPath))
      logs.push(makeLogEntry('info', `Creating branch '${branchName}'`, repoPath))

      try {
        const git = getGit(repoPath)
        await git.checkout(baseBranch)
        await git.pull('origin', baseBranch)
        await git.checkoutBranch(branchName, baseBranch)
        await git.push('origin', branchName, ['--set-upstream'])

        log(makeLogEntry('success', `Branch '${branchName}' created and pushed`, repoPath))
        logs.push(makeLogEntry('success', `Branch '${branchName}' created and pushed`, repoPath))
        perRepo.push({ repository: repoPath, status: 'success' })
        successCount++
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        log(makeLogEntry('error', `Failed: ${message}`, repoPath))
        logs.push(makeLogEntry('error', `Failed: ${message}`, repoPath))
        perRepo.push({ repository: repoPath, status: 'failed', detail: message })
      }
    }

    const success = successCount === repos.length
    return {
      success,
      summary: `Branch '${branchName}' created in ${successCount}/${repos.length} repositories`,
      logs,
      perRepo,
    }
  },
}

async function runPreFlight(
  repos: string[],
  params: Record<string, string | boolean>,
  log: (entry: OperationLogEntry) => void,
  abortSignal: AbortSignal
): Promise<OperationResult> {
  const branchName = sanitizeBranchName(params.branchName as string)
  const logs: OperationLogEntry[] = []
  const perRepo: OperationResult['perRepo'] = []
  const conflicts: string[] = []

  log(makeLogEntry('info', `Pre-flight check: verifying branch '${branchName}' does not exist...`))
  logs.push(makeLogEntry('info', `Pre-flight check for branch '${branchName}'`))

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

      if (existsLocal || existsRemote) {
        const where = [existsLocal && 'local', existsRemote && 'remote'].filter(Boolean).join(' and ')
        log(makeLogEntry('error', `Branch '${branchName}' already exists (${where})`, repoPath))
        logs.push(makeLogEntry('error', `Branch '${branchName}' already exists (${where})`, repoPath))
        conflicts.push(repoPath)
        perRepo.push({ repository: repoPath, status: 'failed', detail: `Already exists (${where})` })
      } else {
        log(makeLogEntry('success', `Branch '${branchName}' does not exist — OK`, repoPath))
        logs.push(makeLogEntry('success', `OK — branch does not exist`, repoPath))
        perRepo.push({ repository: repoPath, status: 'success' })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      log(makeLogEntry('error', `Error checking repo: ${message}`, repoPath))
      logs.push(makeLogEntry('error', `Error: ${message}`, repoPath))
      conflicts.push(repoPath)
      perRepo.push({ repository: repoPath, status: 'failed', detail: message })
    }
  }

  if (conflicts.length > 0) {
    return {
      success: false,
      summary: `Pre-flight failed: branch '${branchName}' already exists in ${conflicts.length} repository(ies)`,
      logs,
      perRepo,
    }
  }

  return {
    success: true,
    summary: `Pre-flight passed: branch '${branchName}' is available in all ${repos.length} repositories`,
    logs,
    perRepo,
  }
}

function aborted(logs: OperationLogEntry[]): OperationResult {
  return {
    success: false,
    summary: 'Operation was aborted by user',
    logs,
    perRepo: [],
  }
}
