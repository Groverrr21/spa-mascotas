import { useState } from 'react'
import { useCalendario } from './useCalendario'
import { useAuth } from '../../context/AuthContext'

// ── Helpers ───────────────────────────────────────────────────
const HORAS = Array.from({ length: 10 }, (_, i) => i + 8) // 08:00 - 17:00

const ESTADO_CFG = {
  PENDIENTE:  { color: '#f97316', bg: '#fff7ed', label: '⏳ Pendiente'  },
  CONFIRMADA: { color: '#3b82f6', bg: '#eff6ff', label: '✅ Confirmada' },
  COMPLETADA: { color: '#22c55e', bg: '#f0fdf4', label: '🏁 Completada' },
  CANCELADA:  { color: '#ef4444', bg: '#fef2f2', label: '❌ Cancelada'  },
}

function getDuracionMinutos(cita) {
  const servicios = cita.cita_servicio ?? []
  if (servicios.length === 0) return 60

  const total = servicios.reduce((sum, cs) =>
    sum + (cs.servicio?.duracion ?? 60), 0)

  // Ajuste por tamaño de mascota
  const tamanio = cita.mascota?.tamanio ?? 'MEDIANO'
  const factor = tamanio === 'PEQUEÑO' ? 1 :
                 tamanio === 'MEDIANO' ? 1.1 :
                 tamanio === 'GRANDE'  ? 1.15 : 1.3
  return Math.ceil(total * factor)
}

function getHoraDecimal(fechaStr) {
  const d = new Date(fechaStr)
  return d.getHours() + d.getMinutes() / 60
}

function formatHora(h) {
  return `${String(h).padStart(2, '0')}:00`
}

function isMismaFecha(fechaStr, fechaRef) {
  const a = new Date(fechaStr)
  const b = new Date(fechaRef)
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function getSemana(fechaBase) {
  const dias = []
  const inicio = new Date(fechaBase)
  const dia = inicio.getDay()
  const lunes = new Date(inicio)
  lunes.setDate(inicio.getDate() - (dia === 0 ? 6 : dia - 1))

  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes)
    d.setDate(lunes.getDate() + i)
    dias.push(d)
  }
  return dias
}

