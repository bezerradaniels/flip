import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import App from './app/App.jsx'
import { StoreProvider } from './context/StoreContext.jsx'

export { loadCatalog } from './services/catalog.js'
export * from './seo/site.js'
export { renderHeadTags, serializeJson } from './seo/head.js'
export { policies } from './content/policies.js'

// Usado só no build (scripts/prerender.mjs) para gerar o HTML de cada página.
export function render(url, catalog) {
  return renderToString(
    <React.StrictMode>
      <StaticRouter location={url}>
        <StoreProvider preloaded={catalog}>
          <App />
        </StoreProvider>
      </StaticRouter>
    </React.StrictMode>,
  )
}
