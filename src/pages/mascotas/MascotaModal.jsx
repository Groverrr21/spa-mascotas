import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const TAMANOS     = ['PEQUEÑO', 'MEDIANO', 'GRANDE', 'GIGANTE']
const ESPECIES    = ['Perro', 'Gato', 'Conejo', 'Ave', 'Otro']
const TEMPERAMENTOS = ['TRANQUILO', 'NERVIOSO', 'AGRESIVO', 'INQUIETO']
const VACUNAS_EST = ['Al día', 'Incompletas', 'Sin vacunas']

function calcularEdad(fechaNac) {
  if (!fechaNac) return null
  const hoy   = new Date()
  const nac   = new Date(fechaNac)
  const años  = hoy.getFullYear() - nac.getFullYear()
  const meses = hoy.getMonth() - nac.getMonth()
  if (años === 0) return `${meses} mes${meses !== 1 ? 'es' : ''}`
  return `${años} año${años !== 1 ? 's' : ''}`
}

export default function MascotaModal({ mascota, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    nombre:       '',
    especie:      'Perro',
    raza:         '',
    tamanio:      'MEDIANO',
    fecha_nac:    '',
    alergias:     '',
    temperamento: 'TRANQUILO',
    vacunas:      'Al día',
  })
  const [archivoVacuna, setArchivoVacuna] = useState(null)
  const [loading, setLoading]             = useState(false)
  const [subiendo, setSubiendo]           = useState(false)

  useEffect(() => {
    if (mascota) {
      setForm({
        nombre:       mascota.nombre       ?? '',
        especie:      mascota.especie      ?? 'Perro',
        raza:         mascota.raza         ?? '',
        tamanio:      mascota.tamanio      ?? 'MEDIANO',
        fecha_nac:    mascota.fecha_nac    ?? '',
        alergias:     mascota.alergias     ?? '',
        temperamento: mascota.temperamento ?? 'TRANQUILO',
        vacunas:      mascota.vacunas      ?? 'Al día',
      })
    }
  }, [mascota])

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const subirArchivoVacuna = async () => {
    if (!archivoVacuna) return null
    setSubiendo(true)
    const ext      = archivoVacuna.name.split('.').pop()
    const nombre   = `${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from('vacunas')
      .upload(nombre, archivoVacuna)
    setSubiendo(false)
    if (error) { toast.error('Error al subir el archivo'); return null }
    const { data: urlData } = supabase.storage.from('vacunas').getPublicUrl(nombre)
    return urlData.publicUrl
  }

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setLoading(true)

    let urlVacuna = mascota?.foto_vacunas ?? null
    if (archivoVacuna) {
      urlVacuna = await subirArchivoVacuna()
    }

    const datos = {
      ...form,
      foto_vacunas: urlVacuna,
      edad: form.fecha_nac
        ? Math.floor((new Date() - new Date(form.fecha_nac)) / (1000*60*60*24*365))
        : null
    }

    const exito = await onGuardar(datos)
    if (exito) onCerrar()
    setLoading(false)
  }

  const edadTexto = calcularEdad(form.fecha_nac)

  const COLOR_TEMP = {
    TRANQUILO: { bg: '#e8f5e9', color: '#2e7d32' },
    NERVIOSO:  { bg: '#fff3e0', color: '#e65100' },
    AGRESIVO:  { bg: '#ffebee', color: '#c62828' },
    INQUIETO:  { bg: '#e3f2fd', color: '#1565c0' },
  }

  return (
    <div style={estilos.overlay} onClick={onCerrar}>
      <div style={estilos.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={estilos.header}>
          <h2 style={estilos.titulo}>
            {mascota ? '✏️ Editar mascota' : '🐾 Nueva mascota'}
          </h2>
          <button style={estilos.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        <div style={estilos.body}>

          {/* ── SECCIÓN: Información básica ── */}
          <p style={estilos.seccion}>📋 Información básica</p>

          {/* Nombre */}
          <div style={estilos.campo}>
            <label style={estilos.label}>
              Nombre <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              style={estilos.input} name="nombre"
              placeholder="Ej: Max, Luna, Toby..."
              value={form.nombre} onChange={handleChange} autoFocus
            />
          </div>

          {/* Especie */}
          <div style={estilos.campo}>
            <label style={estilos.label}>Especie</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ESPECIES.map(esp => (
                <button key={esp} type="button"
                  style={{
                    padding: '7px 14px', borderRadius: 20, border: '1.5px solid',
                    borderColor: form.especie === esp ? '#6c63ff' : '#e5e7eb',
                    background: form.especie === esp ? '#f0eeff' : '#fafafa',
                    color: form.especie === esp ? '#6c63ff' : '#555',
                    fontSize: 13, fontWeight: form.especie === esp ? 700 : 400,
                    cursor: 'pointer',
                  }}
                  onClick={() => setForm(p => ({ ...p, especie: esp }))}>
                  {esp === 'Perro' ? '🐕' : esp === 'Gato' ? '🐈' : esp === 'Conejo' ? '🐇' : esp === 'Ave' ? '🦜' : '🐾'} {esp}
                </button>
              ))}
            </div>
          </div>

          {/* Raza y Tamaño */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={estilos.campo}>
              <label style={estilos.label}>Raza</label>
              <input style={estilos.input} name="raza"
                placeholder="Ej: Golden Retriever..."
                value={form.raza} onChange={handleChange} />
            </div>
            <div style={estilos.campo}>
              <label style={estilos.label}>Tamaño</label>
              <select style={estilos.input} name="tamanio"
                value={form.tamanio} onChange={handleChange}>
                {TAMANOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Fecha de nacimiento */}
          <div style={estilos.campo}>
            <label style={estilos.label}>Fecha de nacimiento</label>
            <input style={estilos.input} name="fecha_nac"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={form.fecha_nac} onChange={handleChange} />
            {edadTexto && (
              <span style={{ fontSize: 12, color: '#6c63ff', fontWeight: 600, marginTop: 2 }}>
                🎂 Edad calculada: {edadTexto}
              </span>
            )}
          </div>

          {/* ── SECCIÓN: Salud ── */}
          <p style={estilos.seccion}>🏥 Salud y comportamiento</p>

          {/* Temperamento */}
          <div style={estilos.campo}>
            <label style={estilos.label}>Temperamento</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TEMPERAMENTOS.map(t => {
                const c = COLOR_TEMP[t]
                return (
                  <button key={t} type="button"
                    style={{
                      padding: '7px 14px', borderRadius: 20, border: '1.5px solid',
                      borderColor: form.temperamento === t ? c.color : '#e5e7eb',
                      background: form.temperamento === t ? c.bg : '#fafafa',
                      color: form.temperamento === t ? c.color : '#555',
                      fontSize: 12, fontWeight: form.temperamento === t ? 700 : 400,
                      cursor: 'pointer',
                    }}
                    onClick={() => setForm(p => ({ ...p, temperamento: t }))}>
                    {t === 'TRANQUILO' ? '😌' : t === 'NERVIOSO' ? '😰' : t === 'AGRESIVO' ? '😠' : '🤪'} {t}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Alergias */}
          <div style={estilos.campo}>
            <label style={estilos.label}>Alergias o restricciones médicas</label>
            <textarea
              style={{ ...estilos.input, resize: 'vertical', minHeight: 70 }}
              name="alergias"
              placeholder="Ej: Alérgico al shampoo con sulfatos, no usar antipulgas químicos..."
              value={form.alergias} onChange={handleChange}
            />
          </div>

          {/* ── SECCIÓN: Vacunas ── */}
          <p style={estilos.seccion}>💉 Vacunación</p>

          <div style={estilos.campo}>
            <label style={estilos.label}>Estado de vacunas</label>
            <select style={estilos.input} name="vacunas"
              value={form.vacunas} onChange={handleChange}>
              {VACUNAS_EST.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Subir carnet */}
          <div style={estilos.campo}>
            <label style={estilos.label}>Carnet de vacunas (PDF o imagen)</label>
            <div style={{
              border: '2px dashed #e5e7eb', borderRadius: 10,
              padding: '16px', textAlign: 'center', background: '#fafafa',
              cursor: 'pointer',
            }}
              onClick={() => document.getElementById('inputVacuna').click()}>
              <input
                id="inputVacuna" type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={e => setArchivoVacuna(e.target.files[0])}
              />
              {archivoVacuna ? (
                <div>
                  <span style={{ fontSize: 24 }}>📄</span>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6c63ff', fontWeight: 600 }}>
                    {archivoVacuna.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#888' }}>
                    Clic para cambiar
                  </p>
                </div>
              ) : mascota?.foto_vacunas ? (
                <div>
                  <span style={{ fontSize: 24 }}>✅</span>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
                    Carnet ya subido
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#888' }}>
                    Clic para reemplazar
                  </p>
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: 32 }}>📎</span>
                  <p style={{ margin: '8px 0 4px', fontSize: 14, color: '#555', fontWeight: 600 }}>
                    Subir carnet de vacunas
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#aaa' }}>
                    PDF, JPG o PNG · máx 5MB
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={estilos.footer}>
          <button style={estilos.btnCancelar} onClick={onCerrar}>
            Cancelar
          </button>
          <button
            style={{ ...estilos.btnGuardar, opacity: (loading || subiendo) ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={loading || subiendo}
          >
            {subiendo ? 'Subiendo archivo...' :
             loading  ? 'Guardando...' :
             mascota  ? 'Guardar cambios' : 'Registrar mascota'}
          </button>
        </div>

      </div>
    </div>
  )
}

const estilos = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16,
  },
  modal: {
    background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px', borderBottom: '1px solid #f0f0f0', flexShrink: 0,
  },
  titulo:    { margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a2e' },
  btnCerrar: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' },
  body: {
    padding: '20px 24px', display: 'flex', flexDirection: 'column',
    gap: 14, overflowY: 'auto', flex: 1,
  },
  seccion: {
    margin: '4px 0 0', fontSize: 12, fontWeight: 700, color: '#6c63ff',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingBottom: 6, borderBottom: '1px solid #f0eeff',
  },
  campo:  { display: 'flex', flexDirection: 'column', gap: 6 },
  label:  { fontSize: 13, fontWeight: 600, color: '#444' },
  input: {
    padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb',
    fontSize: 14, outline: 'none', background: '#fafafa', color: '#333',
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  },
  footer: {
    display: 'flex', gap: 10, padding: '16px 24px',
    borderTop: '1px solid #f0f0f0', justifyContent: 'flex-end', flexShrink: 0,
  },
  btnCancelar: {
    padding: '10px 20px', background: '#f3f4f6', color: '#555',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  btnGuardar: {
    padding: '10px 24px', background: '#6c63ff', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
}