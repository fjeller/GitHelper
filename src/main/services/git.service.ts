import simpleGit, { SimpleGit } from 'simple-git'
import * as fs from 'fs'

export function getGit(repoPath: string): SimpleGit {
  return simpleGit(repoPath, { binary: 'git' })
}

export function validateRepo(repoPath: string): void {
  if (!fs.existsSync(repoPath)) {
    throw new Error(`Repository path does not exist: ${repoPath}`)
  }
  const gitDir = `${repoPath}/.git`
  if (!fs.existsSync(gitDir)) {
    throw new Error(`Not a git repository: ${repoPath}`)
  }
}

export function sanitizeBranchName(name: string): string {
  // Allow alphanumeric, hyphens, underscores, dots, forward slashes
  // Reject anything else to prevent shell injection
  if (!/^[a-zA-Z0-9._/\-]+$/.test(name)) {
    throw new Error(`Invalid branch/tag name: "${name}". Only alphanumeric characters, hyphens, underscores, dots, and slashes are allowed.`)
  }
  return name
}

export function makeLogEntry(
  level: 'info' | 'success' | 'warning' | 'error',
  message: string,
  repository?: string
) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    repository,
  }
}
