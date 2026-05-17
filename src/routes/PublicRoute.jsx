import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        color: '#666',
        fontFamily: 'sans-serif'
      }}>
        Cargando... 🐾
      </div>
    )
  }

  // Si ya hay sesión → no dejar entrar al login, ir al dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}