import React from 'react'

export default function AbortButton() {
  return (
    <button
      className="btn-danger"
      onClick={() => window.api.operations.abort()}
      style={{ fontWeight: 600, padding: '5px 14px', fontSize: 12 }}
    >
      🔴 Abort
    </button>
  )
}
