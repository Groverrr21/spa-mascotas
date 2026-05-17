import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function CitaModal({ perfil, onGuardar, onCerrar }) {
  const [mascotas,  setMascotas]  = useState([])
  const [groomers,  setGroomers]  = useState([])
  const [servicios, setServicios] = useState([])
  const [loading,   setLoading]   = useState(false)

  const [form, setForm] = useState({
    id_mascota:  '',
    id_groomer:  '',
    fecha:       '',
    hora:        '',
  })
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([])

  // Cargar datos necesarios para el formulario
  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    // Mascotas del cliente
    const { data: m } = await supabase
      .from('mascota')
      .select('id, nombre, raza')
      .eq('id_cliente', perfil.id)

    // Groomers disponibles (join con usuario para el nombre)
    const { data: g } = await supabase
      .from('groomer')
      .select('id, especialidad, usuario:usuario!groomer_id_fkey(nombre)')

    // Servicios disponibles
    const { data: s } = await supabase
      .from('servicio')
      .select('id, nombre, precio, duracion')
      .order('nombre')

    setMascotas(m ?? [])
    setGroomers(g ?? [])
    setServicios(s ?? [])
  }

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // Agregar o quitar servicio de la selección
  const toggleServicio = (id) => {
    setServiciosSeleccionados(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id]
    )
  }

  // Calcular total de servicios seleccionados
  const totalServicios = servicios
    .filter(s => serviciosSeleccionados.includes(s.id))
    .reduce((sum, s) => sum + parseFloat(s.precio), 0)

  const handleSubmit = async () => {
    if (!form.id_mascota) return alert('Selecciona una mascota')
    if (!form.fecha)      return alert('Selecciona una fecha')
    if (!form.hora)       return alert('Selecciona una hora')
    if (serviciosSeleccionados.length === 0)
      return alert('Selecciona al menos un servicio')

    setLoading(true)

    const fechaCompleta = new Date(`${form.fecha}T${form.hora}:00`)

    const datosCita = {
      id_mascota: form.id_mascota,
      id_groomer: form.id_groomer || null,
      fecha:      fechaCompleta.toISOString(),
      estado:     'PENDIENTE'
    }

    const exito = await onGuardar(datosCita, serviciosSeleccionados)
    if (exito) onCerrar()
    setLoading(false)
  }

  // Fecha mínima = hoy
  const hoy = new Date().toISOString().split('T')[0]

  return (
    <div style={estilos.overlay} onClick={onCerrar}>
      <div style={estilos.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={estilos.header}>
          <h2 style={estilos.titulo}>📅 Nueva cita</h2>
          <button style={estilos.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        <div style={estilos.body}>

          {/* Mascota */}
          <div style={estilos.campo}>
            <label style={estilos.label}>
              Mascota <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              style={estilos.input}
              name="id_mascota"
              value={form.id_mascota}
              onChange={handleChange}
            >
              <option value="">-- Selecciona una mascota --</option>
              {mascotas.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nombre} {m.raza ? `(${m.raza})` : ''}
                </option>
              ))}
            </select>
            {mascotas.length === 0 && (
              <p style={{ color: '#e53e3e', fontSize: 12, margin: '4px 0 0' }}>
                ⚠️ No tienes mascotas registradas.{' '}
                <a href="/mascotas" style={{ color: '#6c63ff' }}>
                  Registra una aquí
                </a>
              </p>
            )}
          </div>

          {/* Fecha y Hora */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={estilos.campo}>
              <label style={estilos.label}>
                Fecha <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                style={estilos.input}
                type="date"
                name="fecha"
                min={hoy}
                value={form.fecha}
                onChange={handleChange}
              />
            </div>
            <div style={estilos.campo}>
              <label style={estilos.label}>
                Hora <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                style={estilos.input}
                type="time"
                name="hora"
                min="08:00"
                max="18:00"
                value={form.hora}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Groomer */}
          <div style={estilos.campo}>
            <label style={estilos.label}>Groomer (opcional)</label>
            <select
              style={estilos.input}
              name="id_groomer"
              value={form.id_groomer}
              onChange={handleChange}
            >
              <option value="">-- Sin preferencia --</option>
              {groomers.map(g => (
                <option key={g.id} value={g.id}>
                  {g.usuario?.nombre ?? 'Groomer'}
                  {g.especialidad ? ` — ${g.especialidad}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Servicios */}
          <div style={estilos.campo}>
            <label style={estilos.label}>
              Servicios <span style={{ color: 'red' }}>*</span>
            </label>
            <div style={estilos.serviciosGrid}>
              {servicios.map(s => {
                const seleccionado = serviciosSeleccionados.includes(s.id)
                return (
                  <div
                    key={s.id}
                    style={{
                      ...estilos.servicioItem,
                      border: seleccionado
                        ? '2px solid #6c63ff'
                        : '2px solid #e5e7eb',
                      background: seleccionado ? '#f0eeff' : '#fafafa',
                    }}
                    onClick={() => toggleServicio(s.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{
                        fontWeight: 600,
                        color: seleccionado ? '#6c63ff' : '#333',
                        fontSize: 13
                      }}>
                        {seleccionado ? '✅ ' : ''}{s.nombre}
                      </span>
                      <span style={{
                        fontWeight: 700,
                        color: '#6c63ff',
                        fontSize: 13
                      }}>
                        Bs. {parseFloat(s.precio).toFixed(2)}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#999' }}>
                      ⏱ {s.duracion} min
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Total */}
          {serviciosSeleccionados.length > 0 && (
            <div style={estilos.totalBox}>
              <span style={{ color: '#666', fontSize: 14 }}>
                {serviciosSeleccionados.length} servicio
                {serviciosSeleccionados.length > 1 ? 's' : ''} seleccionado
                {serviciosSeleccionados.length > 1 ? 's' : ''}
              </span>
              <span style={{ fontWeight: 700, fontSize: 18, color: '#6c63ff' }}>
                Total: Bs. {totalServicios.toFixed(2)}
              </span>
            </div>
          )}

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
            {loading ? 'Agendando...' : 'Confirmar cita'}
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
    width: '100%', maxWidth: 520,
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
    display: 'flex', flexDirection: 'column', gap: 14,
    overflowY: 'auto', flex: 1,
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
  serviciosGrid: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  servicioItem: {
    padding: '10px 14px', borderRadius: 8,
    cursor: 'pointer', display: 'flex',
    flexDirection: 'column', gap: 2,
    transition: 'all 0.15s',
  },
  totalBox: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center',
    background: '#f0eeff', borderRadius: 10,
    padding: '12px 16px',
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
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
}