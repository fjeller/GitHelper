import React from 'react'

export default function TitleBar() {
  const isDev = window.api.dev.isDev

  return (
    <div
      style={{
        height: 36,
        background: '#151820',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        WebkitAppRegion: 'drag',
        borderBottom: '1px solid #2d3344',
        paddingLeft: 14,
      } as React.CSSProperties}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf0', letterSpacing: 0.5 }}>
        GitHelper
      </span>
      <div style={{ display: 'flex', alignItems: 'center', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {isDev && (
          <button
            onClick={() => window.api.window.toggleDevTools()}
            title="Toggle DevTools"
            style={{
              height: 24,
              marginRight: 8,
              padding: '0 10px',
              borderRadius: 4,
              border: '1px solid #3a3f52',
              background: '#1d2230',
              color: '#c7cde0',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            DevTools
          </button>
        )}
        <WinBtn
          onClick={() => window.api.window.minimize()}
          title="Minimize"
          hoverBg="#3a3f52"
        >
          &#x2013;
        </WinBtn>
        <WinBtn
          onClick={() => window.api.window.maximize()}
          title="Maximize"
          hoverBg="#3a3f52"
        >
          &#x25a1;
        </WinBtn>
        <WinBtn
          onClick={() => window.api.window.close()}
          title="Close"
          hoverBg="#c0392b"
          danger
        >
          &#x2715;
        </WinBtn>
      </div>
    </div>
  )
}

function WinBtn({
  children,
  onClick,
  title,
  hoverBg,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  hoverBg: string
  danger?: boolean
}) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 46,
        height: 36,
        background: hovered ? hoverBg : 'transparent',
        color: danger && hovered ? '#fff' : '#9ca3b4',
        border: 'none',
        borderRadius: 0,
        fontSize: 14,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.1s',
      }}
    >
      {children}
    </button>
  )
}
