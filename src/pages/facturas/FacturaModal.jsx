import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

function formatFecha(f) {
  return new Date(f).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

export default function FacturaModal({ citasSinFactura, onGuardar, onCerrar }) {
  const { perfil } = useAuth()
  const [citaSeleccionada, setCitaSeleccionada] = useState(null)
  const [descuento,  setDescuento]  = useState(0)
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)

  // Calcular subtotal de la cita seleccionada
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
        id_cajero:     perfil.id,  // ← usa el id del usuario logueado
        total:         totalFinal,
        descuento:     parseFloat(descuento || 0),
        observaciones: observaciones.trim(),
        fecha_emision: new Date().toISOString()
    })
    if (exito) onCerrar()
    setLoading(false)
    }

  return (
    <div style={estilos.overlay} onClick={onCerrar}>
      <div style={estilos.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={estilos.header}>
          <h2 style={estilos.titulo}>🧾 Nueva factura</h2>
          <button style={estilos.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        <div style={estilos.body}>

          {/* Seleccionar cita */}
          <div style={estilos.campo}>
            <label style={estilos.label}>
              Cita completada <span style={{ color: 'red' }}>*</span>
            </label>
            {citasSinFactura.length === 0 ? (
              <div style={estilos.sinCitas}>
                <span style={{ fontSize: 32 }}>📭</span>
                <p style={{ margin: '8px 0 0', color: '#888', fontSize: 14 }}>
                  No hay citas completadas sin factura
                </p>
              </div>
            ) : (
              <select
                style={estilos.input}
                onChange={handleSeleccionarCita}
                defaultValue=""
              >
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
              <div style={estilos.detalleBox}>
                <p style={estilos.detalleLabel}>SERVICIOS INCLUIDOS</p>
                {citaSeleccionada.cita_servicio.map((cs, i) => (
                  <div key={i} style={estilos.detalleRow}>
                    <span style={{ color: '#444', fontSize: 14 }}>
                      ✂️ {cs.servicio?.nombre}
                    </span>
                    <span style={{ fontWeight: 600, color: '#333', fontSize: 14 }}>
                      Bs. {parseFloat(cs.servicio?.precio ?? 0).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div style={estilos.subtotalRow}>
                  <span>Subtotal</span>
                  <span>Bs. {subtotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Descuento */}
              <div style={estilos.campo}>
                <label style={estilos.label}>Descuento (Bs.)</label>
                <input
                  style={estilos.input}
                  type="number"
                  min="0"
                  max={subtotal}
                  step="0.50"
                  placeholder="0.00"
                  value={descuento}
                  onChange={e => setDescuento(e.target.value)}
                />
              </div>

              {/* Observaciones */}
              <div style={estilos.campo}>
                <label style={estilos.label}>Observaciones</label>
                <textarea
                  style={{ ...estilos.input, resize: 'vertical', minHeight: 70 }}
                  placeholder="Notas adicionales sobre el pago..."
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                />
              </div>

              {/* Total final */}
              <div style={estilos.totalBox}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
                    TOTAL A COBRAR
                  </p>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#6c63ff' }}>
                    Bs. {totalFinal.toFixed(2)}
                  </p>
                </div>
                {parseFloat(descuento) > 0 && (
                  <span style={estilos.descuentoBadge}>
                    🎉 Descuento: Bs. {parseFloat(descuento).toFixed(2)}
                  </span>
                )}
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div style={estilos.footer}>
          <button style={estilos.btnCancelar} onClick={onCerrar}>
            Cancelar
          </button>
          <button
            style={{
              ...estilos.btnGuardar,
              opacity: (loading || !citaSeleccionada) ? 0.6 : 1,
              cursor: !citaSeleccionada ? 'not-allowed' : 'pointer'
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

const estilos = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000, padding: 16,
  },
  modal: {
    background: '#fff', borderRadius: 16,
    width: '100%', maxWidth: 500,
    maxHeight: '90vh', display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  titulo: { margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a2e' },
  btnCerrar: {
    background: 'none', border: 'none',
    fontSize: 18, cursor: 'pointer', color: '#999',
  },
  body: {
    padding: '20px 24px',
    display: 'flex', flexDirection: 'column',
    gap: 16, overflowY: 'auto', flex: 1,
  },
  campo: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#444' },
  input: {
    padding: '10px 12px', borderRadius: 8,
    border: '1.5px solid #e5e7eb', fontSize: 14,
    outline: 'none', background: '#fafafa',
    color: '#333', fontFamily: 'inherit',
    width: '100%', boxSizing: 'border-box',
  },
  sinCitas: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '20px',
    background: '#fafafa', borderRadius: 10,
    border: '1.5px dashed #e5e7eb',
  },
  detalleBox: {
    background: '#fafafe',
    border: '1px solid #ede9fe',
    borderRadius: 10, padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  detalleLabel: {
    margin: '0 0 4px', fontSize: 10,
    fontWeight: 700, color: '#6c63ff',
    letterSpacing: 1,
  },
  detalleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
  },
  subtotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 700, color: '#333',
    fontSize: 14,
    paddingTop: 8,
    borderTop: '1px solid #ede9fe',
    marginTop: 4,
  },
  totalBox: {
    background: 'linear-gradient(135deg, #6c63ff11, #a78bfa11)',
    border: '1.5px solid #ede9fe',
    borderRadius: 12, padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  descuentoBadge: {
    background: '#e8f5e9', color: '#2e7d32',
    fontSize: 12, fontWeight: 600,
    padding: '6px 12px', borderRadius: 20,
  },
  footer: {
    display: 'flex', gap: 10,
    padding: '16px 24px',
    borderTop: '1px solid #f0f0f0',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  btnCancelar: {
    padding: '10px 20px', background: '#f3f4f6',
    color: '#555', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  btnGuardar: {
    padding: '10px 24px', background: '#6c63ff',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600,
  },
}