import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'
import './interactions.css'
import './sidebar-scroll.css'
import './forecast.css'
import './category-tooltip.css'

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
