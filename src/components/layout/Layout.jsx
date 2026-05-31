import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const MENU = [
  { path: '/dashboard',      label: 'Dashboard',  icono: '🏠', roles: ['CLIENTE','GROOMER','CAJERO','ADMINISTRADOR'] },
  { path: '/mascotas',       label: 'Mascotas',   icono: '🐾', roles: ['CLIENTE','GROOMER','ADMINISTRADOR'] },
  { path: '/citas',          label: 'Citas',      icono: '📅', roles: ['CLIENTE','GROOMER','CAJERO','ADMINISTRADOR'] },
  { path: '/fichas',         label: 'Fichas',     icono: '📋', roles: ['GROOMER','ADMINISTRADOR'] },
  { path: '/tienda',         label: 'Tienda',     icono: '🛍️', roles: ['CLIENTE','ADMINISTRADOR'] },
  { path: '/clientes',       label: 'Clientes',   icono: '👥', roles: ['CAJERO','ADMINISTRADOR'] },
  { path: '/servicios',      label: 'Servicios',  icono: '✂️', roles: ['ADMINISTRADOR'] },
  { path: '/inventario',     label: 'Inventario', icono: '📦', roles: ['GROOMER','ADMINISTRADOR'] },
  { path: '/facturas',       label: 'Facturas',   icono: '🧾', roles: ['CAJERO','ADMINISTRADOR'] },
  { path: '/reportes',       label: 'Reportes',   icono: '📊', roles: ['ADMINISTRADOR'] },
  { path: '/admin/personal', label: 'Personal',   icono: '👑', roles: ['ADMINISTRADOR'] },
  { path: '/admin/logs',     label: 'Logs',       icono: '📋', roles: ['ADMINISTRADOR'] },
  { path: '/calendario',     label: 'Calendario', icono: '🗓️', roles: ['ADMINISTRADOR','CAJERO','GROOMER'] },
]

const COLOR_ROL = {
  CLIENTE:       { bg: '#e8f5e9', color: '#2e7d32' },
  GROOMER:       { bg: '#e3f2fd', color: '#1565c0' },
  CAJERO:        { bg: '#fff3e0', color: '#e65100' },
  ADMINISTRADOR: { bg: '#f3e5f5', color: '#6a1b9a' },
}

export default function Layout({ children }) {
  const { perfil, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const menuFiltrado = MENU.filter(item => item.roles.includes(perfil?.rol))
  const coloresRol   = COLOR_ROL[perfil?.rol] ?? COLOR_ROL.CLIENTE
  const inicial      = perfil?.nombre?.charAt(0).toUpperCase() ?? '?'

  return (
    <div style={estilos.contenedor}>

      {/* SIDEBAR */}
      <aside style={estilos.sidebar}>

        {/* Logo */}
        <div style={estilos.logo}>
          <span style={{ fontSize: 32, lineHeight: 1 }}>🐾</span>
          <div>
            <p style={estilos.logoTitulo}>Spa Mascotas</p>
            <p style={estilos.logoSubtitulo}>Sistema de gestión</p>
          </div>
        </div>

        {/* Info usuario */}
        <div style={estilos.usuarioCard}>
          <div style={estilos.avatar}>{inicial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={estilos.usuarioNombre}>{perfil?.nombre}</p>
            <span style={{ ...estilos.usuarioRol, background: coloresRol.bg, color: coloresRol.color }}>
              {perfil?.rol}
            </span>
          </div>
        </div>

        <div style={estilos.separador} />

        {/* Menú */}
        <nav style={estilos.nav}>
          <p style={estilos.navLabel}>MENÚ</p>
          {menuFiltrado.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                ...estilos.navItem,
                background: isActive ? 'rgba(108,99,255,0.12)' : 'transparent',
                color:      isActive ? '#6c63ff' : '#c9c9d8',
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? '3px solid #6c63ff' : '3px solid transparent',
              })}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icono}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Cerrar sesión */}
        <button style={estilos.logoutBtn} onClick={handleLogout}>
          <span>🚪</span>
          <span>Cerrar sesión</span>
        </button>

      </aside>

      {/* CONTENIDO */}
      <div style={estilos.contenidoWrapper}>

        {/* Topbar */}
        <header style={estilos.topbar}>
          <p style={estilos.topbarBienvenida}>
            Hola, <strong>{perfil?.nombre}</strong> 👋
          </p>
          <p style={estilos.topbarFecha}>
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </header>

        <main style={estilos.main}>
          {children}
        </main>

      </div>
    </div>
  )
}

const estilos = {
  contenedor:       { display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", background: '#f4f5f7' },
  sidebar:          { width: 240, minWidth: 240, maxWidth: 240, minHeight: '100vh', background: '#1a1a2e', display: 'flex', flexDirection: 'column', padding: '24px 0', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, overflow: 'hidden' },
  logo:             { display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  logoTitulo:       { margin: 0, color: '#ffffff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' },
  logoSubtitulo:    { margin: 0, color: '#8888aa', fontSize: 11, whiteSpace: 'nowrap' },
  usuarioCard:      { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', overflow: 'hidden' },
  avatar:           { width: 40, height: 40, minWidth: 40, borderRadius: '50%', background: '#6c63ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0 },
  usuarioNombre:    { margin: '0 0 4px', color: '#ffffff', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  usuarioRol:       { display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5, whiteSpace: 'nowrap' },
  separador:        { height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 20px 16px' },
  nav:              { padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' },
  navLabel:         { margin: '0 0 8px 8px', color: '#555577', fontSize: 10, fontWeight: 700, letterSpacing: 1 },
  navItem:          { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 14, transition: 'all 0.15s ease', cursor: 'pointer', whiteSpace: 'nowrap' },
  logoutBtn:        { display: 'flex', alignItems: 'center', gap: 10, margin: '0 12px 8px', padding: '10px 12px', background: 'rgba(255,80,80,0.08)', color: '#ff6b6b', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: 'calc(100% - 24px)' },
  contenidoWrapper: { marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  topbar:           { background: '#ffffff', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 50 },
  topbarBienvenida: { margin: 0, fontSize: 15, color: '#333' },
  topbarFecha:      { margin: 0, fontSize: 13, color: '#888', textTransform: 'capitalize' },
  main:             { padding: 28, flex: 1 },
}
