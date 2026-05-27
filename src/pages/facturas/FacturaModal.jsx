import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

function formatFecha(f) {
  return new Date(f).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

const METODOS_PAGO = [
  {
    valor: 'EFECTIVO',
    icono: '💵',
    label: 'Efectivo',
    desc: 'Pago en billetes y monedas',
    bg: '#e8f5e9', color: '#2e7d32',
  },
  {
    valor: 'QR',
    icono: '📱',
    label: 'QR',
    desc: 'Pago escaneando código QR',
    bg: '#e3f2fd', color: '#1565c0',
  },
  {
    valor: 'TRANSFERENCIA',
    icono: '🏦',
    label: 'Transferencia',
    desc: 'Transferencia bancaria',
    bg: '#f3e5f5', color: '#6a1b9a',
  },
]

export default function FacturaModal({ citasSinFactura, onGuardar, onCerrar }) {
  const { perfil } = useAuth()
  const [citaSeleccionada, setCitaSeleccionada] = useState(null)
  const [descuento,        setDescuento]        = useState(0)
  const [observaciones,    setObservaciones]    = useState('')
  const [metodoPago,       setMetodoPago]       = useState('EFECTIVO')
  const [loading,          setLoading]          = useState(false)

  const subtotal = (citaSeleccionada?.cita_servicio ?? [])
    .reduce((sum, cs) => sum + parseFloat(cs.servicio?.precio ?? 0), 0)

  const totalFinal = Math.max(0, subtotal - parseFloat(descuento || 0))

  const handleSeleccionarCita = (e) => {
    const id = e.target.value
    const cita = citasSinFactura.find(c => c.id === id)
    setCitaSeleccionada(cita ?? null)
    setDescuento(0)
  }

  const handleSubmit = async () => {
    if (!citaSeleccionada) return alert('Selecciona una cita')

    setLoading(true)
    const exito = await onGuardar({
      id_cita:       citaSeleccionada.id,
      id_cajero:     perfil.id,
      total:         totalFinal,
      descuento:     parseFloat(descuento || 0),
      observaciones: observaciones.trim(),
      metodo_pago:   metodoPago,
      fecha_emision: new Date().toISOString(),
    })
    if (exito) onCerrar()
    setLoading(false)
  }

  const cfgMetodo = METODOS_PAGO.find(m => m.valor === metodoPago)

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <h2 style={s.titulo}>🧾 Nueva factura</h2>
          <button style={s.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        <div style={s.body}>

          {/* Seleccionar cita */}
          <div style={s.campo}>
            <label style={s.label}>
              Cita completada <span style={{ color: 'red' }}>*</span>
            </label>
            {citasSinFactura.length === 0 ? (
              <div style={s.sinCitas}>
                <span style={{ fontSize: 32 }}>📭</span>
                <p style={{ margin: '8px 0 0', color: '#888', fontSize: 14 }}>
                  No hay citas completadas sin factura
                </p>
              </div>
            ) : (
              <select style={s.input} onChange={handleSeleccionarCita} defaultValue="">
                <option value="" disabled>-- Selecciona una cita --</option>
                {citasSinFactura.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.mascota?.nombre} — {formatFecha(c.fecha)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Detalle de la cita seleccionada */}
          {citaSeleccionada && (
            <>
              <div style={s.detalleBox}>
                <p style={s.detalleLabel}>SERVICIOS INCLUIDOS</p>
                {citaSeleccionada.cita_servicio.map((cs, i) => (
                  <div key={i} style={s.detalleRow}>
                    <span style={{ color: '#444', fontSize: 14 }}>
                      ✂️ {cs.servicio?.nombre}
                    </span>
                    <span style={{ fontWeight: 600, color: '#333', fontSize: 14 }}>
                      Bs. {parseFloat(cs.servicio?.precio ?? 0).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div style={s.subtotalRow}>
                  <span>Subtotal</span>
                  <span>Bs. {subtotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Descuento */}
              <div style={s.campo}>
                <label style={s.label}>Descuento (Bs.)</label>
                <input style={s.input} type="number" min="0" max={subtotal}
                  step="0.50" placeholder="0.00"
                  value={descuento}
                  onChange={e => setDescuento(e.target.value)} />
              </div>

              {/* ── MÉTODO DE PAGO ── */}
              <div style={s.campo}>
                <label style={s.label}>
                  Método de pago <span style={{ color: 'red' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {METODOS_PAGO.map(m => {
                    const activo = metodoPago === m.valor
                    return (
                      <button key={m.valor} type="button"
                        onClick={() => setMetodoPago(m.valor)}
                        style={{
                          padding: '12px 8px',
                          borderRadius: 10,
                          border: `2px solid ${activo ? m.color : '#e5e7eb'}`,
                          background: activo ? m.bg : '#fafafa',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{m.icono}</div>
                        <div style={{
                          fontWeight: 700, fontSize: 13,
                          color: activo ? m.color : '#333',
                        }}>
                          {m.label}
                        </div>
                        <div style={{ fontSize: 10, color: activo ? m.color : '#999', marginTop: 2 }}>
                          {m.desc}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Badge método seleccionado */}
                <div style={{
                  marginTop: 8, padding: '8px 12px', borderRadius: 8,
                  background: cfgMetodo.bg,
                  border: `1px solid ${cfgMetodo.color}30`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 18 }}>{cfgMetodo.icono}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: cfgMetodo.color }}>
                    Método seleccionado: {cfgMetodo.label} — {cfgMetodo.desc}
                  </span>
                </div>
              </div>

              {/* Observaciones */}
              <div style={s.campo}>
                <label style={s.label}>Observaciones</label>
                <textarea
                  style={{ ...s.input, resize: 'vertical', minHeight: 70 }}
                  placeholder="Notas adicionales sobre el pago..."
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)} />
              </div>

              {/* Total final */}
              <div style={s.totalBox}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: '#888' }}>TOTAL A COBRAR</p>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#6c63ff' }}>
                    Bs. {totalFinal.toFixed(2)}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: cfgMetodo.color, fontWeight: 600 }}>
                    {cfgMetodo.icono} Pago por {cfgMetodo.label}
                  </p>
                </div>
                {parseFloat(descuento) > 0 && (
                  <span style={s.descuentoBadge}>
                    🎉 Descuento: Bs. {parseFloat(descuento).toFixed(2)}
                  </span>
                )}
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button style={s.btnCancelar} onClick={onCerrar}>Cancelar</button>
          <button
            style={{
              ...s.btnGuardar,
              opacity: (loading || !citaSeleccionada) ? 0.6 : 1,
              cursor:  !citaSeleccionada ? 'not-allowed' : 'pointer',
            }}
            onClick={handleSubmit}
            disabled={loading || !citaSeleccionada}
          >
            {loading ? 'Emitiendo...' : '🧾 Emitir factura'}
          </button>
        </div>

      </div>
    </div>
  )
}

const s = {
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal:        { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  header:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 },
  titulo:       { margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a2e' },
  btnCerrar:    { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' },
  body:         { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 },
  campo:        { display: 'flex', flexDirection: 'column', gap: 6 },
  label:        { fontSize: 13, fontWeight: 600, color: '#444' },
  input:        { padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fafafa', color: '#333', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  sinCitas:     { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', background: '#fafafa', borderRadius: 10, border: '1.5px dashed #e5e7eb' },
  detalleBox:   { background: '#fafafe', border: '1px solid #ede9fe', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 },
  detalleLabel: { margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#6c63ff', letterSpacing: 1 },
  detalleRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' },
  subtotalRow:  { display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#333', fontSize: 14, paddingTop: 8, borderTop: '1px solid #ede9fe', marginTop: 4 },
  totalBox:     { background: 'linear-gradient(135deg, #6c63ff11, #a78bfa11)', border: '1.5px solid #ede9fe', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  descuentoBadge: { background: '#e8f5e9', color: '#2e7d32', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 20 },
  footer:       { display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid #f0f0f0', justifyContent: 'flex-end', flexShrink: 0 },
  btnCancelar:  { padding: '10px 20px', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnGuardar:   { padding: '10px 24px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600 },
}
