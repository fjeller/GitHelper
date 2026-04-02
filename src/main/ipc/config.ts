import { ipcMain } from 'electron'
import { getConfig, setConfig } from '../services/config.service'

export function registerConfigHandlers(): void {
  ipcMain.handle('config:get', () => getConfig())
  ipcMain.handle('config:set', (_event, config) => setConfig(config))
}
