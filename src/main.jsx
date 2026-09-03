import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Normalizador global de requisições de API para suportar qualquer porta (VPS ou Local)
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = function (resource, config) {
    if (typeof resource === 'string') {
      // Se a URL contiver porta :3000 hardcoded, redireciona para a rota relativa /api da porta atual (ex: 3002)
      resource = resource.replace(/^http:\/\/[^/]+:3000\/api/, '/api');
    }
    return originalFetch.call(this, resource, config);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
