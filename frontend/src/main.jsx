import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register service worker for PWA only in production builds.
// In dev it can keep serving old JS/CSS and hide recent UI changes.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // First, unregister any old service workers
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        // Check if it's an old version
        if (registration.scope !== window.location.origin + '/') {
          registration.unregister();
        }
      });
    });

    // Register the current service worker
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(registration => {
      console.log('Service Worker registered:', registration);
      
      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute
    }).catch(error => {
      console.error('Service Worker registration failed:', error);
    });
  });
}

if ('serviceWorker' in navigator && import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

