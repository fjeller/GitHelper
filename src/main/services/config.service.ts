import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { AppConfig } from '../operations/types'

const DATA_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'GitHelper')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

const DEFAULT_CONFIG: AppConfig = {
  repositories: [],
  operations: {},
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function getConfig(): AppConfig {
  ensureDataDir()
  if (!fs.existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG }
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8')
    return JSON.parse(raw) as AppConfig
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function setConfig(config: AppConfig): void {
  ensureDataDir()
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}
