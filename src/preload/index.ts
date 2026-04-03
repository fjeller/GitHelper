import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppConfig,
  OperationLogEntry,
  OperationResult,
  OperationMeta,
  HistoryEntry,
} from '../main/operations/types'

const api = {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    toggleDevTools: () => ipcRenderer.send('window:toggle-devtools'),
  },

  dev: {
    isDev: process.env.NODE_ENV === 'development',
  },

  // Operations
  operations: {
    list: (): Promise<OperationMeta[]> =>
      ipcRenderer.invoke('operations:list'),
    run: (operationId: string, repos: string[], params: Record<string, string | boolean>): Promise<void> =>
      ipcRenderer.invoke('operations:run', operationId, repos, params),
    dryRun: (operationId: string, repos: string[], params: Record<string, string | boolean>): Promise<void> =>
      ipcRenderer.invoke('operations:dry-run', operationId, repos, params),
    abort: () => ipcRenderer.send('operations:abort'),
    onLog: (callback: (entry: OperationLogEntry) => void) => {
      const listener = (_: Electron.IpcRendererEvent, entry: OperationLogEntry) => callback(entry)
      ipcRenderer.on('operations:log', listener)
      return () => ipcRenderer.removeListener('operations:log', listener)
    },
    onComplete: (callback: (result: OperationResult) => void) => {
      const listener = (_: Electron.IpcRendererEvent, result: OperationResult) => callback(result)
      ipcRenderer.on('operations:complete', listener)
      return () => ipcRenderer.removeListener('operations:complete', listener)
    },
  },

  // Config
  config: {
    get: (): Promise<AppConfig> => ipcRenderer.invoke('config:get'),
    set: (config: AppConfig): Promise<AppConfig> => ipcRenderer.invoke('config:set', config),
  },

  // History
  history: {
    list: (): Promise<HistoryEntry[]> => ipcRenderer.invoke('history:list'),
    get: (id: string): Promise<HistoryEntry | null> => ipcRenderer.invoke('history:get', id),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
