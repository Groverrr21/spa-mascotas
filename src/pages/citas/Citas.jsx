import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCitas } from './useCitas'
import CitaModal from './CitaModal'

const ESTADO_CONFIG = {
  PENDIENTE:   { color: '#e65100', bg: '#fff3e0', label: '⏳ Pendiente'   },
  CONFIRMADA:  { color: '#1565c0', bg: '#e3f2fd', label: '✅ Confirmada'  },
  COMPLETADA:  { color: '#2e7d32', bg: '#e8f5e9', label: '🏁 Completada' },
  CANCELADA:   { color: '#c62828', bg: '#ffebee', label: '❌ Cancelada'   },
}

function formatFecha(fechaStr) {
  const fecha = new Date(fechaStr)
  return fecha.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric',
    month: 'long', year: 'numeric'
  })
}

function formatHora(fechaStr) {
  return new Date(fechaStr).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit'
  })
}

export default function Citas() {
  const { perfil } = useAuth()
  const { citas, loading, crearCita, cambiarEstado, eliminarCita }
    = useCitas(perfil)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [citaCancelar, setCitaCancelar] = useState(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [aceptoPolitica, setAceptoPolitica]       = useState(false)

  const citasFiltradas = filtroEstado === 'TODOS'
    ? citas
    : citas.filter(c => c.estado === filtroEstado)

  const handleCancelar = async () => {
    if (!motivoCancelacion) return toast.error('Selecciona un motivo')
    if (!aceptoPolitica)    return toast.error('Debes aceptar la política de cancelación')

    const { error } = await supabase
      .from('cita')
      .update({
        estado: 'CANCELADA',
        motivo_cancelacion: motivoCancelacion,
        acepto_politica: true
      })
      .eq('id', citaCancelar.id)

    if (error) { toast.error('Error al cancelar'); return }
    toast.success('Cita cancelada')
    setCitaCancelar(null)
    setMotivoCancelacion('')
    setAceptoPolitica(false)
    // llama a fetchCitas del hook
  }

  const puedeEditar = (cita) =>
    ['ADMINISTRADOR', 'GROOMER'].includes(perfil?.rol) ||
    (perfil?.rol === 'CLIENTE' && cita.estado === 'PENDIENTE')

  return (
    <div>

      {/* Encabezado */}
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>📅 Citas</h1>
          <p style={estilos.subtitulo}>
            {loading ? 'Cargando...' : `${citas.length} cita${citas.length !== 1 ? 's' : ''} en total`}
          </p>
        </div>
        {['CLIENTE', 'ADMINISTRADOR'].includes(perfil?.rol) && (
          <button style={estilos.btnAgregar} onClick={() => setModalAbierto(true)}>
            + Nueva cita
          </button>
        )}
      </div>

      {/* Filtros por estado */}
      <div style={estilos.filtros}>
        {['TODOS', 'PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'].map(estado => (
          <button
            key={estado}
            style={{
              ...estilos.filtroBtn,
              background: filtroEstado === estado ? '#6c63ff' : '#f3f4f6',
              color: filtroEstado === estado ? '#fff' : '#555',
              fontWeight: filtroEstado === estado ? 700 : 400,
            }}
            onClick={() => setFiltroEstado(estado)}
          >
            {estado === 'TODOS' ? 'Todas' : ESTADO_CONFIG[estado]?.label}
          </button>
        ))}
      </div>

      {/* Cargando */}
      {loading && (
        <div style={estilos.estadoVacio}>
          <span style={{ fontSize: 40 }}>⏳</span>
          <p style={{ color: '#888' }}>Cargando citas...</p>
        </div>
      )}

      {/* Sin citas */}
      {!loading && citasFiltradas.length === 0 && (
        <div style={estilos.estadoVacio}>
          <span style={{ fontSize: 64 }}>📅</span>
          <h3 style={{ margin: '12px 0 4px', color: '#333' }}>
            No hay citas {filtroEstado !== 'TODOS' ? `con estado "${filtroEstado}"` : 'aún'}
          </h3>
          <p style={{ color: '#888', margin: '0 0 20px' }}>
            {filtroEstado === 'TODOS' && 'Agenda la primera cita para tu mascota'}
          </p>
          {filtroEstado === 'TODOS' && perfil?.rol === 'CLIENTE' && (
            <button style={estilos.btnAgregar} onClick={() => setModalAbierto(true)}>
              + Agendar primera cita
            </button>
          )}
        </div>
      )}

      {/* Lista de citas */}
      {!loading && citasFiltradas.length > 0 && (
        <div style={estilos.lista}>
          {citasFiltradas.map(cita => {
            const cfg = ESTADO_CONFIG[cita.estado] ?? ESTADO_CONFIG.PENDIENTE
            const totalCita = (cita.cita_servicio ?? [])
              .reduce((sum, cs) => sum + parseFloat(cs.servicio?.precio ?? 0), 0)

            return (
              <div key={cita.id} style={estilos.card}>

                {/* Fila superior: fecha + estado */}
                <div style={estilos.cardTop}>
                  <div>
                    <p style={estilos.cardFecha}>
                      {formatFecha(cita.fecha)}
                    </p>
                    <p style={estilos.cardHora}>🕐 {formatHora(cita.fecha)}</p>
                  </div>
                  <span style={{
                    ...estilos.estadoBadge,
                    background: cfg.bg,
                    color: cfg.color
                  }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Info mascota y groomer */}
                <div style={estilos.cardInfo}>
                  <div style={estilos.infoItem}>
                    <span style={estilos.infoLabel}>Mascota</span>
                    <span style={estilos.infoValor}>
                      🐾 {cita.mascota?.nombre ?? '—'}
                    </span>
                  </div>
                  <div style={estilos.infoItem}>
                    <span style={estilos.infoLabel}>Groomer</span>
                    <span style={estilos.infoValor}>
                      ✂️ {cita.groomer?.nombre ?? 'Sin asignar'}
                    </span>
                  </div>
                </div>

                {/* Servicios */}
                {cita.cita_servicio?.length > 0 && (
                  <div style={estilos.servicios}>
                    {cita.cita_servicio.map(cs => (
                      <span key={cs.id} style={estilos.servicioTag}>
                        {cs.servicio?.nombre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Total + acciones */}
                <div style={estilos.cardFooter}>
                  <span style={estilos.total}>
                    Total: <strong>Bs. {totalCita.toFixed(2)}</strong>
                  </span>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {/* Admin y Groomer pueden cambiar estado */}
                    {['ADMINISTRADOR', 'GROOMER'].includes(perfil?.rol) &&
                      cita.estado === 'PENDIENTE' && (
                      <button
                        style={estilos.btnConfirmar}
                        onClick={() => cambiarEstado(cita.id, 'CONFIRMADA')}
                      >
                        ✅ Confirmar
                      </button>
                    )}
                    {['ADMINISTRADOR', 'GROOMER'].includes(perfil?.rol) &&
                      cita.estado === 'CONFIRMADA' && (
                      <button
                        style={estilos.btnCompletar}
                        onClick={() => cambiarEstado(cita.id, 'COMPLETADA')}
                      >
                        🏁 Completar
                      </button>
                    )}

                    {/* Cancelar — cliente solo si está PENDIENTE */}
                    {puedeEditar(cita) && cita.estado !== 'COMPLETADA' &&
                      cita.estado !== 'CANCELADA' && (
                      <button
                        style={estilos.btnCancelar}
                        onClick={() => { setCitaCancelar(cita); setMotivoCancelacion(''); setAceptoPolitica(false) }}
                      >
                        ❌ Cancelar
                      </button>
                    )}
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* Modal nueva cita */}
      {modalAbierto && (
        <CitaModal
          perfil={perfil}
          onGuardar={crearCita}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
      {/* Modal de cancelación */}
      {citaCancelar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setCitaCancelar(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>
                ❌ Cancelar cita
              </h3>
              <button style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' }}
                onClick={() => setCitaCancelar(null)}>✕</button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Info de la cita */}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#c62828' }}>
                  🐾 <strong>{citaCancelar.mascota?.nombre}</strong> —{' '}
                  {new Date(citaCancelar.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} a las{' '}
                  {new Date(citaCancelar.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Motivo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>
                  Motivo de cancelación <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, color: '#333', background: '#fafafa' }}
                  value={motivoCancelacion}
                  onChange={e => setMotivoCancelacion(e.target.value)}
                >
                  <option value="">-- Selecciona un motivo --</option>
                  <option value="Salud de la mascota">🐾 Salud de la mascota</option>
                  <option value="Emergencia personal">🚨 Emergencia personal</option>
                  <option value="Falta de tiempo">⏰ Falta de tiempo</option>
                  <option value="Reprogramar a otra fecha">📅 Quiero reprogramar</option>
                  <option value="Otro">📝 Otro motivo</option>
                </select>
              </div>

              {/* Política */}
              <div style={{
                background: '#f8f9ff', border: '1px solid #e5e7ff',
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', gap: 10, alignItems: 'flex-start'
              }}>
                <input
                  type="checkbox" id="politica"
                  checked={aceptoPolitica}
                  onChange={e => setAceptoPolitica(e.target.checked)}
                  style={{ marginTop: 2, accentColor: '#6c63ff', cursor: 'pointer' }}
                />
                <label htmlFor="politica" style={{ fontSize: 13, color: '#555', lineHeight: 1.5, cursor: 'pointer' }}>
                  Entiendo que las cancelaciones deben realizarse con <strong>al menos 24 horas de anticipación</strong>.
                  Cancelaciones tardías pueden generar un cargo o afectar futuras reservas.
                </label>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ flex: 1, padding: '10px', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setCitaCancelar(null)}>
                  Volver
                </button>
                <button
                  style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: (!motivoCancelacion || !aceptoPolitica) ? 0.5 : 1 }}
                  onClick={handleCancelar}
                  disabled={!motivoCancelacion || !aceptoPolitica}
                >
                  Confirmar cancelación
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

const estilos = {
  encabezado: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
    flexWrap: 'wrap', gap: 12,
  },
  titulo:    { margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' },
  subtitulo: { margin: 0, color: '#888', fontSize: 14 },
  btnAgregar: {
    padding: '10px 20px', background: '#6c63ff',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  filtros: {
    display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap',
  },
  filtroBtn: {
    padding: '6px 14px', border: 'none',
    borderRadius: 20, fontSize: 13, cursor: 'pointer',
  },
  estadoVacio: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '60px 20px',
    background: '#fff', borderRadius: 16, textAlign: 'center',
  },
  lista: { display: 'flex', flexDirection: 'column', gap: 14 },
  card: {
    background: '#fff', borderRadius: 14, padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  cardTop: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardFecha: {
    margin: '0 0 2px', fontSize: 15,
    fontWeight: 700, color: '#1a1a2e',
    textTransform: 'capitalize',
  },
  cardHora:  { margin: 0, fontSize: 13, color: '#888' },
  estadoBadge: {
    fontSize: 12, fontWeight: 700,
    padding: '4px 12px', borderRadius: 20,
    whiteSpace: 'nowrap',
  },
  cardInfo: {
    display: 'flex', gap: 24,
    padding: '12px 0',
    borderTop: '1px solid #f5f5f5',
    borderBottom: '1px solid #f5f5f5',
  },
  infoItem:  { display: 'flex', flexDirection: 'column', gap: 2 },
  infoLabel: { fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase' },
  infoValor: { fontSize: 14, color: '#333', fontWeight: 600 },
  servicios: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  servicioTag: {
    fontSize: 12, fontWeight: 600,
    padding: '3px 10px', borderRadius: 20,
    background: '#f0eeff', color: '#6c63ff',
  },
  cardFooter: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', flexWrap: 'wrap', gap: 8,
  },
  total: { fontSize: 14, color: '#555' },
  btnConfirmar: {
    padding: '7px 14px', background: '#e3f2fd',
    color: '#1565c0', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnCompletar: {
    padding: '7px 14px', background: '#e8f5e9',
    color: '#2e7d32', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnCancelar: {
    padding: '7px 14px', background: '#ffebee',
    color: '#c62828', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
}