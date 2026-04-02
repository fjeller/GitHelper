// ─── Operation types ───────────────────────────────────────────────────────

export interface OperationParameter {
  id: string
  label: string
  type: 'text' | 'select' | 'boolean'
  defaultValue?: string | boolean
  options?: string[]
  required?: boolean
  placeholder?: string
}

export interface OperationLogEntry {
  timestamp: string   // ISO string (serializable over IPC)
  level: 'info' | 'success' | 'warning' | 'error'
  repository?: string
  message: string
}

export interface OperationResult {
  success: boolean
  summary: string
  logs: OperationLogEntry[]
  perRepo: {
    repository: string
    status: 'success' | 'failed' | 'skipped'
    detail?: string
  }[]
}

export interface Operation {
  id: string
  name: string
  description: string
  icon?: string
  parameters: OperationParameter[]
  repoSelection: 'user' | 'all'
  supportsDryRun: boolean

  dryRun?(
    repos: string[],
    params: Record<string, string | boolean>,
    log: (entry: OperationLogEntry) => void,
    abortSignal: AbortSignal
  ): Promise<OperationResult>

  execute(
    repos: string[],
    params: Record<string, string | boolean>,
    log: (entry: OperationLogEntry) => void,
    abortSignal: AbortSignal
  ): Promise<OperationResult>
}

// Serializable subset of Operation for IPC (no function members)
export interface OperationMeta {
  id: string
  name: string
  description: string
  icon?: string
  parameters: OperationParameter[]
  repoSelection: 'user' | 'all'
  supportsDryRun: boolean
}

// ─── Config types ──────────────────────────────────────────────────────────

export interface Repository {
  path: string
  name: string
}

export interface OperationConfig {
  selectedRepos: string[]
  params: Record<string, string | boolean>
}

export interface AppConfig {
  repositories: Repository[]
  operations: Record<string, OperationConfig>
}

// ─── History types ─────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string
  operationId: string
  operationName: string
  timestamp: string
  success: boolean
  summary: string
  hasFullLog: boolean
  logs?: OperationLogEntry[]   // populated only when fetching a single entry with full log
}
