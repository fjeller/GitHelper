import type { Operation, OperationContext, OperationLogEntry, OperationResult } from './types'
import { getGit, validateRepo, sanitizeBranchName, makeLogEntry } from '../services/git.service'

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
  log(makeLogEntry('info', `${prefix}Re-creating branch '${branchName}' from '${baseBranch}'`))
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
      const existsAnywhere = existsLocal || existsRemote

      if (dryRun) {
        let detail: string
        if (existsAnywhere) {
          const parts: string[] = []
          if (existsLocal) parts.push('local')
          if (existsRemote) parts.push('remote')
          detail = `Would delete (${parts.join(', ')}) and recreate from '${baseBranch}'`
        } else {
          detail = `Branch does not exist — would create from '${baseBranch}'`
        }
        log(makeLogEntry('info', detail, repoPath))
        logs.push(makeLogEntry('info', detail, repoPath))
        perRepo.push({ repository: repoPath, status: 'success', detail })
        successCount++
        continue
      }

      // Checkout base branch and pull
      await git.checkout(baseBranch)
      await git.pull('origin', baseBranch)

      // Delete local if exists
      if (existsLocal) {
        await git.branch(['-D', branchName])
        log(makeLogEntry('info', `Deleted local '${branchName}'`, repoPath))
        logs.push(makeLogEntry('info', `Deleted local '${branchName}'`, repoPath))
      }

      // Delete remote if exists
      if (existsRemote) {
        await git.raw(['push', 'origin', '--delete', branchName])
        log(makeLogEntry('info', `Deleted remote '${branchName}'`, repoPath))
        logs.push(makeLogEntry('info', `Deleted remote '${branchName}'`, repoPath))
      }

      // Create and push
      await git.checkoutBranch(branchName, baseBranch)
      await git.push('origin', branchName, ['--set-upstream'])

      const verb = existsAnywhere ? 'recreated' : 'created'
      log(makeLogEntry('success', `'${branchName}' ${verb} and pushed`, repoPath))
      logs.push(makeLogEntry('success', `'${branchName}' ${verb} and pushed`, repoPath))
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

export const recreateBranchOperation: Operation = {
  id: 'recreate-branch',
  name: 'Re-Create Branch',
  description: 'Delete and recreate a branch from the configured master branch across selected repositories. Creates the branch if it does not yet exist.',
  parameters: [
    {
      id: 'branchName',
      label: 'Target Branch',
      type: 'text',
      required: true,
      placeholder: 'development',
    },
  ],
  repoSelection: 'user',
  supportsDryRun: true,

  async dryRun(repos, params, log, abortSignal, context: OperationContext) {
    const branchName = sanitizeBranchName(params.branchName as string)
    const baseBranch = sanitizeBranchName(context.config.masterBranch || 'main')
    return recreateBranch(branchName, baseBranch, repos, log, abortSignal, true)
  },

  async execute(repos, params, log, abortSignal, context: OperationContext) {
    const branchName = sanitizeBranchName(params.branchName as string)
    const baseBranch = sanitizeBranchName(context.config.masterBranch || 'main')
    return recreateBranch(branchName, baseBranch, repos, log, abortSignal, false)
  },
}
