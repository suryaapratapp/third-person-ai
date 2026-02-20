import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { DemoModeProvider } from './context/DemoModeContext'
import { PrivacyProvider } from './context/PrivacyContext'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DemoModeProvider>
          <PrivacyProvider>
            <App />
          </PrivacyProvider>
        </DemoModeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
