import { useState, useEffect } from 'react'

const CATEGORIAS = ['HIGIENE', 'HERRAMIENTAS', 'MEDICAMENTOS', 'ACCESORIOS', 'LIMPIEZA', 'OTROS']
const UNIDADES   = ['unidad', 'ml', 'litro', 'gr', 'kg', 'rollo', 'par', 'caja']

const COLOR_CAT = {
  HIGIENE:       { bg: '#e3f2fd', color: '#1565c0' },
  HERRAMIENTAS:  { bg: '#fff3e0', color: '#e65100' },
  MEDICAMENTOS:  { bg: '#fce4ec', color: '#c62828' },
  ACCESORIOS:    { bg: '#f3e5f5', color: '#6a1b9a' },
  LIMPIEZA:      { bg: '#e8f5e9', color: '#2e7d32' },
  OTROS:         { bg: '#f5f5f5', color: '#555'    },
}

export default function InsumoModal({ insumo, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    nombre:          '',
    categoria:       'HIGIENE',
    unidad:          'unidad',
    stock:           0,
    stock_minimo:    5,
    precio_unitario: 0,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (insumo) {
      setForm({
        nombre:          insumo.nombre          ?? '',
        categoria:       insumo.categoria       ?? 'HIGIENE',
        unidad:          insumo.unidad          ?? 'unidad',
        stock:           insumo.stock           ?? 0,
        stock_minimo:    insumo.stock_minimo    ?? 5,
        precio_unitario: insumo.precio_unitario ?? 0,
      })
    }
  }, [insumo])

  const set = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    if (parseFloat(form.precio_unitario) < 0) return alert('El precio no puede ser negativo')

    setLoading(true)
    const exito = await onGuardar({
      nombre:          form.nombre.trim(),
      categoria:       form.categoria,
      unidad:          form.unidad,
      stock:           parseFloat(form.stock),
      stock_minimo:    parseFloat(form.stock_minimo),
      precio_unitario: parseFloat(form.precio_unitario),
    })
    if (exito) onCerrar()
    setLoading(false)
  }

  const colores = COLOR_CAT[form.categoria] ?? COLOR_CAT.OTROS

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <h2 style={s.titulo}>
            {insumo ? '✏️ Editar insumo' : '📦 Nuevo insumo'}
          </h2>
          <button style={s.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        <div style={s.body}>

          {/* Nombre */}
          <div style={s.campo}>
            <label style={s.label}>Nombre <span style={{ color: 'red' }}>*</span></label>
            <input style={s.input} name="nombre" placeholder="Ej: Shampoo para perros, Tijeras..."
              value={form.nombre} onChange={set} autoFocus />
          </div>

          {/* Categoría */}
          <div style={s.campo}>
            <label style={s.label}>Categoría</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIAS.map(cat => {
                const c = COLOR_CAT[cat]
                const activo = form.categoria === cat
                return (
                  <button key={cat} type="button"
                    style={{
                      padding: '6px 14px', borderRadius: 20,
                      border: `2px solid ${activo ? c.color : '#e5e7eb'}`,
                      background: activo ? c.bg : '#fafafa',
                      color: activo ? c.color : '#888',
                      fontWeight: activo ? 700 : 400,
                      fontSize: 12, cursor: 'pointer',
                    }}
                    onClick={() => setForm(p => ({ ...p, categoria: cat }))}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Unidad + Stock mínimo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={s.campo}>
              <label style={s.label}>Unidad de medida</label>
              <select style={s.input} name="unidad" value={form.unidad} onChange={set}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div style={s.campo}>
              <label style={s.label}>Stock mínimo (alerta)</label>
              <input style={s.input} name="stock_minimo" type="number" min="0" step="1"
                value={form.stock_minimo} onChange={set} />
            </div>
          </div>

          {/* Stock inicial + Precio */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={s.campo}>
              <label style={s.label}>
                {insumo ? 'Stock actual' : 'Stock inicial'}
              </label>
              <input style={s.input} name="stock" type="number" min="0" step="1"
                value={form.stock} onChange={set} />
            </div>
            <div style={s.campo}>
              <label style={s.label}>Precio unitario (Bs.)</label>
              <input style={s.input} name="precio_unitario" type="number" min="0" step="0.5"
                value={form.precio_unitario} onChange={set} />
            </div>
          </div>

          {/* Resumen */}
          <div style={{ ...s.resumenBox, borderColor: colores.color + '40', background: colores.bg }}>
            <span style={{ fontSize: 13, color: colores.color, fontWeight: 600 }}>
              {form.nombre || 'Sin nombre'} · {form.categoria} · {form.unidad}
            </span>
            <span style={{ fontSize: 13, color: colores.color, fontWeight: 700 }}>
              Stock: {form.stock} {form.unidad} · Valor: Bs. {(parseFloat(form.stock||0) * parseFloat(form.precio_unitario||0)).toFixed(2)}
            </span>
          </div>

        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button style={s.btnCancelar} onClick={onCerrar}>Cancelar</button>
          <button style={{ ...s.btnGuardar, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : insumo ? 'Guardar cambios' : '✅ Crear insumo'}
          </button>
        </div>

      </div>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 },
  titulo: { margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a2e' },
  btnCerrar: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' },
  body: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 },
  campo: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#444' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fafafa', color: '#333', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  resumenBox: { padding: '12px 16px', borderRadius: 10, border: '1.5px solid', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  footer: { display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid #f0f0f0', justifyContent: 'flex-end', flexShrink: 0 },
  btnCancelar: { padding: '10px 20px', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnGuardar: { padding: '10px 24px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}
