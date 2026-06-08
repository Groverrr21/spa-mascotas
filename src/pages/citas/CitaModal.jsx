import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

const TURNO_CONFIG = {
  MAÑANA: { icono: '☀️', label: 'Turno Mañana', horario: '07:00 - 13:00', min: '07:00', max: '12:59', color: '#f59e0b', bg: '#fff8e1' },
  TARDE:  { icono: '🌙', label: 'Turno Tarde',  horario: '13:00 - 19:00', min: '13:00', max: '19:00', color: '#7c3aed', bg: '#ede9fe' },
}

function horaEnTurno(hora, turno) {
  if (!hora || !turno) return true
  const h = parseInt(hora.split(':')[0], 10)
  if (turno === 'MAÑANA') return h >= 7  && h < 13
  if (turno === 'TARDE')  return h >= 13 && h <= 19
  return true
}

function parseFechaLocal(fechaStr) {
  if (!fechaStr) return null
  const d = new Date(fechaStr)
  return isNaN(d.getTime()) ? null : d
}

function formatHoraLocal(date) {
  if (!date) return ''
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function addMinutos(date, minutos) {
  return new Date(date.getTime() + minutos * 60000)
}

function minutosATexto(min) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h} hora${h > 1 ? 's' : ''}`
}

export default function CitaModal({ perfil, onGuardar, onCerrar }) {
  const [mascotas,  setMascotas]  = useState([])
  const [groomers,  setGroomers]  = useState([])
  const [servicios, setServicios] = useState([])
  const [loading,   setLoading]   = useState(false)

  const [form, setForm] = useState({
    id_mascota: '', id_groomer: '', fecha: '', hora: '',
  })
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([])

  // ── Validaciones ──────────────────────────────────────────────
  const [solapamiento,    setSolapamiento]    = useState(null)
  const [capacidadLlena,  setCapacidadLlena]  = useState(false)
  const [maxCitasInfo,    setMaxCitasInfo]    = useState(null)  // { max, total }
  const [verificando,     setVerificando]     = useState(false)
  const [citasDiaGroomer, setCitasDiaGroomer] = useState([])

  useEffect(() => { cargarDatos() }, [])

  const cargarDatos = async () => {
    const { data: m } = await supabase
      .from('mascota').select('id, nombre, raza').eq('id_cliente', perfil.id)

    // ── Traer groomers CON max_citas_diarias ──────────────────
    const { data: g } = await supabase
      .from('groomer')
      .select('id, especialidad, turno, max_citas_diarias, usuario:usuario!groomer_id_fkey(nombre)')

    const { data: s } = await supabase
      .from('servicio').select('id, nombre, precio, duracion').order('nombre')

    setMascotas(m ?? [])
    setGroomers(g ?? [])
    setServicios(s ?? [])
  }

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const toggleServicio = (id) =>
    setServiciosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )

  const serviciosElegidos = servicios.filter(s => serviciosSeleccionados.includes(s.id))
  const duracionTotal     = serviciosElegidos.reduce((sum, s) => sum + (s.duracion ?? 60), 0)

  const horaFinTexto = (() => {
    if (!form.fecha || !form.hora || serviciosSeleccionados.length === 0) return null
    const inicio = new Date(`${form.fecha}T${form.hora}:00`)
    return formatHoraLocal(addMinutos(inicio, duracionTotal))
  })()

  const groomerSeleccionado = groomers.find(g => g.id === form.id_groomer) ?? null
  const turnoGroomer        = groomerSeleccionado?.turno ?? null
  const cfgTurno            = TURNO_CONFIG[turnoGroomer] ?? null
  const hayConflictoTurno   = form.id_groomer && form.hora && turnoGroomer
    ? !horaEnTurno(form.hora, turnoGroomer) : false

  // ── Verificar solapamiento + capacidad máxima ─────────────────
  const verificarSolapamiento = useCallback(async () => {
    if (!form.id_groomer || !form.fecha || !form.hora || serviciosSeleccionados.length === 0) {
      setSolapamiento(null)
      setCapacidadLlena(false)
      setMaxCitasInfo(null)
      setCitasDiaGroomer([])
      return
    }

    setVerificando(true)
    try {
      const diaInicio = `${form.fecha}T00:00:00`
      const diaFin    = `${form.fecha}T23:59:59`

      const { data: citasExistentes } = await supabase
        .from('cita')
        .select(`
          id, fecha,
          mascota ( nombre ),
          cita_servicio ( servicio ( nombre, duracion ) )
        `)
        .eq('id_groomer', form.id_groomer)
        .in('estado', ['PENDIENTE', 'CONFIRMADA'])
        .gte('fecha', diaInicio)
        .lte('fecha', diaFin)

      // ── Verificar capacidad máxima diaria ─────────────────────
      const maxCitas = groomerSeleccionado?.max_citas_diarias ?? 8
      const totalCitasDia = (citasExistentes ?? []).length

      if (totalCitasDia >= maxCitas) {
        setCapacidadLlena(true)
        setMaxCitasInfo({ max: maxCitas, total: totalCitasDia })
      } else {
        setCapacidadLlena(false)
        setMaxCitasInfo({ max: maxCitas, total: totalCitasDia })
      }

      // ── Verificar solapamiento ────────────────────────────────
      const bloques = (citasExistentes ?? []).map(cita => {
        const inicio   = parseFechaLocal(cita.fecha)
        const duracion = (cita.cita_servicio ?? [])
          .reduce((sum, cs) => sum + (cs.servicio?.duracion ?? 60), 0)
        const fin = addMinutos(inicio, duracion)
        return {
          id:       cita.id,
          mascota:  cita.mascota?.nombre ?? '',
          inicio, fin, duracion,
          servicios: (cita.cita_servicio ?? []).map(cs => cs.servicio?.nombre).filter(Boolean),
        }
      }).sort((a, b) => a.inicio - b.inicio)

      setCitasDiaGroomer(bloques)

      const nuevaInicio = new Date(`${form.fecha}T${form.hora}:00`)
      const nuevaFin    = addMinutos(nuevaInicio, duracionTotal)
      const conflicto   = bloques.find(b => nuevaInicio < b.fin && nuevaFin > b.inicio)
      setSolapamiento(conflicto ?? null)

    } catch (e) {
      console.error('Error verificando disponibilidad:', e)
    }
    setVerificando(false)
  }, [form.id_groomer, form.fecha, form.hora, serviciosSeleccionados, duracionTotal, groomerSeleccionado])

  useEffect(() => {
    const timer = setTimeout(verificarSolapamiento, 400)
    return () => clearTimeout(timer)
  }, [verificarSolapamiento])

  const totalServicios = serviciosElegidos.reduce((sum, s) => sum + parseFloat(s.precio), 0)
  const hoy = new Date().toISOString().split('T')[0]

  const puedeConfirmar = !hayConflictoTurno && !solapamiento && !capacidadLlena && !verificando

  const handleSubmit = async () => {
    if (!form.id_mascota) return alert('Selecciona una mascota')
    if (!form.fecha)      return alert('Selecciona una fecha')
    if (!form.hora)       return alert('Selecciona una hora')
    if (serviciosSeleccionados.length === 0) return alert('Selecciona al menos un servicio')
    if (hayConflictoTurno || solapamiento || capacidadLlena) return

    setLoading(true)
    const exito = await onGuardar({
      id_mascota: form.id_mascota,
      id_groomer: form.id_groomer || null,
      fecha:      `${form.fecha}T${form.hora}:00`,
      estado:     'PENDIENTE',
    }, serviciosSeleccionados)
    if (exito) onCerrar()
    setLoading(false)
  }

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        <div style={s.header}>
          <h2 style={s.titulo}>Nueva cita</h2>
          <button style={s.btnCerrar} onClick={onCerrar}>X</button>
        </div>

        <div style={s.body}>

          {/* Mascota */}
          <div style={s.campo}>
            <label style={s.label}>Mascota <span style={{ color: 'red' }}>*</span></label>
            <select style={s.input} name="id_mascota" value={form.id_mascota} onChange={handleChange}>
              <option value="">-- Selecciona una mascota --</option>
              {mascotas.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nombre} {m.raza ? `(${m.raza})` : ''}
                </option>
              ))}
            </select>
            {mascotas.length === 0 && (
              <p style={{ color: '#e53e3e', fontSize: 12, margin: '4px 0 0' }}>
                No tienes mascotas.{' '}
                <a href="/mascotas" style={{ color: '#6c63ff' }}>Registra una aqui</a>
              </p>
            )}
          </div>

          {/* Groomer */}
          <div style={s.campo}>
            <label style={s.label}>Groomer (opcional)</label>
            <select style={s.input} name="id_groomer" value={form.id_groomer} onChange={handleChange}>
              <option value="">-- Sin preferencia --</option>
              {groomers.map(g => {
                const cfg = TURNO_CONFIG[g.turno]
                return (
                  <option key={g.id} value={g.id}>
                    {g.usuario?.nombre ?? 'Groomer'}
                    {g.turno ? ` - ${cfg?.icono} ${cfg?.label} (${cfg?.horario})` : ''}
                    {g.especialidad ? ` - ${g.especialidad}` : ''}
                  </option>
                )
              })}
            </select>

            {groomerSeleccionado && cfgTurno && (
              <div style={{ ...s.infoBadge, background: cfgTurno.bg, borderColor: cfgTurno.color + '30' }}>
                <span style={{ fontSize: 18 }}>{cfgTurno.icono}</span>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: cfgTurno.color }}>
                    {groomerSeleccionado.usuario?.nombre} - {cfgTurno.label}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: cfgTurno.color }}>
                    Horario disponible: {cfgTurno.horario}
                  </p>
                </div>
              </div>
            )}

            {/* ── Alerta capacidad máxima ── */}
            {capacidadLlena && maxCitasInfo && (
              <div style={s.alertaCapacidad}>
                <span style={{ fontSize: 20 }}>🚫</span>
                <div>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 13, color: '#c62828' }}>
                    Groomer al máximo de citas del dia
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#c62828' }}>
                    {groomerSeleccionado?.usuario?.nombre} ya tiene {maxCitasInfo.total} de {maxCitasInfo.max} citas
                    permitidas para este dia. Selecciona otro groomer u otra fecha.
                  </p>
                </div>
              </div>
            )}

            {/* Info capacidad disponible */}
            {!capacidadLlena && maxCitasInfo && form.id_groomer && form.fecha && (
              <div style={{ ...s.infoBadge, background: '#f0fdf4', borderColor: '#22c55e30' }}>
                <span>📋</span>
                <p style={{ margin: 0, fontSize: 12, color: '#2e7d32', fontWeight: 600 }}>
                  Capacidad: {maxCitasInfo.total} / {maxCitasInfo.max} citas agendadas para este dia
                </p>
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
                  borderColor: (hayConflictoTurno || solapamiento) ? '#e53e3e' : '#e5e7eb',
                  background:  (hayConflictoTurno || solapamiento) ? '#fff5f5' : '#fafafa',
                }}
                type="time" name="hora"
                min={cfgTurno?.min ?? '07:00'}
                max={cfgTurno?.max ?? '19:00'}
                value={form.hora} onChange={handleChange}
              />
              {horaFinTexto && !hayConflictoTurno && !solapamiento && (
                <div style={{ ...s.infoBadge, background: '#f0fdf4', borderColor: '#22c55e30', marginTop: 4 }}>
                  <span>⏱</span>
                  <p style={{ margin: 0, fontSize: 12, color: '#2e7d32', fontWeight: 600 }}>
                    Duracion: {minutosATexto(duracionTotal)} - Finaliza aprox. a las {horaFinTexto}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Alerta conflicto turno */}
          {hayConflictoTurno && (
            <div style={s.alertaError}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 13, color: '#c62828' }}>
                  Hora fuera del turno del groomer
                </p>
                <p style={{ margin: 0, fontSize: 12, color: '#c62828' }}>
                  {groomerSeleccionado?.usuario?.nombre} trabaja en el {cfgTurno?.label} ({cfgTurno?.horario}).
                </p>
              </div>
            </div>
          )}

          {/* Alerta solapamiento */}
          {solapamiento && !hayConflictoTurno && (
            <div style={s.alertaError}>
              <span style={{ fontSize: 20 }}>🔒</span>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13, color: '#c62828' }}>
                  Horario no disponible
                </p>
                <p style={{ margin: '0 0 2px', fontSize: 12, color: '#c62828' }}>
                  {solapamiento.mascota} - {formatHoraLocal(solapamiento.inicio)} a {formatHoraLocal(solapamiento.fin)}
                  ({minutosATexto(solapamiento.duracion)})
                </p>
                <p style={{ margin: 0, fontSize: 12, color: '#c62828' }}>
                  Selecciona una hora antes de las {formatHoraLocal(solapamiento.inicio)} o
                  despues de las {formatHoraLocal(solapamiento.fin)}.
                </p>
              </div>
            </div>
          )}

          {/* Agenda del día */}
          {form.id_groomer && form.fecha && citasDiaGroomer.length > 0 && (
            <div style={s.agendaBox}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#6c63ff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Agenda de {groomerSeleccionado?.usuario?.nombre} - {new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {citasDiaGroomer.map((bloque, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, background: '#fff5f5', border: '1px solid #fecaca' }}>
                    <span style={{ fontSize: 16 }}>🔴</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#c62828' }}>
                        {formatHoraLocal(bloque.inicio)} - {formatHoraLocal(bloque.fin)}
                        <span style={{ marginLeft: 6, fontWeight: 400, color: '#888' }}>({minutosATexto(bloque.duracion)})</span>
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: '#888' }}>
                        {bloque.mascota} - {bloque.servicios.join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {verificando && form.id_groomer && form.fecha && form.hora && (
            <div style={{ ...s.infoBadge, background: '#f8f8ff', borderColor: '#ede9fe' }}>
              <span>⏳</span>
              <p style={{ margin: 0, fontSize: 12, color: '#6c63ff' }}>Verificando disponibilidad...</p>
            </div>
          )}

          {/* Servicios */}
          <div style={s.campo}>
            <label style={s.label}>
              Servicios <span style={{ color: 'red' }}>*</span>
              {serviciosSeleccionados.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, color: '#6c63ff', fontWeight: 600 }}>
                  Duracion total: {minutosATexto(duracionTotal)}
                </span>
              )}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {servicios.map(sv => {
                const sel = serviciosSeleccionados.includes(sv.id)
                return (
                  <div key={sv.id}
                    style={{ ...s.servicioItem, border: `2px solid ${sel ? '#6c63ff' : '#e5e7eb'}`, background: sel ? '#f0eeff' : '#fafafa' }}
                    onClick={() => toggleServicio(sv.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: sel ? '#6c63ff' : '#333', fontSize: 13 }}>
                        {sel ? '✅ ' : ''}{sv.nombre}
                      </span>
                      <span style={{ fontWeight: 700, color: '#6c63ff', fontSize: 13 }}>
                        Bs. {parseFloat(sv.precio).toFixed(2)}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#999' }}>⏱ {minutosATexto(sv.duracion)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {serviciosSeleccionados.length > 0 && (
            <div style={s.totalBox}>
              <div>
                <span style={{ fontSize: 13, color: '#666' }}>
                  {serviciosSeleccionados.length} servicio{serviciosSeleccionados.length > 1 ? 's' : ''}
                </span>
                {horaFinTexto && (
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>
                    Fin aprox. {horaFinTexto}
                  </p>
                )}
              </div>
              <span style={{ fontWeight: 700, fontSize: 18, color: '#6c63ff' }}>
                Bs. {totalServicios.toFixed(2)}
              </span>
            </div>
          )}

        </div>

        <div style={s.footer}>
          <button style={s.btnCancelar} onClick={onCerrar}>Cancelar</button>
          <button
            style={{
              ...s.btnGuardar,
              opacity:    (loading || !puedeConfirmar) ? 0.6 : 1,
              cursor:     !puedeConfirmar ? 'not-allowed' : 'pointer',
              background: capacidadLlena   ? '#c62828'
                        : solapamiento     ? '#e53e3e'
                        : hayConflictoTurno? '#e53e3e'
                        : '#6c63ff',
            }}
            onClick={handleSubmit}
            disabled={loading || !puedeConfirmar}
          >
            {loading          ? 'Agendando...'
           : verificando      ? '⏳ Verificando...'
           : capacidadLlena   ? '🚫 Groomer al maximo'
           : solapamiento     ? '🔒 Horario ocupado'
           : hayConflictoTurno? '⚠️ Hora no disponible'
           : 'Confirmar cita'}
          </button>
        </div>

      </div>
    </div>
  )
}

const s = {
  overlay:       { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal:         { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  header:        { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 },
  titulo:        { margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a2e' },
  btnCerrar:     { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' },
  body:          { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 },
  campo:         { display: 'flex', flexDirection: 'column', gap: 6 },
  label:         { fontSize: 13, fontWeight: 600, color: '#444' },
  input:         { padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fafafa', color: '#333', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', transition: 'border-color 0.2s' },
  infoBadge:     { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid', marginTop: 4 },
  alertaError:   { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10 },
  alertaCapacidad:{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, marginTop: 6 },
  agendaBox:     { padding: '12px 14px', background: '#f8f8ff', border: '1px solid #ede9fe', borderRadius: 10 },
  servicioItem:  { padding: '10px 14px', borderRadius: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, transition: 'all 0.15s' },
  totalBox:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0eeff', borderRadius: 10, padding: '12px 16px' },
  footer:        { display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid #f0f0f0', justifyContent: 'flex-end', flexShrink: 0 },
  btnCancelar:   { padding: '10px 20px', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnGuardar:    { padding: '10px 24px', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, transition: 'all 0.2s' },
}
