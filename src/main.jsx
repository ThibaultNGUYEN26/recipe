import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Index from './Index.jsx'
import { LanguageProvider } from './contexts/LanguageContext'
import { ThemeProvider } from './contexts/ThemeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <Index />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
)
