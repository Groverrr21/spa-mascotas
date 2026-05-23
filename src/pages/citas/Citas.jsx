import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCitas } from './useCitas'
import { useFichaTecnica } from '../fichas/useFichaTecnica'
import CitaModal from './CitaModal'
import FichaModal from '../fichas/FichaModal'

const ESTADO_CONFIG = {
  PENDIENTE:   { color: '#e65100', bg: '#fff3e0', label: '⏳ Pendiente'   },
  CONFIRMADA:  { color: '#1565c0', bg: '#e3f2fd', label: '✅ Confirmada'  },
  COMPLETADA:  { color: '#2e7d32', bg: '#e8f5e9', label: '🏁 Completada' },
  CANCELADA:   { color: '#c62828', bg: '#ffebee', label: '❌ Cancelada'   },
}

function formatFecha(fechaStr) {
  return new Date(fechaStr).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}
function formatHora(fechaStr) {
  return new Date(fechaStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

export default function Citas() {
  const { perfil } = useAuth()
  const { citas, loading, crearCita, cambiarEstado, cancelarCita } = useCitas(perfil)
  const { guardarFicha, buscarFichaPorCita, subirFoto }            = useFichaTecnica(perfil)

  const [modalCita,         setModalCita]         = useState(false)
  const [filtroEstado,      setFiltroEstado]       = useState('TODOS')
  const [citaCancelar,      setCitaCancelar]       = useState(null)
  const [motivoCancelacion, setMotivoCancelacion]  = useState('')
  const [aceptoPolitica,    setAceptoPolitica]     = useState(false)
  const [cancelando,        setCancelando]         = useState(false)

  // ── Estado para la ficha técnica ─────────────────────────────
  const [modalFicha,        setModalFicha]         = useState(false)
  const [citaFicha,         setCitaFicha]          = useState(null)
  const [fichaExistente,    setFichaExistente]     = useState(null)
  const [cargandoFicha,     setCargandoFicha]      = useState(false)

  const citasFiltradas = filtroEstado === 'TODOS'
    ? citas
    : citas.filter(c => c.estado === filtroEstado)

  // ── Abrir ficha técnica para una cita ────────────────────────
  const abrirFicha = async (cita) => {
    setCargandoFicha(true)
    const ficha = await buscarFichaPorCita(cita.id)
    setFichaExistente(ficha)
    setCitaFicha(cita)
    setCargandoFicha(false)
    setModalFicha(true)
  }

  const cerrarFicha = () => {
    setModalFicha(false)
    setCitaFicha(null)
    setFichaExistente(null)
  }

  // ── Cancelar cita con motivo ──────────────────────────────────
  const handleCancelar = async () => {
    if (!motivoCancelacion || !aceptoPolitica) return
    setCancelando(true)
    const exito = await cancelarCita(citaCancelar.id, motivoCancelacion)
    setCancelando(false)
    if (exito) {
      setCitaCancelar(null)
      setMotivoCancelacion('')
      setAceptoPolitica(false)
    }
  }

  const abrirModalCancelar = (cita) => {
    setCitaCancelar(cita)
    setMotivoCancelacion('')
    setAceptoPolitica(false)
  }

  // ── Permisos por rol ──────────────────────────────────────────
  const puedeEditar = (cita) =>
    ['ADMINISTRADOR', 'GROOMER'].includes(perfil?.rol) ||
    (perfil?.rol === 'CLIENTE' && cita.estado === 'PENDIENTE')

  const puedeFicha = (cita) =>
    ['GROOMER', 'ADMINISTRADOR'].includes(perfil?.rol) &&
    ['CONFIRMADA', 'COMPLETADA'].includes(cita.estado)

  return (
    <div>

      {/* Encabezado */}
      <div style={est.encabezado}>
        <div>
          <h1 style={est.titulo}>📅 Citas</h1>
          <p style={est.subtitulo}>
            {loading ? 'Cargando...' : `${citas.length} cita${citas.length !== 1 ? 's' : ''} en total`}
          </p>
        </div>
        {['CLIENTE', 'ADMINISTRADOR'].includes(perfil?.rol) && (
          <button style={est.btnAgregar} onClick={() => setModalCita(true)}>
            + Nueva cita
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={est.filtros}>
        {['TODOS', 'PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'].map(estado => (
          <button key={estado}
            style={{
              ...est.filtroBtn,
              background: filtroEstado === estado ? '#6c63ff' : '#f3f4f6',
              color:      filtroEstado === estado ? '#fff'    : '#555',
              fontWeight: filtroEstado === estado ? 700       : 400,
            }}
            onClick={() => setFiltroEstado(estado)}
          >
            {estado === 'TODOS' ? 'Todas' : ESTADO_CONFIG[estado]?.label}
          </button>
        ))}
      </div>

      {/* Cargando */}
      {loading && (
        <div style={est.estadoVacio}>
          <span style={{ fontSize: 40 }}>⏳</span>
          <p style={{ color: '#888' }}>Cargando citas...</p>
        </div>
      )}

      {/* Sin citas */}
      {!loading && citasFiltradas.length === 0 && (
        <div style={est.estadoVacio}>
          <span style={{ fontSize: 64 }}>📅</span>
          <h3 style={{ margin: '12px 0 4px', color: '#333' }}>
            No hay citas {filtroEstado !== 'TODOS' ? `con estado "${filtroEstado}"` : 'aún'}
          </h3>
          <p style={{ color: '#888', margin: '0 0 20px' }}>
            {filtroEstado === 'TODOS' && 'Agenda la primera cita para tu mascota'}
          </p>
          {filtroEstado === 'TODOS' && perfil?.rol === 'CLIENTE' && (
            <button style={est.btnAgregar} onClick={() => setModalCita(true)}>
              + Agendar primera cita
            </button>
          )}
        </div>
      )}

      {/* Lista de citas */}
      {!loading && citasFiltradas.length > 0 && (
        <div style={est.lista}>
          {citasFiltradas.map(cita => {
            const cfg       = ESTADO_CONFIG[cita.estado] ?? ESTADO_CONFIG.PENDIENTE
            const totalCita = (cita.cita_servicio ?? [])
              .reduce((sum, cs) => sum + parseFloat(cs.servicio?.precio ?? 0), 0)

            return (
              <div key={cita.id} style={est.card}>

                {/* Fecha + estado */}
                <div style={est.cardTop}>
                  <div>
                    <p style={est.cardFecha}>{formatFecha(cita.fecha)}</p>
                    <p style={est.cardHora}>🕐 {formatHora(cita.fecha)}</p>
                  </div>
                  <span style={{ ...est.estadoBadge, background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Mascota + groomer */}
                <div style={est.cardInfo}>
                  <div style={est.infoItem}>
                    <span style={est.infoLabel}>Mascota</span>
                    <span style={est.infoValor}>🐾 {cita.mascota?.nombre ?? '—'}</span>
                  </div>
                  <div style={est.infoItem}>
                    <span style={est.infoLabel}>Groomer</span>
                    <span style={est.infoValor}>✂️ {cita.groomer?.nombre ?? 'Sin asignar'}</span>
                  </div>
                </div>

                {/* Motivo cancelación */}
                {cita.estado === 'CANCELADA' && cita.motivo_cancelacion && (
                  <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#c62828' }}>
                    📝 Motivo: {cita.motivo_cancelacion}
                  </div>
                )}

                {/* Servicios */}
                {cita.cita_servicio?.length > 0 && (
                  <div style={est.servicios}>
                    {cita.cita_servicio.map(cs => (
                      <span key={cs.id} style={est.servicioTag}>{cs.servicio?.nombre}</span>
                    ))}
                  </div>
                )}

                {/* Total + acciones */}
                <div style={est.cardFooter}>
                  <span style={est.total}>
                    Total: <strong>Bs. {totalCita.toFixed(2)}</strong>
                  </span>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>

                    {/* Confirmar — groomer/admin */}
                    {['ADMINISTRADOR', 'GROOMER'].includes(perfil?.rol) && cita.estado === 'PENDIENTE' && (
                      <button style={est.btnConfirmar}
                        onClick={() => cambiarEstado(cita.id, 'CONFIRMADA')}>
                        ✅ Confirmar
                      </button>
                    )}

                    {/* Completar — groomer/admin */}
                    {['ADMINISTRADOR', 'GROOMER'].includes(perfil?.rol) && cita.estado === 'CONFIRMADA' && (
                      <button style={est.btnCompletar}
                        onClick={() => cambiarEstado(cita.id, 'COMPLETADA')}>
                        🏁 Completar
                      </button>
                    )}

                    {/* ── FICHA TÉCNICA — groomer/admin en confirmada o completada ── */}
                    {puedeFicha(cita) && (
                      <button
                        style={est.btnFicha}
                        onClick={() => abrirFicha(cita)}
                        disabled={cargandoFicha}
                        title="Abrir ficha técnica del groomer"
                      >
                        {cargandoFicha ? '⏳' : '📋'} Ficha
                      </button>
                    )}

                    {/* Cancelar */}
                    {puedeEditar(cita) && cita.estado !== 'COMPLETADA' && cita.estado !== 'CANCELADA' && (
                      <button style={est.btnCancelar}
                        onClick={() => abrirModalCancelar(cita)}>
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
      {modalCita && (
        <CitaModal
          perfil={perfil}
          onGuardar={crearCita}
          onCerrar={() => setModalCita(false)}
        />
      )}

      {/* ── Modal ficha técnica ─────────────────────────────────── */}
      {modalFicha && citaFicha && (
        <FichaModal
          cita={citaFicha}
          fichaExistente={fichaExistente}
          perfil={perfil}
          onGuardar={{ guardar: guardarFicha, subirFoto }}
          onCerrar={cerrarFicha}
        />
      )}

      {/* ── Modal cancelación ─────────────────────────────────── */}
      {citaCancelar && (
        <div style={est.overlay} onClick={() => setCitaCancelar(null)}>
          <div style={est.modalCancel} onClick={e => e.stopPropagation()}>

            <div style={est.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>
                ❌ Cancelar cita
              </h3>
              <button style={est.btnCerrar} onClick={() => setCitaCancelar(null)}>✕</button>
            </div>

            <div style={est.modalBody}>
              <div style={est.citaInfo}>
                <p style={{ margin: 0, fontSize: 13, color: '#c62828' }}>
                  🐾 <strong>{citaCancelar.mascota?.nombre}</strong> —{' '}
                  {formatFecha(citaCancelar.fecha)} a las {formatHora(citaCancelar.fecha)}
                </p>
              </div>

              <div style={est.campo}>
                <label style={est.label}>
                  Motivo de cancelación <span style={{ color: 'red' }}>*</span>
                </label>
                <select style={est.select} value={motivoCancelacion}
                  onChange={e => setMotivoCancelacion(e.target.value)}>
                  <option value="">-- Selecciona un motivo --</option>
                  <option value="Salud de la mascota">🐾 Salud de la mascota</option>
                  <option value="Emergencia personal">🚨 Emergencia personal</option>
                  <option value="Falta de tiempo">⏰ Falta de tiempo</option>
                  <option value="Reprogramar a otra fecha">📅 Quiero reprogramar</option>
                  <option value="Otro">📝 Otro motivo</option>
                </select>
              </div>

              <div style={est.politicaBox}>
                <input type="checkbox" id="politica"
                  checked={aceptoPolitica}
                  onChange={e => setAceptoPolitica(e.target.checked)}
                  style={{ marginTop: 2, accentColor: '#6c63ff', cursor: 'pointer' }}
                />
                <label htmlFor="politica" style={{ fontSize: 13, color: '#555', lineHeight: 1.5, cursor: 'pointer' }}>
                  Entiendo que las cancelaciones deben realizarse con{' '}
                  <strong>al menos 24 horas de anticipación</strong>.
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button style={est.btnVolver} onClick={() => setCitaCancelar(null)}>Volver</button>
                <button
                  style={{
                    ...est.btnConfirmarCancel,
                    opacity: (!motivoCancelacion || !aceptoPolitica || cancelando) ? 0.5 : 1,
                    cursor:  (!motivoCancelacion || !aceptoPolitica) ? 'not-allowed' : 'pointer',
                  }}
                  onClick={handleCancelar}
                  disabled={!motivoCancelacion || !aceptoPolitica || cancelando}
                >
                  {cancelando ? 'Cancelando...' : 'Confirmar cancelación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const est = {
  encabezado:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  titulo:      { margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' },
  subtitulo:   { margin: 0, color: '#888', fontSize: 14 },
  btnAgregar:  { padding: '10px 20px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  filtros:     { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filtroBtn:   { padding: '6px 14px', border: 'none', borderRadius: 20, fontSize: 13, cursor: 'pointer' },
  estadoVacio: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, textAlign: 'center' },
  lista:       { display: 'flex', flexDirection: 'column', gap: 14 },
  card:        { background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 12 },
  cardTop:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardFecha:   { margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: '#1a1a2e', textTransform: 'capitalize' },
  cardHora:    { margin: 0, fontSize: 13, color: '#888' },
  estadoBadge: { fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, whiteSpace: 'nowrap' },
  cardInfo:    { display: 'flex', gap: 24, padding: '12px 0', borderTop: '1px solid #f5f5f5', borderBottom: '1px solid #f5f5f5' },
  infoItem:    { display: 'flex', flexDirection: 'column', gap: 2 },
  infoLabel:   { fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase' },
  infoValor:   { fontSize: 14, color: '#333', fontWeight: 600 },
  servicios:   { display: 'flex', flexWrap: 'wrap', gap: 6 },
  servicioTag: { fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#f0eeff', color: '#6c63ff' },
  cardFooter:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  total:       { fontSize: 14, color: '#555' },
  btnConfirmar:{ padding: '7px 14px', background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnCompletar:{ padding: '7px 14px', background: '#e8f5e9', color: '#2e7d32', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnCancelar: { padding: '7px 14px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnFicha:    { padding: '7px 14px', background: '#f0eeff', color: '#6c63ff', border: '1px solid #c4b5fd', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  // Modal cancelación
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modalCancel: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalHeader: { padding: '20px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalBody:   { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 },
  btnCerrar:   { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' },
  citaInfo:    { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px' },
  campo:       { display: 'flex', flexDirection: 'column', gap: 6 },
  label:       { fontSize: 13, fontWeight: 600, color: '#444' },
  select:      { padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, color: '#333', background: '#fafafa', fontFamily: 'inherit' },
  politicaBox: { background: '#f8f9ff', border: '1px solid #e5e7ff', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' },
  btnVolver:   { flex: 1, padding: '10px', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnConfirmarCancel: { flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600 },
}
