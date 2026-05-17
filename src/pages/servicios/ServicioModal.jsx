import { useState, useEffect } from 'react'

export default function ServicioModal({ servicio, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    nombre:      '',
    precio:      '',
    duracion:    60,
    descripcion: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (servicio) {
      setForm({
        nombre:      servicio.nombre      ?? '',
        precio:      servicio.precio      ?? '',
        duracion:    servicio.duracion    ?? 60,
        descripcion: servicio.descripcion ?? ''
      })
    }
  }, [servicio])

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async () => {
    if (!form.nombre.trim())  return alert('El nombre es obligatorio')
    if (!form.precio)         return alert('El precio es obligatorio')

    setLoading(true)
    const exito = await onGuardar({
      nombre:      form.nombre.trim(),
      precio:      parseFloat(form.precio),
      duracion:    parseInt(form.duracion),
      descripcion: form.descripcion.trim()
    })
    if (exito) onCerrar()
    setLoading(false)
  }

  return (
    <div style={estilos.overlay} onClick={onCerrar}>
      <div style={estilos.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={estilos.header}>
          <h2 style={estilos.titulo}>
            {servicio ? '✏️ Editar servicio' : '✂️ Nuevo servicio'}
          </h2>
          <button style={estilos.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        {/* Form */}
        <div style={estilos.form}>

          {/* Nombre */}
          <div style={estilos.campo}>
            <label style={estilos.label}>
              Nombre del servicio <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              style={estilos.input}
              name="nombre"
              placeholder="Ej: Baño completo, Corte de pelo..."
              value={form.nombre}
              onChange={handleChange}
              autoFocus
            />
          </div>

          {/* Precio y Duración en la misma fila */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={estilos.campo}>
              <label style={estilos.label}>
                Precio (Bs.) <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                style={estilos.input}
                name="precio"
                type="number"
                min="0"
                step="0.50"
                placeholder="Ej: 80.00"
                value={form.precio}
                onChange={handleChange}
              />
            </div>

            <div style={estilos.campo}>
              <label style={estilos.label}>Duración (minutos)</label>
              <select
                style={estilos.input}
                name="duracion"
                value={form.duracion}
                onChange={handleChange}
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hora</option>
                <option value={90}>1h 30min</option>
                <option value={120}>2 horas</option>
                <option value={180}>3 horas</option>
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div style={estilos.campo}>
            <label style={estilos.label}>Descripción</label>
            <textarea
              style={{ ...estilos.input, resize: 'vertical', minHeight: 80 }}
              name="descripcion"
              placeholder="Describe qué incluye este servicio..."
              value={form.descripcion}
              onChange={handleChange}
            />
          </div>

        </div>

        {/* Footer */}
        <div style={estilos.footer}>
          <button style={estilos.btnCancelar} onClick={onCerrar}>
            Cancelar
          </button>
          <button
            style={{ ...estilos.btnGuardar, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? 'Guardando...'
              : servicio ? 'Guardar cambios' : 'Crear servicio'}
          </button>
        </div>

      </div>
    </div>
  )
}

const estilos = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #f0f0f0',
  },
  titulo: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  btnCerrar: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#999',
    padding: 4,
  },
  form: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  campo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#444',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1.5px solid #e5e7eb',
    fontSize: 14,
    outline: 'none',
    background: '#fafafa',
    color: '#333',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  },
  footer: {
    display: 'flex',
    gap: 10,
    padding: '16px 24px',
    borderTop: '1px solid #f0f0f0',
    justifyContent: 'flex-end',
  },
  btnCancelar: {
    padding: '10px 20px',
    background: '#f3f4f6',
    color: '#555',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnGuardar: {
    padding: '10px 24px',
    background: '#6c63ff',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}