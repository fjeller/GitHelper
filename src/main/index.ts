import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import { registerConfigHandlers } from './ipc/config'
import { registerHistoryHandlers } from './ipc/history'
import { registerOperationHandlers } from './ipc/operations'

const isDev = process.env.NODE_ENV === 'development'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#1a1d23',
    icon: path.join(__dirname, '../../../build/githelper.ico'), 
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  // Window control IPC
  ipcMain.on('window:minimize', () => win.minimize())
  ipcMain.on('window:maximize', () => {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.on('window:close', () => win.close())
  ipcMain.on('window:toggle-devtools', () => {
    if (!isDev) return

    if (win.webContents.isDevToolsOpened()) {
      win.webContents.closeDevTools()
    } else {
      win.webContents.openDevTools()
    }
  })

  // Register all IPC handlers
  registerConfigHandlers()
  registerHistoryHandlers()
  registerOperationHandlers(win)
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
