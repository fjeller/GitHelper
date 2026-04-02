import { ipcMain } from 'electron'
import { listHistory, getHistoryEntry } from '../services/history.service'

export function registerHistoryHandlers(): void {
  ipcMain.handle('history:list', () => listHistory())
  ipcMain.handle('history:get', (_event, id: string) => getHistoryEntry(id))
}
