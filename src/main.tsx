import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'
import { applyTheme } from './lib/theme'

// Early load saved theme from localStorage to avoid theme flickering
try {
  const savedPrefs = localStorage.getItem('thingor_user_preferences');
  if (savedPrefs) {
    const parsed = JSON.parse(savedPrefs);
    applyTheme(parsed.theme_id, parsed.accent_color);
  }
} catch (e) {}

// Register PWA service worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    updateSW(true);
  },
  onOfflineReady() {
    console.log('Thingor PWA Service Worker is active.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
