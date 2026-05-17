import { useState } from 'react'
import { useClientes } from './useClientes'

function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  return new Date(fechaStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export default function Clientes() {
  const { clientes, loading } = useClientes()
  const [busqueda, setBusqueda]           = useState('')
  const [clienteExpandido, setClienteExpandido] = useState(null)

  // Filtrar por nombre o email
  const clientesFiltrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.email?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const toggleExpandir = (id) => {
    setClienteExpandido(prev => prev === id ? null : id)
  }

  return (
    <div>

      {/* Encabezado */}
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>👥 Clientes</h1>
          <p style={estilos.subtitulo}>
            {loading
              ? 'Cargando...'
              : `${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} registrado${clientes.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div style={estilos.buscadorWrapper}>
        <span style={estilos.buscadorIcono}>🔍</span>
        <input
          style={estilos.buscador}
          type="text"
          placeholder="Buscar por nombre o email..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        {busqueda && (
          <button
            style={estilos.btnLimpiar}
            onClick={() => setBusqueda('')}
          >
            ✕
          </button>
        )}
      </div>

      {/* Cargando */}
      {loading && (
        <div style={estilos.estadoVacio}>
          <span style={{ fontSize: 40 }}>⏳</span>
          <p style={{ color: '#888' }}>Cargando clientes...</p>
        </div>
      )}

      {/* Sin resultados */}
      {!loading && clientesFiltrados.length === 0 && (
        <div style={estilos.estadoVacio}>
          <span style={{ fontSize: 64 }}>👤</span>
          <h3 style={{ margin: '12px 0 4px', color: '#333' }}>
            {busqueda ? 'Sin resultados' : 'No hay clientes aún'}
          </h3>
          <p style={{ color: '#888', margin: 0 }}>
            {busqueda
              ? `No se encontró ningún cliente con "${busqueda}"`
              : 'Los clientes aparecerán aquí cuando se registren'}
          </p>
        </div>
      )}

      {/* Lista de clientes */}
      {!loading && clientesFiltrados.length > 0 && (
        <div style={estilos.lista}>
          {clientesFiltrados.map(cliente => {
            const expandido = clienteExpandido === cliente.id
            const inicial   = cliente.nombre?.charAt(0).toUpperCase() ?? '?'

            return (
              <div key={cliente.id} style={estilos.card}>

                {/* Fila principal */}
                <div style={estilos.cardMain}>

                  {/* Avatar */}
                  <div style={estilos.avatar}>{inicial}</div>

                  {/* Info básica */}
                  <div style={estilos.cardInfo}>
                    <h3 style={estilos.cardNombre}>{cliente.nombre}</h3>
                    <p style={estilos.cardEmail}>✉️ {cliente.email}</p>
                    <p style={estilos.cardFecha}>
                      📅 Registrado el {formatFecha(cliente.fecha_registro)}
                    </p>
                  </div>

                  {/* Stats */}
                  <div style={estilos.stats}>
                    <div style={estilos.statItem}>
                      <span style={estilos.statNum}>
                        {cliente.mascotas.length}
                      </span>
                      <span style={estilos.statLabel}>
                        {cliente.mascotas.length === 1 ? 'Mascota' : 'Mascotas'}
                      </span>
                    </div>
                    <div style={estilos.statDivider} />
                    <div style={estilos.statItem}>
                      <span style={estilos.statNum}>{cliente.totalCitas}</span>
                      <span style={estilos.statLabel}>
                        {cliente.totalCitas === 1 ? 'Cita' : 'Citas'}
                      </span>
                    </div>
                  </div>

                  {/* Botón expandir */}
                  {cliente.mascotas.length > 0 && (
                    <button
                      style={estilos.btnExpandir}
                      onClick={() => toggleExpandir(cliente.id)}
                    >
                      {expandido ? '▲ Ocultar' : '▼ Ver mascotas'}
                    </button>
                  )}

                </div>

                {/* Panel expandido — mascotas */}
                {expandido && cliente.mascotas.length > 0 && (
                  <div style={estilos.mascotasPanel}>
                    <p style={estilos.mascotasPanelTitulo}>
                      🐾 Mascotas de {cliente.nombre}
                    </p>
                    <div style={estilos.mascotasGrid}>
                      {cliente.mascotas.map(mascota => (
                        <div key={mascota.id} style={estilos.mascotaCard}>
                          <span style={{ fontSize: 24 }}>🐾</span>
                          <div>
                            <p style={estilos.mascotaNombre}>
                              {mascota.nombre}
                            </p>
                            <p style={estilos.mascotaRaza}>
                              {mascota.raza || 'Raza no especificada'}
                            </p>
                            {mascota.tamanio && (
                              <span style={estilos.mascotaTag}>
                                {mascota.tamanio}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}

const estilos = {
  encabezado: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titulo: {
    margin: '0 0 4px',
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  subtitulo: {
    margin: 0,
    color: '#888',
    fontSize: 14,
  },
  buscadorWrapper: {
    position: 'relative',
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
  },
  buscadorIcono: {
    position: 'absolute',
    left: 14,
    fontSize: 16,
    pointerEvents: 'none',
  },
  buscador: {
    width: '100%',
    padding: '12px 40px',
    borderRadius: 10,
    border: '1.5px solid #e5e7eb',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
    color: '#333',
    boxSizing: 'border-box',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  btnLimpiar: {
    position: 'absolute',
    right: 14,
    background: 'none',
    border: 'none',
    fontSize: 14,
    color: '#999',
    cursor: 'pointer',
  },
  estadoVacio: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    background: '#fff',
    borderRadius: 16,
    textAlign: 'center',
  },
  lista: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  card: {
    background: '#fff',
    borderRadius: 14,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  cardMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '18px 20px',
    flexWrap: 'wrap',
  },
  avatar: {
    width: 48,
    height: 48,
    minWidth: 48,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 20,
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardNombre: {
    margin: '0 0 2px',
    fontSize: 16,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  cardEmail: {
    margin: '0 0 2px',
    fontSize: 13,
    color: '#666',
  },
  cardFecha: {
    margin: 0,
    fontSize: 12,
    color: '#aaa',
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: '#f8f8ff',
    borderRadius: 10,
    padding: '10px 16px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontSize: 22,
    fontWeight: 700,
    color: '#6c63ff',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: 600,
  },
  statDivider: {
    width: 1,
    height: 32,
    background: '#e5e7eb',
  },
  btnExpandir: {
    padding: '8px 14px',
    background: '#f0eeff',
    color: '#6c63ff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  mascotasPanel: {
    padding: '16px 20px',
    background: '#fafafe',
    borderTop: '1px solid #f0eeff',
  },
  mascotasPanelTitulo: {
    margin: '0 0 12px',
    fontSize: 13,
    fontWeight: 700,
    color: '#6c63ff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mascotasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 10,
  },
  mascotaCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#fff',
    borderRadius: 10,
    padding: '10px 14px',
    border: '1px solid #ede9fe',
  },
  mascotaNombre: {
    margin: '0 0 2px',
    fontWeight: 700,
    fontSize: 14,
    color: '#1a1a2e',
  },
  mascotaRaza: {
    margin: '0 0 4px',
    fontSize: 12,
    color: '#888',
  },
  mascotaTag: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 20,
    background: '#ede9fe',
    color: '#6c63ff',
  },
}