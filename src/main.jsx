import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>          {/* permite la navegación entre páginas */}
      <AuthProvider>         {/* comparte el usuario logueado a toda la app */}
        <Toaster position="top-right" />   {/* notificaciones flotantes */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)