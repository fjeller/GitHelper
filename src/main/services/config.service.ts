import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { AppConfig } from '../operations/types'
import { sanitizeBranchName } from './git.service'

const DATA_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'GitHelper')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

const DEFAULT_CONFIG: AppConfig = {
  repositories: [],
  operations: {},
  masterBranch: 'main',
}

function normalizeMasterBranch(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_CONFIG.masterBranch

  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_CONFIG.masterBranch

  try {
    return sanitizeBranchName(trimmed)
  } catch {
    return DEFAULT_CONFIG.masterBranch
  }
}

function normalizeConfig(config: unknown): AppConfig {
  if (!config || typeof config !== 'object') {
    return { ...DEFAULT_CONFIG }
  }

  const raw = config as Partial<AppConfig>

  return {
    repositories: Array.isArray(raw.repositories) ? raw.repositories : [...DEFAULT_CONFIG.repositories],
    operations: raw.operations && typeof raw.operations === 'object' ? raw.operations : { ...DEFAULT_CONFIG.operations },
    masterBranch: normalizeMasterBranch(raw.masterBranch),
  }
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
    return normalizeConfig(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function setConfig(config: AppConfig): AppConfig {
  ensureDataDir()
  const normalizedConfig = normalizeConfig(config)
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(normalizedConfig, null, 2), 'utf-8')
  return normalizedConfig
}
