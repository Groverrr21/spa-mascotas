import { useState, useRef, useEffect } from 'react'
import { TIPOS_NOTI } from '../../hooks/useNotificaciones'

function formatTiempo(fecha) {
  const ahora = new Date()
  const f     = new Date(fecha)
  const diff  = Math.floor((ahora - f) / 1000)

  if (diff < 60)   return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400)return `Hace ${Math.floor(diff / 3600)} h`
  return f.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function NotificacionesPanel({
  notificaciones, noLeidas, loading,
  marcarLeida, marcarTodasLeidas,
}) {
  const [abierto, setAbierto] = useState(false)
  const panelRef = useRef(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleClickNoti = (noti) => {
    if (!noti.leida) marcarLeida(noti.id)
  }

  const recientes   = notificaciones.slice(0, 20)
  const hayNoLeidas = noLeidas > 0

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>

      {/* Botón campana */}
      <button
        style={s.btnCampana}
        onClick={() => setAbierto(!abierto)}
        title="Notificaciones"
      >
        🔔
        {hayNoLeidas && (
          <span style={s.badge}>
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {/* Panel */}
      {abierto && (
        <div style={s.panel}>

          {/* Header */}
          <div style={s.panelHeader}>
            <div>
              <h3 style={s.panelTitulo}>Notificaciones</h3>
              {hayNoLeidas && (
                <span style={s.badgeHeader}>{noLeidas} sin leer</span>
              )}
            </div>
            {hayNoLeidas && (
              <button style={s.btnMarcarTodas} onClick={marcarTodasLeidas}>
                ✓ Marcar todas
              </button>
            )}
          </div>

          {/* Lista */}
          <div style={s.lista}>
            {loading && (
              <div style={s.empty}>
                <span style={{ fontSize: 32 }}>⏳</span>
                <p style={{ color: '#888', fontSize: 13, margin: '8px 0 0' }}>Cargando...</p>
              </div>
            )}

            {!loading && recientes.length === 0 && (
              <div style={s.empty}>
                <span style={{ fontSize: 40 }}>🔔</span>
                <p style={{ color: '#888', fontSize: 13, margin: '8px 0 0' }}>
                  No tienes notificaciones aún
                </p>
              </div>
            )}

            {!loading && recientes.map(noti => {
              const cfg = TIPOS_NOTI[noti.tipo] ?? TIPOS_NOTI.SISTEMA
              return (
                <div
                  key={noti.id}
                  style={{
                    ...s.notiItem,
                    background: noti.leida ? '#fff' : '#f8f7ff',
                    borderLeft: noti.leida ? '3px solid transparent' : `3px solid ${cfg.color}`,
                  }}
                  onClick={() => handleClickNoti(noti)}
                >
                  {/* Icono */}
                  <div style={{
                    width: 36, height: 36, minWidth: 36,
                    borderRadius: '50%',
                    background: cfg.color + '18',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 18,
                  }}>
                    {cfg.icono}
                  </div>

                  {/* Contenido */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: '0 0 2px', fontSize: 13, fontWeight: noti.leida ? 400 : 700,
                      color: '#1a1a2e', lineHeight: 1.3,
                    }}>
                      {noti.titulo}
                    </p>
                    {noti.mensaje && (
                      <p style={{
                        margin: '0 0 4px', fontSize: 12, color: '#666',
                        lineHeight: 1.4, overflow: 'hidden',
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {noti.mensaje}
                      </p>
                    )}
                    <span style={{ fontSize: 11, color: '#aaa' }}>
                      {formatTiempo(noti.created_at)}
                    </span>
                  </div>

                  {/* Punto no leída */}
                  {!noti.leida && (
                    <div style={{
                      width: 8, height: 8, minWidth: 8,
                      borderRadius: '50%', background: cfg.color,
                      marginTop: 4,
                    }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          {recientes.length > 0 && (
            <div style={s.panelFooter}>
              <span style={{ fontSize: 12, color: '#aaa' }}>
                Mostrando las últimas {recientes.length} notificaciones
              </span>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

const s = {
  btnCampana: {
    position: 'relative', background: '#f4f5f7', border: 'none',
    borderRadius: 10, width: 40, height: 40,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, cursor: 'pointer', transition: 'background 0.15s',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    background: '#e53e3e', color: '#fff',
    borderRadius: '50%', minWidth: 18, height: 18,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700, padding: '0 3px',
    border: '2px solid #fff',
  },
  panel: {
    position: 'absolute', top: 48, right: 0,
    width: 360, maxWidth: '90vw',
    background: '#fff', borderRadius: 16,
    boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
    zIndex: 200, overflow: 'hidden',
    border: '1px solid #f0f0f0',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px 12px',
    borderBottom: '1px solid #f5f5f5',
  },
  panelTitulo: {
    margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: '#1a1a2e',
  },
  badgeHeader: {
    fontSize: 11, fontWeight: 700, color: '#6c63ff',
  },
  btnMarcarTodas: {
    padding: '5px 12px', background: '#f0eeff', color: '#6c63ff',
    border: 'none', borderRadius: 8, fontSize: 12,
    fontWeight: 600, cursor: 'pointer',
  },
  lista: {
    maxHeight: 400, overflowY: 'auto',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '40px 20px', textAlign: 'center',
  },
  notiItem: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '12px 16px', cursor: 'pointer',
    borderBottom: '1px solid #f8f8f8',
    transition: 'background 0.1s',
  },
  panelFooter: {
    padding: '10px 16px', textAlign: 'center',
    borderTop: '1px solid #f5f5f5', background: '#fafafa',
  },
}
