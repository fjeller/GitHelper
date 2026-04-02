import type { Operation, OperationLogEntry, OperationResult } from './types'
import { getGit, validateRepo, sanitizeBranchName, makeLogEntry } from '../services/git.service'

export const tagAllOperation: Operation = {
  id: 'tag-all',
  name: 'Tag All',
  description: 'Create an annotated tag from a remote branch across selected repositories.',
  parameters: [
    {
      id: 'tagName',
      label: 'Tag Name',
      type: 'text',
      required: true,
      placeholder: '1.8.5',
    },
    {
      id: 'baseBranch',
      label: 'Base Branch',
      type: 'text',
      required: true,
      placeholder: 'Releases/v1.8',
    },
    {
      id: 'tagMessage',
      label: 'Tag Message (optional)',
      type: 'text',
      required: false,
      placeholder: 'Release 1.8.5',
    },
  ],
  repoSelection: 'user',
  supportsDryRun: true,

  async dryRun(repos, params, log, abortSignal) {
    return checkTagAvailability(repos, params, log, abortSignal)
  },

  async execute(repos, params, log, abortSignal) {
    // Pre-flight
    const checkResult = await checkTagAvailability(repos, params, log, abortSignal)
    if (!checkResult.success) return checkResult
    if (abortSignal.aborted) return { success: false, summary: 'Aborted', logs: checkResult.logs, perRepo: [] }

    const tagName = sanitizeBranchName(params.tagName as string)
    const baseBranch = sanitizeBranchName(params.baseBranch as string)
    const rawMessage = (params.tagMessage as string | undefined) ?? ''
    const tagMessage = rawMessage.trim() !== '' ? rawMessage.trim() : `Release ${tagName}`

    const logs: OperationLogEntry[] = [...checkResult.logs]
    const perRepo: OperationResult['perRepo'] = []
    let successCount = 0

    log(makeLogEntry('info', `Creating tag '${tagName}' from 'origin/${baseBranch}'`))
    logs.push(makeLogEntry('info', `Creating tag '${tagName}' from 'origin/${baseBranch}'`))

    for (const repoPath of repos) {
      if (abortSignal.aborted) {
        perRepo.push({ repository: repoPath, status: 'skipped', detail: 'Aborted' })
        continue
      }

      log(makeLogEntry('info', `Tagging`, repoPath))
      logs.push(makeLogEntry('info', `Tagging`, repoPath))

      try {
        const git = getGit(repoPath)
        // Create annotated tag from remote ref
        await git.tag(['-a', tagName, `origin/${baseBranch}`, '-m', tagMessage])
        await git.push('origin', tagName)

        log(makeLogEntry('success', `Tag '${tagName}' created and pushed`, repoPath))
        logs.push(makeLogEntry('success', `Tag '${tagName}' created and pushed`, repoPath))
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
      summary: `Tag '${tagName}': created in ${successCount}/${repos.length} repositories`,
      logs,
      perRepo,
    }
  },
}

async function checkTagAvailability(
  repos: string[],
  params: Record<string, string | boolean>,
  log: (entry: OperationLogEntry) => void,
  abortSignal: AbortSignal
): Promise<OperationResult> {
  const tagName = sanitizeBranchName(params.tagName as string)
  const baseBranch = sanitizeBranchName(params.baseBranch as string)

  const logs: OperationLogEntry[] = []
  const perRepo: OperationResult['perRepo'] = []
  const issues: string[] = []

  log(makeLogEntry('info', `Checking tag '${tagName}' and branch 'origin/${baseBranch}'`))
  logs.push(makeLogEntry('info', `Checking tag '${tagName}' and branch '${baseBranch}'`))

  for (const repoPath of repos) {
    if (abortSignal.aborted) break

    try {
      validateRepo(repoPath)
      const git = getGit(repoPath)
      await git.fetch(['--all', '--prune', '--tags'])

      // Check base branch exists on remote
      const remoteSummary = await git.branch(['-r'])
      const branchExists = remoteSummary.all.some(b => b.trim() === `origin/${baseBranch}`)
      if (!branchExists) {
        log(makeLogEntry('error', `Remote branch 'origin/${baseBranch}' not found`, repoPath))
        logs.push(makeLogEntry('error', `Remote branch 'origin/${baseBranch}' not found`, repoPath))
        issues.push(repoPath)
        perRepo.push({ repository: repoPath, status: 'failed', detail: `Branch 'origin/${baseBranch}' not found` })
        continue
      }

      // Check tag doesn't already exist
      const tags = await git.tags()
      if (tags.all.includes(tagName)) {
        log(makeLogEntry('error', `Tag '${tagName}' already exists`, repoPath))
        logs.push(makeLogEntry('error', `Tag '${tagName}' already exists`, repoPath))
        issues.push(repoPath)
        perRepo.push({ repository: repoPath, status: 'failed', detail: `Tag '${tagName}' already exists` })
        continue
      }

      log(makeLogEntry('success', `OK — branch exists, tag is available`, repoPath))
      logs.push(makeLogEntry('success', `OK`, repoPath))
      perRepo.push({ repository: repoPath, status: 'success' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      log(makeLogEntry('error', `Error: ${message}`, repoPath))
      logs.push(makeLogEntry('error', `Error: ${message}`, repoPath))
      issues.push(repoPath)
      perRepo.push({ repository: repoPath, status: 'failed', detail: message })
    }
  }

  if (issues.length > 0) {
    return {
      success: false,
      summary: `Pre-flight failed in ${issues.length} repository(ies)`,
      logs,
      perRepo,
    }
  }

  return {
    success: true,
    summary: `All checks passed — tag '${tagName}' can be created in ${repos.length} repositories`,
    logs,
    perRepo,
  }
}
