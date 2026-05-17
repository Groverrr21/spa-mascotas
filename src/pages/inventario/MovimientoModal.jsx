import { useState } from 'react'

const TIPO_CONFIG = {
  ENTRADA:    { icono: '📦', color: '#2e7d32', bg: '#e8f5e9', label: 'Entrada de stock',    desc: 'Agregar unidades al inventario (compra, reposición)' },
  SALIDA:     { icono: '📤', color: '#1565c0', bg: '#e3f2fd', label: 'Salida para servicio', desc: 'Retirar insumos para usar en un servicio' },
  MERMA:      { icono: '⚠️', color: '#c62828', bg: '#ffebee', label: 'Merma / pérdida',     desc: 'Insumos dañados, vencidos o desperdiciados' },
  DEVOLUCION: { icono: '↩️', color: '#e65100', bg: '#fff3e0', label: 'Devolución',          desc: 'Devolver insumos no utilizados al inventario' },
}

export default function MovimientoModal({ insumo, perfil, onGuardar, onCerrar }) {
  const esAdmin = perfil?.rol === 'ADMINISTRADOR'

  // Admin puede hacer todo; groomer solo SALIDA y DEVOLUCION
  const tiposDisponibles = esAdmin
    ? Object.keys(TIPO_CONFIG)
    : ['SALIDA', 'DEVOLUCION']

  const [tipo,       setTipo]       = useState(tiposDisponibles[0])
  const [cantidad,   setCantidad]   = useState('')
  const [observacion,setObservacion]= useState('')
  const [loading,    setLoading]    = useState(false)

  const cfg = TIPO_CONFIG[tipo]
  const stockActual = parseFloat(insumo.stock)
  const cant = parseFloat(cantidad || 0)
  const stockResultante = tipo === 'ENTRADA' || tipo === 'DEVOLUCION'
    ? stockActual + cant
    : stockActual - cant

  const stockInsuficiente = (tipo === 'SALIDA' || tipo === 'MERMA') && cant > stockActual

  const handleSubmit = async () => {
    if (!cantidad || cant <= 0) return alert('Ingresa una cantidad válida')
    if (stockInsuficiente) return alert('No hay suficiente stock para esta operación')

    setLoading(true)
    const exito = await onGuardar({
      id_insumo:      insumo.id,
      id_responsable: perfil?.id ?? null,
      id_cita:        null,
      tipo,
      cantidad:       cant,
      observacion:    observacion.trim() || null,
    })
    if (exito) onCerrar()
    setLoading(false)
  }

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <h2 style={s.titulo}>Registrar movimiento</h2>
            <p style={s.subtitulo}>
              📦 {insumo.nombre}
              <span style={{ color: '#888', marginLeft: 8 }}>
                · Stock actual: <strong>{stockActual} {insumo.unidad}</strong>
              </span>
            </p>
          </div>
          <button style={s.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        <div style={s.body}>

          {/* Selector de tipo */}
          <div style={s.campo}>
            <label style={s.label}>Tipo de movimiento</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tiposDisponibles.map(t => {
                const c = TIPO_CONFIG[t]
                const activo = tipo === t
                return (
                  <button key={t} type="button"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 10,
                      border: `2px solid ${activo ? c.color : '#e5e7eb'}`,
                      background: activo ? c.bg : '#fafafa',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                    onClick={() => setTipo(t)}
                  >
                    <span style={{ fontSize: 22 }}>{c.icono}</span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: activo ? c.color : '#333' }}>
                        {c.label}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: '#888' }}>{c.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cantidad */}
          <div style={s.campo}>
            <label style={s.label}>
              Cantidad ({insumo.unidad}) <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              style={{
                ...s.input,
                borderColor: stockInsuficiente ? '#e53e3e' : '#e5e7eb',
              }}
              type="number" min="0.5" step="0.5"
              placeholder={`Ej: 2 ${insumo.unidad}`}
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
            />
            {stockInsuficiente && (
              <p style={{ margin: 0, fontSize: 12, color: '#e53e3e' }}>
                ❌ No hay suficiente stock (disponible: {stockActual} {insumo.unidad})
              </p>
            )}
          </div>

          {/* Observación */}
          <div style={s.campo}>
            <label style={s.label}>Observación (opcional)</label>
            <textarea
              style={{ ...s.input, resize: 'vertical', minHeight: 64 }}
              placeholder={
                tipo === 'ENTRADA'    ? 'Ej: Compra en Farmacia X, lote #123...' :
                tipo === 'SALIDA'     ? 'Ej: Usado en cita de Max (Labrador)...' :
                tipo === 'MERMA'      ? 'Ej: Frasco roto, producto vencido...'   :
                'Ej: Sin usar, sobrante del servicio...'
              }
              value={observacion}
              onChange={e => setObservacion(e.target.value)}
            />
          </div>

          {/* Preview del resultado */}
          {cant > 0 && (
            <div style={{
              padding: '12px 16px', borderRadius: 10,
              background: cfg.bg, border: `1.5px solid ${cfg.color}40`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 12, color: '#888' }}>STOCK RESULTANTE</p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: cfg.color }}>
                  {stockResultante.toFixed(1)} {insumo.unidad}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#888' }}>{cfg.icono} {cfg.label}</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: cfg.color }}>
                  {tipo === 'ENTRADA' || tipo === 'DEVOLUCION' ? '+' : '-'}{cant} {insumo.unidad}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button style={s.btnCancelar} onClick={onCerrar}>Cancelar</button>
          <button
            style={{
              ...s.btnGuardar,
              background: cfg.color,
              opacity: (loading || stockInsuficiente || !cantidad) ? 0.6 : 1,
              cursor: stockInsuficiente ? 'not-allowed' : 'pointer',
            }}
            onClick={handleSubmit}
            disabled={loading || stockInsuficiente || !cantidad}
          >
            {loading ? 'Registrando...' : `${cfg.icono} Confirmar ${cfg.label.toLowerCase()}`}
          </button>
        </div>

      </div>
    </div>
  )
}

const s = {
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal:      { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  header:     { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '20px 24px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 },
  titulo:     { margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1a1a2e' },
  subtitulo:  { margin: 0, fontSize: 13, color: '#555' },
  btnCerrar:  { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999', flexShrink: 0 },
  body:       { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 },
  campo:      { display: 'flex', flexDirection: 'column', gap: 6 },
  label:      { fontSize: 13, fontWeight: 600, color: '#444' },
  input:      { padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fafafa', color: '#333', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  footer:     { display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid #f0f0f0', justifyContent: 'flex-end', flexShrink: 0 },
  btnCancelar:{ padding: '10px 20px', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnGuardar: { padding: '10px 20px', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600 },
}
