import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// ── Horarios por turno ────────────────────────────────────────
const TURNO_CONFIG = {
  MAÑANA: { icono: '☀️', label: 'Turno Mañana', horario: '07:00 – 13:00', min: '07:00', max: '12:59', color: '#f59e0b', bg: '#fff8e1' },
  TARDE:  { icono: '🌙', label: 'Turno Tarde',  horario: '13:00 – 19:00', min: '13:00', max: '19:00', color: '#7c3aed', bg: '#ede9fe' },
}

// Devuelve true si la hora está dentro del turno
function horaEnTurno(hora, turno) {
  if (!hora || !turno) return true
  const h = parseInt(hora.split(':')[0], 10)
  if (turno === 'MAÑANA') return h >= 7  && h < 13
  if (turno === 'TARDE')  return h >= 13 && h <= 19
  return true
}

export default function CitaModal({ perfil, onGuardar, onCerrar }) {
  const [mascotas,  setMascotas]  = useState([])
  const [groomers,  setGroomers]  = useState([])  // incluye turno
  const [servicios, setServicios] = useState([])
  const [loading,   setLoading]   = useState(false)

  const [form, setForm] = useState({
    id_mascota: '',
    id_groomer: '',
    fecha:      '',
    hora:       '',
  })
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([])

  useEffect(() => { cargarDatos() }, [])

  const cargarDatos = async () => {
    // Mascotas del cliente
    const { data: m } = await supabase
      .from('mascota')
      .select('id, nombre, raza')
      .eq('id_cliente', perfil.id)

    // Groomers con turno
    const { data: g } = await supabase
      .from('groomer')
      .select('id, especialidad, turno, usuario:usuario!groomer_id_fkey(nombre)')

    // Servicios
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

  const toggleServicio = (id) => {
    setServiciosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  // ── Groomer seleccionado y su turno ───────────────────────────
  const groomerSeleccionado = groomers.find(g => g.id === form.id_groomer) ?? null
  const turnoGroomer        = groomerSeleccionado?.turno ?? null
  const cfgTurno            = TURNO_CONFIG[turnoGroomer] ?? null

  // ── Validación de turno ───────────────────────────────────────
  const hayConflictoTurno = form.id_groomer && form.hora && turnoGroomer
    ? !horaEnTurno(form.hora, turnoGroomer)
    : false

  const totalServicios = servicios
    .filter(s => serviciosSeleccionados.includes(s.id))
    .reduce((sum, s) => sum + parseFloat(s.precio), 0)

  const hoy = new Date().toISOString().split('T')[0]

  const handleSubmit = async () => {
    if (!form.id_mascota) return alert('Selecciona una mascota')
    if (!form.fecha)      return alert('Selecciona una fecha')
    if (!form.hora)       return alert('Selecciona una hora')
    if (serviciosSeleccionados.length === 0)
      return alert('Selecciona al menos un servicio')

    // Bloquear si hay conflicto de turno
    if (hayConflictoTurno) {
      alert(
        `⚠️ La hora seleccionada no está disponible para este groomer.\n\n` +
        `${groomerSeleccionado?.usuario?.nombre} trabaja en el ${cfgTurno?.label} (${cfgTurno?.horario}).\n` +
        `Por favor selecciona una hora dentro de ese rango.`
      )
      return
    }

    setLoading(true)
    const datosCita = {
      id_mascota: form.id_mascota,
      id_groomer: form.id_groomer || null,
      fecha:      `${form.fecha}T${form.hora}:00`,
    }
    const exito = await onGuardar(datosCita, serviciosSeleccionados)
    if (exito) onCerrar()
    setLoading(false)
  }

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <h2 style={s.titulo}>📅 Nueva cita</h2>
          <button style={s.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        <div style={s.body}>

          {/* Mascota */}
          <div style={s.campo}>
            <label style={s.label}>Mascota <span style={{ color: 'red' }}>*</span></label>
            <select style={s.input} name="id_mascota"
              value={form.id_mascota} onChange={handleChange}>
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
                <a href="/mascotas" style={{ color: '#6c63ff' }}>Registra una aquí</a>
              </p>
            )}
          </div>

          {/* Groomer */}
          <div style={s.campo}>
            <label style={s.label}>Groomer (opcional)</label>
            <select style={s.input} name="id_groomer"
              value={form.id_groomer} onChange={handleChange}>
              <option value="">-- Sin preferencia --</option>
              {groomers.map(g => {
                const cfg = TURNO_CONFIG[g.turno]
                return (
                  <option key={g.id} value={g.id}>
                    {g.usuario?.nombre ?? 'Groomer'}
                    {g.turno ? ` — ${cfg?.icono} ${cfg?.label} (${cfg?.horario})` : ''}
                    {g.especialidad ? ` — ${g.especialidad}` : ''}
                  </option>
                )
              })}
            </select>

            {/* Info del turno del groomer seleccionado */}
            {groomerSeleccionado && cfgTurno && (
              <div style={{
                marginTop: 6, padding: '8px 12px', borderRadius: 8,
                background: cfgTurno.bg, border: `1px solid ${cfgTurno.color}30`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 18 }}>{cfgTurno.icono}</span>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: cfgTurno.color }}>
                    {groomerSeleccionado.usuario?.nombre} · {cfgTurno.label}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: cfgTurno.color }}>
                    Horario disponible: {cfgTurno.horario}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Fecha y Hora */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={s.campo}>
              <label style={s.label}>Fecha <span style={{ color: 'red' }}>*</span></label>
              <input style={s.input} type="date" name="fecha"
                min={hoy} value={form.fecha} onChange={handleChange} />
            </div>

            <div style={s.campo}>
              <label style={s.label}>
                Hora <span style={{ color: 'red' }}>*</span>
                {cfgTurno && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: cfgTurno.color, fontWeight: 600 }}>
                    {cfgTurno.icono} {cfgTurno.horario}
                  </span>
                )}
              </label>
              <input
                style={{
                  ...s.input,
                  borderColor: hayConflictoTurno ? '#e53e3e' : '#e5e7eb',
                  background:  hayConflictoTurno ? '#fff5f5' : '#fafafa',
                }}
                type="time" name="hora"
                min={cfgTurno?.min ?? '07:00'}
                max={cfgTurno?.max ?? '19:00'}
                value={form.hora}
                onChange={handleChange}
              />

              {/* Alerta de conflicto de turno */}
              {hayConflictoTurno && (
                <div style={s.alertaTurno}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <div>
                    <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 12, color: '#c62828' }}>
                      Hora fuera del turno del groomer
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: '#c62828' }}>
                      {groomerSeleccionado?.usuario?.nombre} trabaja en el{' '}
                      <strong>{cfgTurno?.label}</strong> ({cfgTurno?.horario}).
                      La hora seleccionada no coincide con su turno de trabajo.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Servicios */}
          <div style={s.campo}>
            <label style={s.label}>Servicios <span style={{ color: 'red' }}>*</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {servicios.map(sv => {
                const sel = serviciosSeleccionados.includes(sv.id)
                return (
                  <div key={sv.id}
                    style={{
                      ...s.servicioItem,
                      border:     `2px solid ${sel ? '#6c63ff' : '#e5e7eb'}`,
                      background: sel ? '#f0eeff' : '#fafafa',
                    }}
                    onClick={() => toggleServicio(sv.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, color: sel ? '#6c63ff' : '#333', fontSize: 13 }}>
                        {sel ? '✅ ' : ''}{sv.nombre}
                      </span>
                      <span style={{ fontWeight: 700, color: '#6c63ff', fontSize: 13 }}>
                        Bs. {parseFloat(sv.precio).toFixed(2)}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#999' }}>⏱ {sv.duracion} min</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Total */}
          {serviciosSeleccionados.length > 0 && (
            <div style={s.totalBox}>
              <span style={{ color: '#666', fontSize: 14 }}>
                {serviciosSeleccionados.length} servicio{serviciosSeleccionados.length > 1 ? 's' : ''} seleccionado{serviciosSeleccionados.length > 1 ? 's' : ''}
              </span>
              <span style={{ fontWeight: 700, fontSize: 18, color: '#6c63ff' }}>
                Total: Bs. {totalServicios.toFixed(2)}
              </span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button style={s.btnCancelar} onClick={onCerrar}>Cancelar</button>
          <button
            style={{
              ...s.btnGuardar,
              opacity: (loading || hayConflictoTurno) ? 0.6 : 1,
              cursor:  hayConflictoTurno ? 'not-allowed' : 'pointer',
              background: hayConflictoTurno ? '#e53e3e' : '#6c63ff',
            }}
            onClick={handleSubmit}
            disabled={loading || hayConflictoTurno}
          >
            {loading
              ? 'Agendando...'
              : hayConflictoTurno
                ? '⚠️ Hora no disponible'
                : 'Confirmar cita'}
          </button>
        </div>

      </div>
    </div>
  )
}

const s = {
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal:       { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  header:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 },
  titulo:      { margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a2e' },
  btnCerrar:   { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' },
  body:        { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 },
  campo:       { display: 'flex', flexDirection: 'column', gap: 6 },
  label:       { fontSize: 13, fontWeight: 600, color: '#444' },
  input:       { padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fafafa', color: '#333', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  alertaTurno: { display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 6, padding: '10px 12px', background: '#fff5f5', border: '1.5px solid #fecaca', borderRadius: 8 },
  servicioItem:{ padding: '10px 14px', borderRadius: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, transition: 'all 0.15s' },
  totalBox:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0eeff', borderRadius: 10, padding: '12px 16px' },
  footer:      { display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid #f0f0f0', justifyContent: 'flex-end', flexShrink: 0 },
  btnCancelar: { padding: '10px 20px', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnGuardar:  { padding: '10px 24px', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, transition: 'all 0.2s' },
}
