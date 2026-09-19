import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App.jsx'
import { StoreProvider } from './context/StoreContext.jsx'
import '@fontsource-variable/nunito'
import './styles.css'

const container = document.getElementById('root')
// Páginas geradas no build trazem o HTML pronto e o catálogo usado para gerá-lo.
const preloaded = window.__FLIP_CATALOG__ || null

const app = (
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider preloaded={preloaded}>
        <App />
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>
)

if (preloaded && container.hasChildNodes()) hydrateRoot(container, app)
else createRoot(container).render(app)
