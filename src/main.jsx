import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Index from './index.jsx'
import { LanguageProvider } from './contexts/LanguageContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <Index />
    </LanguageProvider>
  </StrictMode>,
)
