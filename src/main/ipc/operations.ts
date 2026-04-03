import { ipcMain, BrowserWindow } from 'electron'
import { getOperation, getOperationMetas } from '../operations/registry'
import { addHistoryEntry } from '../services/history.service'
import type { OperationLogEntry } from '../operations/types'
import { getConfig } from '../services/config.service'

let currentAbortController: AbortController | null = null

export function registerOperationHandlers(win: BrowserWindow): void {
  ipcMain.handle('operations:list', () => getOperationMetas())

  ipcMain.handle(
    'operations:run',
    async (_event, operationId: string, repos: string[], params: Record<string, string | boolean>) => {
      const operation = getOperation(operationId)
      if (!operation) throw new Error(`Unknown operation: ${operationId}`)

      currentAbortController = new AbortController()
      const { signal } = currentAbortController
      const context = { config: getConfig() }

      const logFn = (entry: OperationLogEntry) => {
        win.webContents.send('operations:log', entry)
      }

      try {
        const result = await operation.execute(repos, params, logFn, signal, context)
        addHistoryEntry(operationId, operation.name, result)
        win.webContents.send('operations:complete', result)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        const failResult = {
          success: false,
          summary: `Operation failed: ${message}`,
          logs: [{ timestamp: new Date().toISOString(), level: 'error' as const, message }],
          perRepo: [],
        }
        addHistoryEntry(operationId, operation.name, failResult)
        win.webContents.send('operations:complete', failResult)
      } finally {
        currentAbortController = null
      }
    }
  )

  ipcMain.handle(
    'operations:dry-run',
    async (_event, operationId: string, repos: string[], params: Record<string, string | boolean>) => {
      const operation = getOperation(operationId)
      if (!operation) throw new Error(`Unknown operation: ${operationId}`)
      if (!operation.dryRun) throw new Error(`Operation does not support dry run: ${operationId}`)

      currentAbortController = new AbortController()
      const { signal } = currentAbortController
      const context = { config: getConfig() }

      const logFn = (entry: OperationLogEntry) => {
        win.webContents.send('operations:log', entry)
      }

      try {
        const result = await operation.dryRun(repos, params, logFn, signal, context)
        win.webContents.send('operations:complete', result)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        const failResult = {
          success: false,
          summary: `Dry run failed: ${message}`,
          logs: [{ timestamp: new Date().toISOString(), level: 'error' as const, message }],
          perRepo: [],
        }
        win.webContents.send('operations:complete', failResult)
      } finally {
        currentAbortController = null
      }
    }
  )

  ipcMain.on('operations:abort', () => {
    currentAbortController?.abort()
  })
}
