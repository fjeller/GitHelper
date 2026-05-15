import { ipcMain } from 'electron'
import * as fs from 'fs'
import { getConfig, setConfig } from '../services/config.service'

export function registerConfigHandlers(): void {
  ipcMain.handle('config:get', () => getConfig())
  ipcMain.handle('config:set', (_event, config) => setConfig(config))
  ipcMain.handle('config:parse-repo-file', (_event, filePath: string): string[] => {
    const text = fs.readFileSync(filePath, 'utf-8')
    return text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => {
        try { return fs.statSync(line).isDirectory() } catch { return false }
      })
  })
}
