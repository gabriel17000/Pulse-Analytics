import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'
import './interactions.css'
import './sidebar-scroll.css'

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
