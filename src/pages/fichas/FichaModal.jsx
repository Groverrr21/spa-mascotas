import { useState, useEffect } from 'react'

const CONDICION_PELAJE  = ['BUENO', 'REGULAR', 'MALO', 'MUY_MALO']
const CONDICION_PIEL    = ['NORMAL', 'SECA', 'GRASA', 'CON_LESIONES']
const COMPORTAMIENTOS   = ['TRANQUILO', 'NERVIOSO', 'AGRESIVO', 'INQUIETO']

const COLOR_PELAJE = {
  BUENO:      { bg: '#e8f5e9', color: '#2e7d32' },
  REGULAR:    { bg: '#fff3e0', color: '#e65100' },
  MALO:       { bg: '#ffebee', color: '#c62828' },
  MUY_MALO:   { bg: '#fce4ec', color: '#880e4f' },
}
const COLOR_PIEL = {
  NORMAL:       { bg: '#e8f5e9', color: '#2e7d32' },
  SECA:         { bg: '#fff3e0', color: '#e65100' },
  GRASA:        { bg: '#e3f2fd', color: '#1565c0' },
  CON_LESIONES: { bg: '#ffebee', color: '#c62828' },
}
const COLOR_COMP = {
  TRANQUILO: { bg: '#e8f5e9', color: '#2e7d32', icono: '😌' },
  NERVIOSO:  { bg: '#fff3e0', color: '#e65100', icono: '😰' },
  AGRESIVO:  { bg: '#ffebee', color: '#c62828', icono: '😠' },
  INQUIETO:  { bg: '#e3f2fd', color: '#1565c0', icono: '🤪' },
}

function SelectorBotones({ opciones, valor, onChange, colorMap }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {opciones.map(op => {
        const c = colorMap?.[op] ?? { bg: '#f3f4f6', color: '#555' }
        const activo = valor === op
        return (
          <button key={op} type="button"
            style={{
              padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
              borderColor: activo ? c.color : '#e5e7eb',
              background: activo ? c.bg : '#fafafa',
              color: activo ? c.color : '#888',
              fontSize: 12, fontWeight: activo ? 700 : 400, cursor: 'pointer',
            }}
            onClick={() => onChange(op)}
          >
            {colorMap?.[op]?.icono ? `${colorMap[op].icono} ` : ''}{op}
          </button>
        )
      })}
    </div>
  )
}