const DIAS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// ── Componente principal ──────────────────────────────────────
export default function Calendario() {
  const { perfil } = useAuth()
  const { citas, groomers, loading, cambiarEstado, asignarGroomer, fetchDatos }
    = useCalendario()

  const [fechaActual, setFechaActual]     = useState(new Date())
  const [vistaActual, setVistaActual]     = useState('semana') // 'dia' | 'semana'
  const [citaSeleccionada, setCitaSeleccionada] = useState(null)

  const diasSemana = getSemana(fechaActual)
  const hoy = new Date()

  // ── Navegación ───────────────────────────────────────────────
  const irAnterior = () => {
    const d = new Date(fechaActual)
    if (vistaActual === 'dia') d.setDate(d.getDate() - 1)
    else d.setDate(d.getDate() - 7)
    setFechaActual(d)
  }

  const irSiguiente = () => {
    const d = new Date(fechaActual)
    if (vistaActual === 'dia') d.setDate(d.getDate() + 1)
    else d.setDate(d.getDate() + 7)
    setFechaActual(d)
  }

  const irHoy = () => setFechaActual(new Date())

  // ── Filtrar citas por fecha ──────────────────────────────────
  const citasDelDia = (fecha) =>
    citas.filter(c => isMismaFecha(c.fecha, fecha))

  const citasPorGroomerYHora = (fecha, groomerId, hora) => {
    return citas.filter(c => {
      if (!isMismaFecha(c.fecha, fecha)) return false
      if (c.id_groomer !== groomerId) return false
      const horaC = getHoraDecimal(c.fecha)
      return Math.floor(horaC) === hora
    })
  }

  const citasSinGroomer = (fecha) =>
    citas.filter(c =>
      isMismaFecha(c.fecha, fecha) && !c.id_groomer
    )

  // ── Estadísticas del día ─────────────────────────────────────
  const statsHoy = {
    total:      citasDelDia(fechaActual).length,
    pendientes: citasDelDia(fechaActual).filter(c => c.estado === 'PENDIENTE').length,
    confirmadas:citasDelDia(fechaActual).filter(c => c.estado === 'CONFIRMADA').length,
    completadas:citasDelDia(fechaActual).filter(c => c.estado === 'COMPLETADA').length,
  }

  const puedeEditar = ['ADMINISTRADOR', 'CAJERO'].includes(perfil?.rol)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 40 }}>📅</span>
      <p style={{ color: '#888' }}>Cargando calendario...</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── ENCABEZADO ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>
            📅 Calendario de Citas
          </h1>
          <p style={{ margin: 0, color: '#888', fontSize: 14 }}>
            Vista {vistaActual === 'dia' ? 'diaria' : 'semanal'} — {groomers.length} groomers activos
          </p>
        </div>

        {/* Controles de navegación */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Selector de vista */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 4, gap: 4 }}>
            {['dia', 'semana'].map(v => (
              <button key={v} style={{
                padding: '7px 16px', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: vistaActual === v ? '#6c63ff' : 'transparent',
                color: vistaActual === v ? '#fff' : '#555',
              }} onClick={() => setVistaActual(v)}>
                {v === 'dia' ? '📆 Día' : '📅 Semana'}
              </button>
            ))}
          </div>

          {/* Navegación */}
          <button style={estilos.btnNav} onClick={irAnterior}>‹</button>
          <button style={{ ...estilos.btnNav, background: '#6c63ff', color: '#fff' }} onClick={irHoy}>Hoy</button>
          <button style={estilos.btnNav} onClick={irSiguiente}>›</button>
          <button style={{ ...estilos.btnNav, fontSize: 12 }} onClick={fetchDatos}>🔄</button>
        </div>
      </div>

      {/* ── STATS DEL DÍA ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total hoy',   valor: statsHoy.total,      color: '#6c63ff' },
          { label: 'Pendientes',  valor: statsHoy.pendientes,  color: '#f97316' },
          { label: 'Confirmadas', valor: statsHoy.confirmadas, color: '#3b82f6' },
          { label: 'Completadas', valor: statsHoy.completadas, color: '#22c55e' },
        ].map((s, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 12, padding: '14px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            borderLeft: `4px solid ${s.color}`,
            display: 'flex', flexDirection: 'column', gap: 2
          }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.valor}</span>
            <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── VISTA SEMANAL ───────────────────────────────────── */}
      {vistaActual === 'semana' && (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

          {/* Header días */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: '2px solid #f0f0f0' }}>
            <div style={estilos.headerCelda} />
            {diasSemana.map((dia, i) => {
              const esHoy = isMismaFecha(dia, hoy)
              const citasDia = citasDelDia(dia)
              return (
                <div key={i} style={{
                  ...estilos.headerCelda,
                  background: esHoy ? '#6c63ff' : '#fafafa',
                  color: esHoy ? '#fff' : '#333',
                  cursor: 'pointer',
                }} onClick={() => { setFechaActual(dia); setVistaActual('dia') }}>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{DIAS_ES[i]}</span>
                  <span style={{ fontSize: 20, fontWeight: 700 }}>{dia.getDate()}</span>
                  {citasDia.length > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: esHoy ? 'rgba(255,255,255,0.3)' : '#6c63ff',
                      color: '#fff', padding: '1px 7px', borderRadius: 20
                    }}>
                      {citasDia.length} cita{citasDia.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Grid de horas */}
          <div style={{ overflowY: 'auto', maxHeight: 500 }}>
            {HORAS.map(hora => (
              <div key={hora} style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: '1px solid #f5f5f5', minHeight: 56 }}>
                <div style={estilos.horaLabel}>{formatHora(hora)}</div>
                {diasSemana.map((dia, di) => {
                  const citasSlot = citasDelDia(dia).filter(c => {
                    const h = getHoraDecimal(c.fecha)
                    return Math.floor(h) === hora
                  })
                  return (
                    <div key={di} style={{
                      padding: '4px',
                      borderLeft: '1px solid #f0f0f0',
                      background: isMismaFecha(dia, hoy) ? '#fafafe' : 'transparent',
                      display: 'flex', flexDirection: 'column', gap: 2
                    }}>
                      {citasSlot.map(cita => {
                        const cfg = ESTADO_CFG[cita.estado] ?? ESTADO_CFG.PENDIENTE
                        return (
                          <div
                            key={cita.id}
                            style={{
                              background: cfg.bg,
                              borderLeft: `3px solid ${cfg.color}`,
                              borderRadius: 6, padding: '4px 6px',
                              cursor: 'pointer', fontSize: 11,
                            }}
                            onClick={() => setCitaSeleccionada(cita)}
                          >
                            <div style={{ fontWeight: 700, color: cfg.color, fontSize: 10 }}>
                              {new Date(cita.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ color: '#333', fontWeight: 600 }}>
                              🐾 {cita.mascota?.nombre}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VISTA DIARIA POR GROOMER ─────────────────────────── */}
      {vistaActual === 'dia' && (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

          {/* Fecha actual */}
          <div style={{ padding: '16px 20px', borderBottom: '2px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>📅</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a2e', textTransform: 'capitalize' }}>
              {fechaActual.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
          </div>

          {/* Citas sin groomer asignado */}
          {citasSinGroomer(fechaActual).length > 0 && (
            <div style={{ padding: '12px 20px', background: '#fffbf0', borderBottom: '1px solid #ffe0b2' }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#e65100' }}>
                ⚠️ Citas sin groomer asignado ({citasSinGroomer(fechaActual).length})
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {citasSinGroomer(fechaActual).map(cita => (
                  <div key={cita.id}
                    style={{ background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
                    onClick={() => setCitaSeleccionada(cita)}>
                    🐾 {cita.mascota?.nombre} — {new Date(cita.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid por groomer */}
          {groomers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
              <span style={{ fontSize: 48 }}>✂️</span>
              <p>No hay groomers registrados</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: groomers.length * 200 + 80 }}>

                {/* Header groomers */}
                <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${groomers.length}, 1fr)`, borderBottom: '2px solid #f0f0f0' }}>
                  <div style={estilos.headerCelda} />
                  {groomers.map(g => (
                    <div key={g.id} style={{ ...estilos.headerCelda, flexDirection: 'column', gap: 2 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6c63ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                        {g.usuario?.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>
                        {g.usuario?.nombre}
                      </span>
                      <span style={{ fontSize: 10, color: '#888' }}>{g.especialidad ?? 'Groomer'}</span>
                      <span style={{ fontSize: 11, color: '#6c63ff', fontWeight: 600 }}>
                        {citasDelDia(fechaActual).filter(c => c.id_groomer === g.id).length} citas hoy
                      </span>
                    </div>
                  ))}
                </div>

                {/* Filas de horas */}
                <div style={{ overflowY: 'auto', maxHeight: 520 }}>
                  {HORAS.map(hora => (
                    <div key={hora} style={{ display: 'grid', gridTemplateColumns: `80px repeat(${groomers.length}, 1fr)`, borderBottom: '1px solid #f5f5f5', minHeight: 64 }}>
                      <div style={estilos.horaLabel}>{formatHora(hora)}</div>
                      {groomers.map(g => {
                        const citasSlot = citasPorGroomerYHora(fechaActual, g.id, hora)
                        return (
                          <div key={g.id} style={{ padding: 4, borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {citasSlot.map(cita => {
                              const cfg = ESTADO_CFG[cita.estado] ?? ESTADO_CFG.PENDIENTE
                              const durMin = getDuracionMinutos(cita)
                              const servicios = cita.cita_servicio?.map(cs => cs.servicio?.nombre).join(', ') ?? ''
                              return (
                                <div
                                  key={cita.id}
                                  style={{
                                    background: cfg.bg,
                                    border: `1px solid ${cfg.color}`,
                                    borderLeft: `4px solid ${cfg.color}`,
                                    borderRadius: 8, padding: '6px 10px',
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s',
                                  }}
                                  onClick={() => setCitaSeleccionada(cita)}
                                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>
                                      {new Date(cita.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span style={{ fontSize: 10, color: '#aaa' }}>⏱ {durMin}min</span>
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>
                                    🐾 {cita.mascota?.nombre}
                                  </div>
                                  <div style={{ fontSize: 11, color: '#666' }}>
                                    {cita.mascota?.raza} · {cita.mascota?.tamanio}
                                  </div>
                                  {servicios && (
                                    <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                                      ✂️ {servicios}
                                    </div>
                                  )}
                                  <div style={{ marginTop: 4 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}` }}>
                                      {cfg.label}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL DETALLE DE CITA ────────────────────────────── */}
      {citaSeleccionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setCitaSeleccionada(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>
                📋 Detalle de cita
              </h3>
              <button style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}
                onClick={() => setCitaSeleccionada(null)}>✕</button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Mascota */}
              <div style={{ background: '#f8f9ff', borderRadius: 10, padding: '12px 16px' }}>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#6c63ff', textTransform: 'uppercase' }}>Mascota</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>
                  🐾 {citaSeleccionada.mascota?.nombre}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#666' }}>
                  {citaSeleccionada.mascota?.raza} · {citaSeleccionada.mascota?.tamanio}
                </p>
              </div>

              {/* Fecha y hora */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={estilos.infoBox}>
                  <span style={estilos.infoLabel}>Fecha</span>
                  <span style={estilos.infoValor}>
                    {new Date(citaSeleccionada.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <div style={estilos.infoBox}>
                  <span style={estilos.infoLabel}>Hora</span>
                  <span style={estilos.infoValor}>
                    {new Date(citaSeleccionada.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Servicios */}
              {citaSeleccionada.cita_servicio?.length > 0 && (
                <div style={estilos.infoBox}>
                  <span style={estilos.infoLabel}>Servicios</span>
                  {citaSeleccionada.cita_servicio.map((cs, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 13, color: '#333' }}>✂️ {cs.servicio?.nombre}</span>
                      <span style={{ fontSize: 13, color: '#6c63ff', fontWeight: 600 }}>Bs. {cs.servicio?.precio}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>Duración estimada</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#6c63ff' }}>{getDuracionMinutos(citaSeleccionada)} min</span>
                  </div>
                </div>
              )}

              {/* Estado actual */}
              <div style={{ ...estilos.infoBox, background: ESTADO_CFG[citaSeleccionada.estado]?.bg }}>
                <span style={estilos.infoLabel}>Estado actual</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: ESTADO_CFG[citaSeleccionada.estado]?.color }}>
                  {ESTADO_CFG[citaSeleccionada.estado]?.label}
                </span>
              </div>

              {/* Asignar groomer — solo admin/cajero */}
              {puedeEditar && !citaSeleccionada.id_groomer && (
                <div style={estilos.infoBox}>
                  <span style={estilos.infoLabel}>Asignar groomer</span>
                  <select
                    style={{ ...estilos.select, marginTop: 6 }}
                    onChange={e => {
                      asignarGroomer(citaSeleccionada.id, e.target.value)
                      setCitaSeleccionada(null)
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>-- Selecciona un groomer --</option>
                    {groomers.map(g => (
                      <option key={g.id} value={g.id}>{g.usuario?.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Botones de cambio de estado */}
              {puedeEditar && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {citaSeleccionada.estado === 'PENDIENTE' && (
                    <button style={{ ...estilos.btnAccion, background: '#eff6ff', color: '#3b82f6' }}
                      onClick={() => { cambiarEstado(citaSeleccionada.id, 'CONFIRMADA'); setCitaSeleccionada(null) }}>
                      ✅ Confirmar
                    </button>
                  )}
                  {citaSeleccionada.estado === 'CONFIRMADA' && (
                    <button style={{ ...estilos.btnAccion, background: '#f0fdf4', color: '#22c55e' }}
                      onClick={() => { cambiarEstado(citaSeleccionada.id, 'COMPLETADA'); setCitaSeleccionada(null) }}>
                      🏁 Completar
                    </button>
                  )}
                  {['PENDIENTE', 'CONFIRMADA'].includes(citaSeleccionada.estado) && (
                    <button style={{ ...estilos.btnAccion, background: '#fef2f2', color: '#ef4444' }}
                      onClick={() => { cambiarEstado(citaSeleccionada.id, 'CANCELADA'); setCitaSeleccionada(null) }}>
                      ❌ Cancelar
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const estilos = {
  btnNav: {
    padding: '8px 14px', background: '#f3f4f6', border: 'none',
    borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', color: '#333'
  },
  headerCelda: {
    padding: '12px 8px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 2,
    background: '#fafafa', borderLeft: '1px solid #f0f0f0', minHeight: 72
  },
  horaLabel: {
    padding: '0 10px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 12, color: '#aaa',
    fontWeight: 600, background: '#fafafa', borderRight: '1px solid #f0f0f0'
  },
  infoBox: {
    background: '#f8f9ff', borderRadius: 10, padding: '10px 14px',
    display: 'flex', flexDirection: 'column', gap: 4
  },
  infoLabel: {
    fontSize: 11, fontWeight: 700, color: '#6c63ff',
    textTransform: 'uppercase', letterSpacing: 0.5
  },
  infoValor: { fontSize: 15, fontWeight: 700, color: '#1a1a2e' },
  select: {
    padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb',
    fontSize: 14, color: '#333', background: '#fff', width: '100%'
  },
  btnAccion: {
    padding: '8px 16px', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 700, cursor: 'pointer', flex: 1
  }
}