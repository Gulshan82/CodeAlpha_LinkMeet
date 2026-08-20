import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for PWA capabilities
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('[PWA] ServiceWorker registered with scope: ', registration.scope);
      },
      (err) => {
        console.warn('[PWA] ServiceWorker registration failed: ', err);
      }
    );
  });
} else if ('serviceWorker' in navigator) {
  // Also register in dev mode if supported for local testing
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('[PWA] Dev ServiceWorker info:', err.message);
    });
  });
}
