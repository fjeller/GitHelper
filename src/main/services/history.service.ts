import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { HistoryEntry, OperationLogEntry, OperationResult } from '../operations/types'

const DATA_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'GitHelper')
const HISTORY_DIR = path.join(DATA_DIR, 'history')
const LOGS_DIR = path.join(HISTORY_DIR, 'logs')
const INDEX_FILE = path.join(HISTORY_DIR, 'index.json')

function ensureDirs(): void {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true })
  }
}

function readIndex(): HistoryEntry[] {
  ensureDirs()
  if (!fs.existsSync(INDEX_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8')) as HistoryEntry[]
  } catch {
    return []
  }
}

function writeIndex(entries: HistoryEntry[]): void {
  ensureDirs()
  fs.writeFileSync(INDEX_FILE, JSON.stringify(entries, null, 2), 'utf-8')
}

export function addHistoryEntry(
  operationId: string,
  operationName: string,
  result: OperationResult
): void {
  ensureDirs()

  const now = new Date()
  const timestamp = now.toISOString()
  const dateStr = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
  const id = `run-${dateStr}-${operationId}`

  const entry: HistoryEntry = {
    id,
    operationId,
    operationName,
    timestamp,
    success: result.success,
    summary: result.summary,
    hasFullLog: !result.success,
  }

  // Save full logs only on failure
  if (!result.success && result.logs.length > 0) {
    const logFile = path.join(LOGS_DIR, `${id}.json`)
    fs.writeFileSync(logFile, JSON.stringify(result.logs, null, 2), 'utf-8')
  }

  const index = readIndex()
  index.unshift(entry)  // newest first
  // Keep at most 500 entries
  if (index.length > 500) index.splice(500)
  writeIndex(index)
}

export function listHistory(): HistoryEntry[] {
  return readIndex()
}

export function getHistoryEntry(id: string): HistoryEntry | null {
  const index = readIndex()
  const entry = index.find(e => e.id === id)
  if (!entry) return null

  if (entry.hasFullLog) {
    const logFile = path.join(LOGS_DIR, `${id}.json`)
    if (fs.existsSync(logFile)) {
      try {
        const logs = JSON.parse(fs.readFileSync(logFile, 'utf-8')) as OperationLogEntry[]
        return { ...entry, logs }
      } catch {
        // fall through
      }
    }
  }

  return entry
}
