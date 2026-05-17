import { useState } from 'react'
import { usePersonal } from './usePersonal'
import PersonalModal from './PersonalModal'

const COLOR_ROL = {
  GROOMER:       { bg: '#e3f2fd', color: '#1565c0', icono: '✂️' },
  CAJERO:        { bg: '#fff3e0', color: '#e65100', icono: '💰' },
  ADMINISTRADOR: { bg: '#f3e5f5', color: '#6a1b9a', icono: '👑' },
}

function formatFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export default function GestionPersonal() {
  const { personal, loading, crearPersonal,
          desactivarPersonal, reactivarPersonal } = usePersonal()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [filtroRol, setFiltroRol]       = useState('TODOS')

  const personalFiltrado = filtroRol === 'TODOS'
    ? personal
    : personal.filter(p => p.rol === filtroRol)

  const handleDesactivar = (p) => {
    if (window.confirm(
      `¿${p.activo ? 'Desactivar' : 'Reactivar'} a ${p.nombre}?`
    )) {
      p.activo
        ? desactivarPersonal(p.id, p.nombre)
        : reactivarPersonal(p.id, p.nombre)
    }
  }

  return (
    <div>

      {/* Encabezado */}
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>👥 Gestión de Personal</h1>
          <p style={estilos.subtitulo}>
            {loading ? 'Cargando...'
              : `${personal.length} empleado${personal.length !== 1 ? 's' : ''} registrado${personal.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button style={estilos.btnAgregar} onClick={() => setModalAbierto(true)}>
          + Crear personal
        </button>
      </div>

      {/* Filtros por rol */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['TODOS', 'GROOMER', 'CAJERO', 'ADMINISTRADOR'].map(rol => (
          <button
            key={rol}
            style={{
              padding: '6px 16px', border: 'none',
              borderRadius: 20, fontSize: 13, cursor: 'pointer',
              background: filtroRol === rol ? '#6c63ff' : '#f3f4f6',
              color: filtroRol === rol ? '#fff' : '#555',
              fontWeight: filtroRol === rol ? 700 : 400,
            }}
            onClick={() => setFiltroRol(rol)}
          >
            {rol === 'TODOS' ? 'Todos' : `${COLOR_ROL[rol]?.icono} ${rol}`}
          </button>
        ))}
      </div>

      {/* Cargando */}
      {loading && (
        <div style={estilos.estadoVacio}>
          <span style={{ fontSize: 40 }}>⏳</span>
          <p style={{ color: '#888' }}>Cargando personal...</p>
        </div>
      )}

      {/* Sin personal */}
      {!loading && personalFiltrado.length === 0 && (
        <div style={estilos.estadoVacio}>
          <span style={{ fontSize: 64 }}>👤</span>
          <h3 style={{ margin: '12px 0 4px', color: '#333' }}>
            No hay personal registrado
          </h3>
          <p style={{ color: '#888', margin: '0 0 20px' }}>
            Crea el primer empleado del sistema
          </p>
          <button style={estilos.btnAgregar} onClick={() => setModalAbierto(true)}>
            + Crear primer empleado
          </button>
        </div>
      )}

      {/* Lista de personal */}
      {!loading && personalFiltrado.length > 0 && (
        <div style={estilos.lista}>
          {personalFiltrado.map(empleado => {
            const cfg = COLOR_ROL[empleado.rol] ?? { bg: '#f5f5f5', color: '#888', icono: '👤' }
            return (
              <div key={empleado.id} style={{
                ...estilos.card,
                opacity: empleado.activo === false ? 0.6 : 1,
                borderLeft: `4px solid ${cfg.color}`,
              }}>

                {/* Avatar */}
                <div style={{
                  ...estilos.avatar,
                  background: cfg.bg, color: cfg.color
                }}>
                  {cfg.icono}
                </div>

                {/* Info */}
                <div style={estilos.cardInfo}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={estilos.cardNombre}>{empleado.nombre}</h3>
                    {empleado.activo === false && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 20,
                        background: '#ffebee', color: '#c62828'
                      }}>
                        INACTIVO
                      </span>
                    )}
                  </div>
                  <p style={estilos.cardEmail}>✉️ {empleado.email}</p>
                  <p style={estilos.cardFecha}>
                    📅 Registrado el {formatFecha(empleado.fecha_registro)}
                  </p>
                </div>

                {/* Rol badge */}
                <span style={{
                  padding: '6px 14px', borderRadius: 20,
                  background: cfg.bg, color: cfg.color,
                  fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap'
                }}>
                  {cfg.icono} {empleado.rol}
                </span>

                {/* Acción */}
                <button
                  style={{
                    padding: '8px 16px', border: 'none',
                    borderRadius: 8, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                    background: empleado.activo === false ? '#e8f5e9' : '#fff0f0',
                    color: empleado.activo === false ? '#2e7d32' : '#c62828',
                  }}
                  onClick={() => handleDesactivar(empleado)}
                >
                  {empleado.activo === false ? '✅ Reactivar' : '🚫 Desactivar'}
                </button>

              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <PersonalModal
          onGuardar={crearPersonal}
          onCerrar={() => setModalAbierto(false)}
        />
      )}

    </div>
  )
}

const estilos = {
  encabezado: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
    flexWrap: 'wrap', gap: 12,
  },
  titulo:    { margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' },
  subtitulo: { margin: 0, color: '#888', fontSize: 14 },
  btnAgregar: {
    padding: '10px 20px', background: '#6c63ff',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  estadoVacio: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '60px 20px',
    background: '#fff', borderRadius: 16, textAlign: 'center',
  },
  lista: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: {
    background: '#fff', borderRadius: 14,
    padding: '16px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex', alignItems: 'center', gap: 16,
    flexWrap: 'wrap',
  },
  avatar: {
    width: 48, height: 48, minWidth: 48,
    borderRadius: 12, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: 24, flexShrink: 0,
  },
  cardInfo:   { flex: 1, minWidth: 0 },
  cardNombre: { margin: '0 0 2px', fontSize: 16, fontWeight: 700, color: '#1a1a2e' },
  cardEmail:  { margin: '0 0 2px', fontSize: 13, color: '#666' },
  cardFecha:  { margin: 0, fontSize: 12, color: '#aaa' },
}

