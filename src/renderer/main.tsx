import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'
import './types/index'

const container = document.getElementById('root')!
createRoot(container).render(<App />)
