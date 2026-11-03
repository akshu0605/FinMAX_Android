/**
 * FinMax - Modern Smart Finance Management Platform
 * 
 * The React app uses the existing Supabase project for authentication and
 * financial records. Capacitor packages this same app for Android.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './polyfills'
import App from './app/App.tsx'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
