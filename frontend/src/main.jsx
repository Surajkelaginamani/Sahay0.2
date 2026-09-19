import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './i18n'
import './index.css'
import './services/api.js'
import App from './App.jsx'

// Register PWA Service Worker
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('PWA: Content update available');
  },
  onOfflineReady() {
    console.log('PWA: Ready to work offline');
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
