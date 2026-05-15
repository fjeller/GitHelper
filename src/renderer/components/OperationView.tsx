import React, { useState, useEffect, useCallback } from 'react'
import type { OperationMeta, AppConfig, OperationLogEntry, OperationResult } from '../types/index'
import RepoSelector from './RepoSelector'
import LogViewer from './LogViewer'
import AbortButton from './AbortButton'

interface Props {
  operation: OperationMeta
  config: AppConfig
  onConfigChange: (cfg: AppConfig) => void
  isRunning: boolean
  logs: OperationLogEntry[]
  lastResult: OperationResult | null
  onRunStart: () => void
}

export default function OperationView({
  operation,
  config,
  onConfigChange,
  isRunning,
  logs,
  lastResult,
  onRunStart,
}: Props) {
  const opConfig = config.operations[operation.id]

  // Initialize params from persisted config or defaults
  const [params, setParams] = useState<Record<string, string | boolean>>(() => {
    const saved = opConfig?.params ?? {}
    const defaults: Record<string, string | boolean> = {}
    for (const p of operation.parameters) {
      defaults[p.id] = saved[p.id] ?? p.defaultValue ?? (p.type === 'boolean' ? false : '')
    }
    return defaults
  })

  // Re-init when operation changes
  useEffect(() => {
    const saved = config.operations[operation.id]?.params ?? {}
    const defaults: Record<string, string | boolean> = {}
    for (const p of operation.parameters) {
      defaults[p.id] = saved[p.id] ?? p.defaultValue ?? (p.type === 'boolean' ? false : '')
    }
    setParams(defaults)
  }, [operation.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRepos: string[] =
    operation.repoSelection === 'all'
      ? config.repositories.map(r => r.path)
      : opConfig?.selectedRepos ?? config.repositories.map(r => r.path)

  const setSelectedRepos = useCallback(
    (repos: string[]) => {
      const updated: AppConfig = {
        ...config,
        operations: {
          ...config.operations,
          [operation.id]: {
            ...config.operations[operation.id],
            selectedRepos: repos,
            params: config.operations[operation.id]?.params ?? {},
          },
        },
      }
      onConfigChange(updated)
    },
    [config, operation.id, onConfigChange]
  )

  const persistParams = useCallback(
    (updated: Record<string, string | boolean>) => {
      const newConfig: AppConfig = {
        ...config,
        operations: {
          ...config.operations,
          [operation.id]: {
            ...config.operations[operation.id],
            selectedRepos: config.operations[operation.id]?.selectedRepos ?? [],
            params: updated,
          },
        },
      }
      onConfigChange(newConfig)
    },
    [config, operation.id, onConfigChange]
  )

  const handleParamChange = (id: string, value: string | boolean) => {
    const updated = { ...params, [id]: value }
    setParams(updated)
    persistParams(updated)
  }

  const canRun = !isRunning && (config.repositories.length > 0)

  const handleRun = async () => {
    if (!canRun) return
    onRunStart()
    await window.api.operations.run(operation.id, selectedRepos, params)
  }

  const handleDryRun = async () => {
    if (!canRun || !operation.supportsDryRun) return
    onRunStart()
    await window.api.operations.dryRun(operation.id, selectedRepos, params)
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: 24,
        gap: 16,
      }}
    >
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          {operation.name}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{operation.description}</p>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 16, overflow: 'hidden', minHeight: 0 }}>
        {/* Left column: params + repos + buttons */}
        <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
          {/* Parameters */}
          {operation.parameters.length > 0 && (
            <Section title="Parameters">
              {operation.parameters.map(param => (
                <div key={param.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {param.label}{param.required && ' *'}
                  </label>
                  {param.type === 'text' && (
                    <input
                      type="text"
                      value={params[param.id] as string}
                      placeholder={param.placeholder ?? ''}
                      onChange={e => handleParamChange(param.id, e.target.value)}
                      disabled={isRunning}
                    />
                  )}
                  {param.type === 'boolean' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={params[param.id] as boolean}
                        onChange={e => handleParamChange(param.id, e.target.checked)}
                        disabled={isRunning}
                      />
                      <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{param.label}</span>
                    </label>
                  )}
                  {param.type === 'select' && (
                    <select
                      value={params[param.id] as string}
                      onChange={e => handleParamChange(param.id, e.target.value)}
                      disabled={isRunning}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        color: 'var(--text-primary)',
                        padding: '6px 10px',
                        fontSize: 13,
                        width: '100%',
                        outline: 'none',
                      }}
                    >
                      {param.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* Repositories */}
          <Section
            title={
              operation.repoSelection === 'all'
                ? 'Repositories (all)'
                : 'Repositories'
            }
            flex
          >
            {config.repositories.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                No repositories configured. Go to Settings to add some.
              </p>
            ) : (
              <RepoSelector
                repositories={config.repositories}
                selected={selectedRepos}
                onChange={setSelectedRepos}
                disabled={operation.repoSelection === 'all' || isRunning}
              />
            )}
          </Section>

          {/* Run buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-primary"
              onClick={handleRun}
              disabled={!canRun || selectedRepos.length === 0}
              style={{ flex: 1 }}
            >
              ▶ Run
            </button>
            {operation.supportsDryRun && (
              <button
                className="btn-secondary"
                onClick={handleDryRun}
                disabled={!canRun || selectedRepos.length === 0}
                style={{ flex: 1 }}
              >
                🔍 Dry Run
              </button>
            )}
          </div>
        </div>

        {/* Right column: log viewer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Output
            </span>
            {isRunning && <AbortButton />}
          </div>

          {lastResult && !isRunning && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius)',
                background: lastResult.success ? 'rgba(76,175,119,0.12)' : 'rgba(224,85,85,0.12)',
                border: `1px solid ${lastResult.success ? 'var(--success)' : 'var(--error)'}`,
                fontSize: 13,
                color: lastResult.success ? 'var(--success)' : 'var(--error)',
                fontWeight: 500,
              }}
            >
              {lastResult.success ? '✓' : '✗'} {lastResult.summary}
            </div>
          )}

          <LogViewer logs={logs} isRunning={isRunning} />
        </div>
      </div>
    </div>
  )
}

function Section({ title, children, flex }: { title: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...(flex ? { flex: 1, minHeight: 0 } : {}),
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          flexShrink: 0,
        }}
      >
        {title}
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, ...(flex ? { flex: 1, minHeight: 0, overflowY: 'auto' } : {}) }}>
        {children}
      </div>
    </div>
  )
}
