import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const ACCION_CONFIG = {
  LOGIN_EXITOSO:    { icono: '✅', color: '#2e7d32', bg: '#e8f5e9', label: 'Login exitoso'     },
  LOGIN_FALLIDO:    { icono: '❌', color: '#c62828', bg: '#ffebee', label: 'Login fallido'      },
  REGISTRO_EXITOSO: { icono: '🆕', color: '#1565c0', bg: '#e3f2fd', label: 'Registro exitoso'  },
  REGISTRO_INTENTO: { icono: '📝', color: '#e65100', bg: '#fff3e0', label: 'Intento registro'  },
  REGISTRO_ERROR:   { icono: '⚠️', color: '#c62828', bg: '#ffebee', label: 'Error registro'    },
  OTP_EXITOSO:      { icono: '🔐', color: '#2e7d32', bg: '#e8f5e9', label: 'OTP verificado'    },
  OTP_FALLIDO:      { icono: '🔑', color: '#c62828', bg: '#ffebee', label: 'OTP fallido'       },
}

function formatFecha(f) {
  return new Date(f).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export default function Logs() {
  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [filtro, setFiltro]       = useState('TODOS')
  const [busqueda, setBusqueda]   = useState('')

  useEffect(() => { fetchLogs() }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('log_auditoria')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(200)

      if (error) throw error
      setLogs(data ?? [])
    } catch (e) {
      console.error(e)
      // Si la tabla no existe aún, cargar desde localStorage
      const local = JSON.parse(localStorage.getItem('spa_logs') || '[]')
      setLogs(local)
    }
    setLoading(false)
  }

  // Filtrar logs
  const logsFiltrados = logs.filter(log => {
    const matchFiltro  = filtro === 'TODOS' || log.accion === filtro
    const matchBusqueda = !busqueda ||
      log.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
      log.accion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      log.detalle?.toLowerCase().includes(busqueda.toLowerCase())
    return matchFiltro && matchBusqueda
  })

  // Estadísticas rápidas
  const stats = {
    total:     logs.length,
    exitosos:  logs.filter(l => l.accion?.includes('EXITOSO')).length,
    fallidos:  logs.filter(l => l.accion?.includes('FALLIDO') || l.accion?.includes('ERROR')).length,
    registros: logs.filter(l => l.accion?.includes('REGISTRO')).length,
  }

  return (
    <div>

      {/* Encabezado */}
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>📋 Logs de Auditoría</h1>
          <p style={estilos.subtitulo}>
            Registro de todas las acciones de autenticación del sistema
          </p>
        </div>
        <button style={estilos.btnRefresh} onClick={fetchLogs}>
          🔄 Actualizar
        </button>
      </div>

      {/* Tarjetas de resumen */}
      <div style={estilos.statsGrid}>
        <div style={{ ...estilos.statCard, borderLeft: '4px solid #6c63ff' }}>
          <span style={estilos.statNum}>{stats.total}</span>
          <span style={estilos.statLabel}>Total eventos</span>
        </div>
        <div style={{ ...estilos.statCard, borderLeft: '4px solid #2e7d32' }}>
          <span style={{ ...estilos.statNum, color: '#2e7d32' }}>{stats.exitosos}</span>
          <span style={estilos.statLabel}>Exitosos</span>
        </div>
        <div style={{ ...estilos.statCard, borderLeft: '4px solid #c62828' }}>
          <span style={{ ...estilos.statNum, color: '#c62828' }}>{stats.fallidos}</span>
          <span style={estilos.statLabel}>Fallidos</span>
        </div>
        <div style={{ ...estilos.statCard, borderLeft: '4px solid #1565c0' }}>
          <span style={{ ...estilos.statNum, color: '#1565c0' }}>{stats.registros}</span>
          <span style={estilos.statLabel}>Registros</span>
        </div>
      </div>

      {/* Buscador */}
      <div style={estilos.buscadorWrapper}>
        <span style={{ position: 'absolute', left: 14, fontSize: 16 }}>🔍</span>
        <input
          style={estilos.buscador}
          placeholder="Buscar por email, acción o detalle..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        {busqueda && (
          <button
            style={estilos.btnLimpiar}
            onClick={() => setBusqueda('')}
          >✕</button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['TODOS', ...Object.keys(ACCION_CONFIG)].map(accion => {
          const cfg = ACCION_CONFIG[accion]
          const activo = filtro === accion
          return (
            <button
              key={accion}
              style={{
                padding: '5px 12px', border: 'none',
                borderRadius: 20, fontSize: 12, cursor: 'pointer',
                background: activo ? (cfg?.bg ?? '#6c63ff') : '#f3f4f6',
                color: activo ? (cfg?.color ?? '#fff') : '#555',
                fontWeight: activo ? 700 : 400,
              }}
              onClick={() => setFiltro(accion)}
            >
              {cfg?.icono ?? '📋'} {cfg?.label ?? 'Todos'}
            </button>
          )
        })}
      </div>

      {/* Cargando */}
      {loading && (
        <div style={estilos.estadoVacio}>
          <span style={{ fontSize: 40 }}>⏳</span>
          <p style={{ color: '#888' }}>Cargando logs...</p>
        </div>
      )}

      {/* Sin logs */}
      {!loading && logsFiltrados.length === 0 && (
        <div style={estilos.estadoVacio}>
          <span style={{ fontSize: 56 }}>📭</span>
          <h3 style={{ margin: '12px 0 4px', color: '#333' }}>
            No hay registros
          </h3>
          <p style={{ color: '#888', margin: 0 }}>
            {busqueda
              ? `Sin resultados para "${busqueda}"`
              : 'Los eventos aparecerán aquí cuando los usuarios inicien sesión'}
          </p>
        </div>
      )}

      {/* Tabla de logs */}
      {!loading && logsFiltrados.length > 0 && (
        <div style={estilos.tablaWrapper}>
          <table style={estilos.tabla}>
            <thead>
              <tr style={estilos.thead}>
                <th style={estilos.th}>Evento</th>
                <th style={estilos.th}>Email</th>
                <th style={estilos.th}>Detalle</th>
                <th style={estilos.th}>Fecha y hora</th>
              </tr>
            </thead>
            <tbody>
              {logsFiltrados.map((log, i) => {
                const cfg = ACCION_CONFIG[log.accion] ?? {
                  icono: '📋', color: '#666', bg: '#f5f5f5', label: log.accion
                }
                return (
                  <tr
                    key={log.id ?? i}
                    style={{
                      ...estilos.tr,
                      background: i % 2 === 0 ? '#fff' : '#fafafa'
                    }}
                  >
                    {/* Acción */}
                    <td style={estilos.td}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', borderRadius: 20,
                        background: cfg.bg, color: cfg.color,
                        fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap'
                      }}>
                        {cfg.icono} {cfg.label}
                      </span>
                    </td>

                    {/* Email */}
                    <td style={{ ...estilos.td, color: '#333', fontSize: 13 }}>
                      {log.email ?? '—'}
                    </td>

                    {/* Detalle */}
                    <td style={{ ...estilos.td, color: '#888', fontSize: 12 }}>
                      {log.detalle || '—'}
                    </td>

                    {/* Fecha */}
                    <td style={{ ...estilos.td, color: '#aaa', fontSize: 12, whiteSpace: 'nowrap' }}>
                      📅 {formatFecha(log.fecha)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Total mostrado */}
      {!loading && logsFiltrados.length > 0 && (
        <p style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 12 }}>
          Mostrando {logsFiltrados.length} de {logs.length} eventos
        </p>
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
  btnRefresh: {
    padding: '8px 16px', background: '#f3f4f6',
    color: '#555', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 12, marginBottom: 20,
  },
  statCard: {
    background: '#fff', borderRadius: 12,
    padding: '16px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  statNum: {
    fontSize: 28, fontWeight: 800, color: '#6c63ff', lineHeight: 1,
  },
  statLabel: {
    fontSize: 12, color: '#888', fontWeight: 600,
  },
  buscadorWrapper: {
    position: 'relative', marginBottom: 16,
    display: 'flex', alignItems: 'center',
  },
  buscador: {
    width: '100%', padding: '11px 40px',
    borderRadius: 10, border: '1.5px solid #e5e7eb',
    fontSize: 14, outline: 'none',
    background: '#fff', color: '#333',
    boxSizing: 'border-box',
  },
  btnLimpiar: {
    position: 'absolute', right: 14,
    background: 'none', border: 'none',
    fontSize: 14, color: '#999', cursor: 'pointer',
  },
  estadoVacio: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '60px 20px',
    background: '#fff', borderRadius: 16, textAlign: 'center',
  },
  tablaWrapper: {
    background: '#fff', borderRadius: 14,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    overflow: 'hidden', overflowX: 'auto',
  },
  tabla: {
    width: '100%', borderCollapse: 'collapse',
    fontSize: 13,
  },
  thead: {
    background: '#1a1a2e',
  },
  th: {
    padding: '12px 16px', textAlign: 'left',
    color: 'rgba(255,255,255,0.7)', fontWeight: 600,
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #f5f5f5',
    transition: 'background 0.1s',
  },
  td: {
    padding: '12px 16px', verticalAlign: 'middle',
  },
}