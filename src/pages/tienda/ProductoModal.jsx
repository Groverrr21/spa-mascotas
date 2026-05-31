import { useState, useEffect } from 'react'

const CATEGORIAS = ['HIGIENE', 'ACCESORIOS', 'MEDICAMENTOS', 'SNACKS', 'JUGUETES', 'OTROS']

const COLOR_CAT = {
  HIGIENE:      { bg: '#e3f2fd', color: '#1565c0', icono: '🧴' },
  ACCESORIOS:   { bg: '#f3e5f5', color: '#6a1b9a', icono: '🎀' },
  MEDICAMENTOS: { bg: '#fce4ec', color: '#c62828', icono: '💊' },
  SNACKS:       { bg: '#fff3e0', color: '#e65100', icono: '🦴' },
  JUGUETES:     { bg: '#e8f5e9', color: '#2e7d32', icono: '🎾' },
  OTROS:        { bg: '#f5f5f5', color: '#555555', icono: '📦' },
}

export default function ProductoModal({ producto, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    nombre:      '',
    descripcion: '',
    precio:      '',
    stock:       0,
    categoria:   'HIGIENE',
    imagen_url:  '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (producto) {
      setForm({
        nombre:      producto.nombre      ?? '',
        descripcion: producto.descripcion ?? '',
        precio:      producto.precio      ?? '',
        stock:       producto.stock       ?? 0,
        categoria:   producto.categoria   ?? 'HIGIENE',
        imagen_url:  producto.imagen_url  ?? '',
      })
    }
  }, [producto])

  const set = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    if (!form.precio || parseFloat(form.precio) <= 0) return alert('El precio debe ser mayor a 0')

    setLoading(true)
    const exito = await onGuardar({
      nombre:      form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      precio:      parseFloat(form.precio),
      stock:       parseInt(form.stock),
      categoria:   form.categoria,
      imagen_url:  form.imagen_url.trim() || null,
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
            {producto ? '✏️ Editar producto' : '🛍️ Nuevo producto'}
          </h2>
          <button style={s.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        <div style={s.body}>

          {/* Nombre */}
          <div style={s.campo}>
            <label style={s.label}>Nombre <span style={{ color: 'red' }}>*</span></label>
            <input style={s.input} name="nombre"
              placeholder="Ej: Shampoo antipulgas, Collar reflectante..."
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
                    {c.icono} {cat}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Precio y Stock */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={s.campo}>
              <label style={s.label}>Precio (Bs.) <span style={{ color: 'red' }}>*</span></label>
              <input style={s.input} name="precio" type="number"
                min="0" step="0.50" placeholder="0.00"
                value={form.precio} onChange={set} />
            </div>
            <div style={s.campo}>
              <label style={s.label}>Stock disponible</label>
              <input style={s.input} name="stock" type="number"
                min="0" step="1"
                value={form.stock} onChange={set} />
            </div>
          </div>

          {/* Descripción */}
          <div style={s.campo}>
            <label style={s.label}>Descripción</label>
            <textarea
              style={{ ...s.input, resize: 'vertical', minHeight: 72 }}
              name="descripcion"
              placeholder="Describe el producto, para qué sirve, contenido..."
              value={form.descripcion} onChange={set} />
          </div>

          {/* URL de imagen */}
          <div style={s.campo}>
            <label style={s.label}>URL de imagen (opcional)</label>
            <input style={s.input} name="imagen_url"
              placeholder="https://... (link de la imagen del producto)"
              value={form.imagen_url} onChange={set} />
          </div>

          {/* Preview */}
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: colores.bg, border: `1px solid ${colores.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{colores.icono}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: colores.color }}>
                  {form.nombre || 'Sin nombre'}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: colores.color }}>
                  {form.categoria} · Stock: {form.stock}
                </p>
              </div>
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: colores.color }}>
              {form.precio ? `Bs. ${parseFloat(form.precio).toFixed(2)}` : 'Bs. —'}
            </span>
          </div>

        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button style={s.btnCancelar} onClick={onCerrar}>Cancelar</button>
          <button
            style={{ ...s.btnGuardar, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit} disabled={loading}
          >
            {loading ? 'Guardando...' : producto ? 'Guardar cambios' : '✅ Crear producto'}
          </button>
        </div>

      </div>
    </div>
  )
}

const s = {
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal:      { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  header:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 },
  titulo:     { margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a2e' },
  btnCerrar:  { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' },
  body:       { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 },
  campo:      { display: 'flex', flexDirection: 'column', gap: 6 },
  label:      { fontSize: 13, fontWeight: 600, color: '#444' },
  input:      { padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fafafa', color: '#333', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  footer:     { display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid #f0f0f0', justifyContent: 'flex-end', flexShrink: 0 },
  btnCancelar:{ padding: '10px 20px', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnGuardar: { padding: '10px 24px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}
