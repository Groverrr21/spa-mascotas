import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PrivateRoute({ children, rolesPermitidos }) {
  const { user, perfil, loading } = useAuth()

  // Cargando sesión → spinner
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

  // Sin sesión o sin perfil → login
  // (AuthContext ya cerró sesión si no había perfil)
  if (!user || !perfil) {
    return <Navigate to="/" replace />
  }

  // Rol no permitido → acceso denegado
  if (rolesPermitidos && !rolesPermitidos.includes(perfil.rol)) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        gap: 8
      }}>
        <span style={{ fontSize: 64 }}>🚫</span>
        <h2 style={{ color: '#333', margin: 0 }}>Acceso denegado</h2>
        <p style={{ color: '#666', margin: 0 }}>
          Tu rol <strong>{perfil.rol}</strong> no tiene permiso para esta página.
        </p>
        <a href="/dashboard" style={{
          marginTop: 12,
          color: '#fff',
          background: '#6c63ff',
          padding: '10px 24px',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 600
        }}>
          Volver al Dashboard
        </a>
      </div>
    )
  }

  return children
}