export default function FichaModal({ cita, fichaExistente, perfil, onGuardar, onCerrar }) {
  const serviciosCita = (cita?.cita_servicio ?? []).map(cs => cs.servicio?.nombre).filter(Boolean)

  const [form, setForm] = useState({
    condicion_pelaje:      'BUENO',
    condicion_piel:        'NORMAL',
    comportamiento:        'TRANQUILO',
    observaciones_entrada: '',
    checklist:             {},
    productos_usados:      '',
    foto_antes:            null,
    foto_despues:          null,
    tiempo_servicio:       '',
    observaciones_salida:  '',
    recomendaciones:       '',
  })
  const [archivoAntes,   setArchivoAntes]   = useState(null)
  const [archivoDespues, setArchivoDespues] = useState(null)
  const [subiendo,       setSubiendo]       = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [seccion,        setSeccion]        = useState(0) // 0=entrada 1=servicio 2=cierre

  // Cargar ficha existente
  useEffect(() => {
    if (fichaExistente) {
      setForm({
        condicion_pelaje:      fichaExistente.condicion_pelaje      ?? 'BUENO',
        condicion_piel:        fichaExistente.condicion_piel        ?? 'NORMAL',
        comportamiento:        fichaExistente.comportamiento        ?? 'TRANQUILO',
        observaciones_entrada: fichaExistente.observaciones_entrada ?? '',
        checklist:             fichaExistente.checklist             ?? {},
        productos_usados:      fichaExistente.productos_usados      ?? '',
        foto_antes:            fichaExistente.foto_antes            ?? null,
        foto_despues:          fichaExistente.foto_despues          ?? null,
        tiempo_servicio:       fichaExistente.tiempo_servicio       ?? '',
        observaciones_salida:  fichaExistente.observaciones_salida  ?? '',
        recomendaciones:       fichaExistente.recomendaciones       ?? '',
      })
    } else {
      // Checklist inicial con todos los servicios de la cita
      const checklistInicial = {}
      serviciosCita.forEach(s => { checklistInicial[s] = false })
      setForm(p => ({ ...p, checklist: checklistInicial }))
    }
  }, [fichaExistente])

  const set = (campo, valor) => setForm(p => ({ ...p, [campo]: valor }))
  const toggleCheck = (servicio) =>
    setForm(p => ({ ...p, checklist: { ...p.checklist, [servicio]: !p.checklist[servicio] } }))

  const handleGuardar = async (completada = false) => {
    setLoading(true)
    setSubiendo(false)

    let urlAntes    = form.foto_antes
    let urlDespues  = form.foto_despues

    // Subir fotos si hay nuevas
    if (archivoAntes || archivoDespues) {
      setSubiendo(true)
      if (archivoAntes)   urlAntes   = await onGuardar.subirFoto(archivoAntes,   'antes')
      if (archivoDespues) urlDespues = await onGuardar.subirFoto(archivoDespues, 'despues')
      setSubiendo(false)
    }

    const datos = {
      id_cita:              cita.id,
      id_groomer:           perfil.id,
      condicion_pelaje:     form.condicion_pelaje,
      condicion_piel:       form.condicion_piel,
      comportamiento:       form.comportamiento,
      observaciones_entrada:form.observaciones_entrada || null,
      checklist:            form.checklist,
      productos_usados:     form.productos_usados || null,
      foto_antes:           urlAntes,
      foto_despues:         urlDespues,
      tiempo_servicio:      form.tiempo_servicio ? parseInt(form.tiempo_servicio) : null,
      observaciones_salida: form.observaciones_salida || null,
      recomendaciones:      form.recomendaciones || null,
      completada,
    }

    const exito = await onGuardar.guardar(datos, fichaExistente?.id)
    setLoading(false)
    if (exito) onCerrar()
  }

  const mascota = cita?.mascota
  const SECCIONES = ['📋 Evaluación inicial', '✅ Servicios realizados', '🏁 Cierre del servicio']
  const checklistCompletado = Object.values(form.checklist).filter(Boolean).length
  const checklistTotal      = Object.keys(form.checklist).length

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <h2 style={s.titulo}>📋 Ficha Técnica</h2>
            <p style={s.subtitulo}>
              🐾 <strong>{mascota?.nombre}</strong> · {mascota?.raza} · {mascota?.tamanio}
              {mascota?.temperamento && (
                <span style={{ marginLeft: 8, fontSize: 11, color: '#888' }}>
                  · Temperamento: {mascota.temperamento}
                </span>
              )}
            </p>
            {mascota?.alergias && (
              <div style={s.alertaAlergia}>
                ⚠️ <strong>Alergias:</strong> {mascota.alergias}
              </div>
            )}
          </div>
          <button style={s.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        {/* Pasos */}
        <div style={s.pasos}>
          {SECCIONES.map((sec, i) => (
            <button key={i}
              style={{
                ...s.paso,
                background: seccion === i ? '#6c63ff' : i < seccion ? '#e8f5e9' : '#f3f4f6',
                color:      seccion === i ? '#fff'    : i < seccion ? '#2e7d32' : '#888',
                fontWeight: seccion === i ? 700 : 400,
                cursor: 'pointer',
              }}
              onClick={() => setSeccion(i)}
            >
              {i < seccion ? '✅ ' : ''}{sec}
            </button>
          ))}
        </div>

        <div style={s.body}>

          {/* ── SECCIÓN 0: Evaluación inicial ── */}
          {seccion === 0 && (
            <div style={s.seccion}>

              <div style={s.campo}>
                <label style={s.label}>Condición del pelaje</label>
                <SelectorBotones
                  opciones={CONDICION_PELAJE} valor={form.condicion_pelaje}
                  onChange={v => set('condicion_pelaje', v)} colorMap={COLOR_PELAJE}
                />
              </div>

              <div style={s.campo}>
                <label style={s.label}>Condición de la piel</label>
                <SelectorBotones
                  opciones={CONDICION_PIEL} valor={form.condicion_piel}
                  onChange={v => set('condicion_piel', v)} colorMap={COLOR_PIEL}
                />
              </div>

              <div style={s.campo}>
                <label style={s.label}>Comportamiento al ingreso</label>
                <SelectorBotones
                  opciones={COMPORTAMIENTOS} valor={form.comportamiento}
                  onChange={v => set('comportamiento', v)} colorMap={COLOR_COMP}
                />
              </div>

              <div style={s.campo}>
                <label style={s.label}>Observaciones al ingreso</label>
                <textarea
                  style={{ ...s.input, minHeight: 80, resize: 'vertical' }}
                  placeholder="Ej: Llegó con el pelaje enredado, presenta herida leve en la pata derecha..."
                  value={form.observaciones_entrada}
                  onChange={e => set('observaciones_entrada', e.target.value)}
                />
              </div>

              {/* Foto antes */}
              <div style={s.campo}>
                <label style={s.label}>📷 Foto antes del servicio</label>
                <div style={s.fotoBox} onClick={() => document.getElementById('fotoAntes').click()}>
                  <input id="fotoAntes" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => setArchivoAntes(e.target.files[0])} />
                  {archivoAntes ? (
                    <p style={{ margin: 0, color: '#6c63ff', fontWeight: 600, fontSize: 13 }}>
                      📷 {archivoAntes.name}
                    </p>
                  ) : form.foto_antes ? (
                    <div style={{ textAlign: 'center' }}>
                      <img src={form.foto_antes} alt="antes" style={{ maxHeight: 80, borderRadius: 8, marginBottom: 4 }} />
                      <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Clic para cambiar</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 28 }}>📷</span>
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#888' }}>Subir foto antes del servicio</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ── SECCIÓN 1: Servicios realizados ── */}
          {seccion === 1 && (
            <div style={s.seccion}>

              {/* Progreso del checklist */}
              {checklistTotal > 0 && (
                <div style={s.progreso}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
                      Progreso del servicio
                    </span>
                    <span style={{ fontSize: 13, color: '#6c63ff', fontWeight: 700 }}>
                      {checklistCompletado}/{checklistTotal}
                    </span>
                  </div>
                  <div style={{ height: 8, background: '#f0f0f0', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${checklistTotal > 0 ? (checklistCompletado / checklistTotal) * 100 : 0}%`,
                      background: 'linear-gradient(90deg, #6c63ff, #a78bfa)',
                      borderRadius: 10, transition: 'all 0.3s',
                    }} />
                  </div>
                </div>
              )}

              {/* Checklist de servicios */}
              <div style={s.campo}>
                <label style={s.label}>✅ Servicios de la cita</label>
                {serviciosCita.length === 0 ? (
                  <p style={{ color: '#aaa', fontSize: 13 }}>No hay servicios registrados en esta cita</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {serviciosCita.map(servicio => (
                      <label key={servicio}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                          background: form.checklist[servicio] ? '#f0fdf4' : '#fafafa',
                          border: `1.5px solid ${form.checklist[servicio] ? '#22c55e' : '#e5e7eb'}`,
                          transition: 'all 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.checklist[servicio] ?? false}
                          onChange={() => toggleCheck(servicio)}
                          style={{ width: 18, height: 18, accentColor: '#6c63ff', cursor: 'pointer' }}
                        />
                        <span style={{
                          fontWeight: 600, fontSize: 14,
                          color: form.checklist[servicio] ? '#2e7d32' : '#333',
                          textDecoration: form.checklist[servicio] ? 'none' : 'none',
                        }}>
                          {form.checklist[servicio] ? '✅ ' : '⭕ '}{servicio}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Checklist adicional fijo */}
              <div style={s.campo}>
                <label style={s.label}>🧹 Pasos adicionales</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['Revisión general del estado', 'Limpieza de oídos', 'Revisión de uñas', 'Secado completo', 'Perfumado final'].map(item => (
                    <label key={item}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                        background: form.checklist[item] ? '#f0eeff' : '#fafafa',
                        border: `1.5px solid ${form.checklist[item] ? '#6c63ff' : '#e5e7eb'}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.checklist[item] ?? false}
                        onChange={() => toggleCheck(item)}
                        style={{ width: 18, height: 18, accentColor: '#6c63ff', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 13, fontWeight: form.checklist[item] ? 600 : 400, color: form.checklist[item] ? '#6c63ff' : '#555' }}>
                        {item}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Productos usados */}
              <div style={s.campo}>
                <label style={s.label}>🧴 Productos utilizados</label>
                <textarea
                  style={{ ...s.input, minHeight: 70, resize: 'vertical' }}
                  placeholder="Ej: Shampoo hipoalergénico, acondicionador de pelo largo, spray antipulgas..."
                  value={form.productos_usados}
                  onChange={e => set('productos_usados', e.target.value)}
                />
              </div>

            </div>
          )}

          {/* ── SECCIÓN 2: Cierre ── */}
          {seccion === 2 && (
            <div style={s.seccion}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={s.campo}>
                  <label style={s.label}>⏱ Tiempo real del servicio (min)</label>
                  <input style={s.input} type="number" min="10" max="480" step="5"
                    placeholder="Ej: 90"
                    value={form.tiempo_servicio}
                    onChange={e => set('tiempo_servicio', e.target.value)} />
                </div>
              </div>

              <div style={s.campo}>
                <label style={s.label}>Observaciones al finalizar</label>
                <textarea
                  style={{ ...s.input, minHeight: 80, resize: 'vertical' }}
                  placeholder="Ej: Mascota tranquila durante todo el proceso, pelaje quedó brillante..."
                  value={form.observaciones_salida}
                  onChange={e => set('observaciones_salida', e.target.value)}
                />
              </div>

              <div style={s.campo}>
                <label style={s.label}>💡 Recomendaciones para el cliente</label>
                <textarea
                  style={{ ...s.input, minHeight: 80, resize: 'vertical' }}
                  placeholder="Ej: Recomendar baño cada 3 semanas, usar shampoo suave, cepillado diario..."
                  value={form.recomendaciones}
                  onChange={e => set('recomendaciones', e.target.value)}
                />
              </div>

              {/* Foto después */}
              <div style={s.campo}>
                <label style={s.label}>📷 Foto después del servicio</label>
                <div style={s.fotoBox} onClick={() => document.getElementById('fotoDespues').click()}>
                  <input id="fotoDespues" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => setArchivoDespues(e.target.files[0])} />
                  {archivoDespues ? (
                    <p style={{ margin: 0, color: '#6c63ff', fontWeight: 600, fontSize: 13 }}>
                      📷 {archivoDespues.name}
                    </p>
                  ) : form.foto_despues ? (
                    <div style={{ textAlign: 'center' }}>
                      <img src={form.foto_despues} alt="después" style={{ maxHeight: 80, borderRadius: 8, marginBottom: 4 }} />
                      <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Clic para cambiar</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 28 }}>📷</span>
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#888' }}>Subir foto después del servicio</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Resumen antes de completar */}
              <div style={s.resumenBox}>
                <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13, color: '#6c63ff' }}>
                  📋 Resumen de la ficha
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                  <span style={{ color: '#888' }}>Pelaje:</span>
                  <span style={{ fontWeight: 600 }}>{form.condicion_pelaje}</span>
                  <span style={{ color: '#888' }}>Piel:</span>
                  <span style={{ fontWeight: 600 }}>{form.condicion_piel}</span>
                  <span style={{ color: '#888' }}>Comportamiento:</span>
                  <span style={{ fontWeight: 600 }}>{form.comportamiento}</span>
                  <span style={{ color: '#888' }}>Servicios realizados:</span>
                  <span style={{ fontWeight: 600, color: '#2e7d32' }}>
                    {checklistCompletado}/{checklistTotal}
                  </span>
                  {form.tiempo_servicio && (
                    <>
                      <span style={{ color: '#888' }}>Tiempo real:</span>
                      <span style={{ fontWeight: 600 }}>{form.tiempo_servicio} min</span>
                    </>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div style={s.footer}>
          {/* Navegación entre secciones */}
          <div style={{ display: 'flex', gap: 8 }}>
            {seccion > 0 && (
              <button style={s.btnNavegar} onClick={() => setSeccion(s => s - 1)}>
                ← Anterior
              </button>
            )}
            {seccion < 2 && (
              <button style={{ ...s.btnNavegar, background: '#f0eeff', color: '#6c63ff' }}
                onClick={() => setSeccion(s => s + 1)}>
                Siguiente →
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Guardar borrador */}
            <button
              style={{ ...s.btnGuardar, background: '#f3f4f6', color: '#555', opacity: loading ? 0.6 : 1 }}
              onClick={() => handleGuardar(false)}
              disabled={loading}
            >
              {loading && !subiendo ? 'Guardando...' : '💾 Guardar borrador'}
            </button>
            {/* Completar ficha */}
            {seccion === 2 && (
              <button
                style={{ ...s.btnGuardar, opacity: loading ? 0.6 : 1 }}
                onClick={() => handleGuardar(true)}
                disabled={loading}
              >
                {subiendo ? 'Subiendo fotos...' : loading ? 'Completando...' : '✅ Completar ficha'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

const s = {
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal:        { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' },
  header:       { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 },
  titulo:       { margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1a1a2e' },
  subtitulo:    { margin: '0 0 4px', fontSize: 13, color: '#555' },
  btnCerrar:    { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999', flexShrink: 0 },
  alertaAlergia:{ marginTop: 6, padding: '6px 12px', background: '#fff3e0', border: '1px solid #f97316', borderRadius: 8, fontSize: 12, color: '#c05500' },
  pasos:        { display: 'flex', gap: 6, padding: '12px 24px', borderBottom: '1px solid #f5f5f5', flexShrink: 0 },
  paso:         { flex: 1, padding: '7px 0', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 400, textAlign: 'center' },
  body:         { padding: '20px 24px', overflowY: 'auto', flex: 1 },
  seccion:      { display: 'flex', flexDirection: 'column', gap: 16 },
  campo:        { display: 'flex', flexDirection: 'column', gap: 6 },
  label:        { fontSize: 13, fontWeight: 600, color: '#444' },
  input:        { padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fafafa', color: '#333', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  fotoBox:      { border: '2px dashed #e5e7eb', borderRadius: 10, padding: '16px', textAlign: 'center', cursor: 'pointer', background: '#fafafa', minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  progreso:     { background: '#f8f8ff', border: '1px solid #ede9fe', borderRadius: 10, padding: '12px 14px' },
  resumenBox:   { background: '#f8f8ff', border: '1px solid #ede9fe', borderRadius: 10, padding: '14px 16px' },
  footer:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '14px 24px', borderTop: '1px solid #f0f0f0', flexShrink: 0, flexWrap: 'wrap' },
  btnNavegar:   { padding: '8px 16px', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnGuardar:   { padding: '9px 18px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
}
