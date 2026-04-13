// Renderer-side API type (mirrors preload/index.ts)
import type {
  AppConfig,
  OperationLogEntry,
  OperationResult,
  OperationMeta,
  HistoryEntry,
  Repository,
} from '../../main/operations/types'

export type { AppConfig, OperationLogEntry, OperationResult, OperationMeta, HistoryEntry, Repository }

declare global {
  interface Window {
    api: {
      window: {
        minimize: () => void
        maximize: () => void
        close: () => void
        toggleDevTools: () => void
      }
      dev: {
        isDev: boolean
      }
      operations: {
        list: () => Promise<OperationMeta[]>
        run: (operationId: string, repos: string[], params: Record<string, string | boolean>) => Promise<void>
        dryRun: (operationId: string, repos: string[], params: Record<string, string | boolean>) => Promise<void>
        abort: () => void
        onLog: (callback: (entry: OperationLogEntry) => void) => () => void
        onComplete: (callback: (result: OperationResult) => void) => () => void
      }
      config: {
        get: () => Promise<AppConfig>
        set: (config: AppConfig) => Promise<AppConfig>
        parseRepoFile: (filePath: string) => Promise<string[]>
      }
      history: {
        list: () => Promise<HistoryEntry[]>
        get: (id: string) => Promise<HistoryEntry | null>
      }
    }
  }
}
