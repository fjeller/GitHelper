import React, { useState, useEffect, useReducer, useCallback } from 'react'
import type { OperationMeta, AppConfig, OperationLogEntry, OperationResult } from './types/index'
import Sidebar from './components/Sidebar'
import OperationView from './components/OperationView'
import SettingsPage from './components/SettingsPage'
import RunHistory from './components/RunHistory'
import TitleBar from './components/TitleBar'

export type PageId = string  // operation id | 'history' | 'settings'

export interface AppState {
  config: AppConfig
  operations: OperationMeta[]
  activePage: PageId
  isRunning: boolean
  logs: OperationLogEntry[]
  lastResult: OperationResult | null
}

type Action =
  | { type: 'SET_OPERATIONS'; payload: OperationMeta[] }
  | { type: 'SET_CONFIG'; payload: AppConfig }
  | { type: 'NAVIGATE'; payload: PageId }
  | { type: 'RUN_START' }
  | { type: 'RUN_LOG'; payload: OperationLogEntry }
  | { type: 'RUN_COMPLETE'; payload: OperationResult }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_OPERATIONS':
      return { ...state, operations: action.payload }
    case 'SET_CONFIG':
      return { ...state, config: action.payload }
    case 'NAVIGATE':
      return { ...state, activePage: action.payload, logs: [], lastResult: null }
    case 'RUN_START':
      return { ...state, isRunning: true, logs: [], lastResult: null }
    case 'RUN_LOG':
      return { ...state, logs: [...state.logs, action.payload] }
    case 'RUN_COMPLETE':
      return { ...state, isRunning: false, lastResult: action.payload }
    default:
      return state
  }
}

const initialState: AppState = {
  config: { repositories: [], operations: {} },
  operations: [],
  activePage: 'create-branch',
  isRunning: false,
  logs: [],
  lastResult: null,
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    Promise.all([
      window.api.operations.list(),
      window.api.config.get(),
    ]).then(([ops, cfg]) => {
      dispatch({ type: 'SET_OPERATIONS', payload: ops })
      dispatch({ type: 'SET_CONFIG', payload: cfg })
      if (ops.length > 0 && initialState.activePage === 'create-branch') {
        dispatch({ type: 'NAVIGATE', payload: ops[0].id })
      }
    })

    const removeLog = window.api.operations.onLog(entry => {
      dispatch({ type: 'RUN_LOG', payload: entry })
    })
    const removeComplete = window.api.operations.onComplete(result => {
      dispatch({ type: 'RUN_COMPLETE', payload: result })
    })

    return () => {
      removeLog()
      removeComplete()
    }
  }, [])

  const handleConfigChange = useCallback(async (cfg: AppConfig) => {
    await window.api.config.set(cfg)
    dispatch({ type: 'SET_CONFIG', payload: cfg })
  }, [])

  const handleRunStart = useCallback(() => dispatch({ type: 'RUN_START' }), [])

  const activeOperation = state.operations.find(op => op.id === state.activePage)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TitleBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          operations={state.operations}
          activePage={state.activePage}
          onNavigate={page => dispatch({ type: 'NAVIGATE', payload: page })}
        />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {state.activePage === 'settings' && (
            <SettingsPage config={state.config} onConfigChange={handleConfigChange} />
          )}
          {state.activePage === 'history' && (
            <RunHistory />
          )}
          {activeOperation && (
            <OperationView
              operation={activeOperation}
              config={state.config}
              onConfigChange={handleConfigChange}
              isRunning={state.isRunning}
              logs={state.logs}
              lastResult={state.lastResult}
              onRunStart={handleRunStart}
            />
          )}
        </main>
      </div>
    </div>
  )
}
