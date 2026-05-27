import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

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

const PASOS_ADICIONALES = [
  'Revisión general del estado',
  'Limpieza de oídos',
  'Revisión de uñas',
  'Secado completo',
  'Perfumado final',
]

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
    foto_antes:            null,
    foto_despues:          null,
    tiempo_servicio:       '',
    observaciones_salida:  '',
    recomendaciones:       '',
  })

  // ── Estado de insumos ─────────────────────────────────────────
  const [insumosDisponibles, setInsumosDisponibles] = useState([])
  const [insumosUsados,      setInsumosUsados]      = useState([]) // [{id_insumo, nombre, unidad, cantidad}]
  const [insumoAgregar,      setInsumoAgregar]      = useState('')

  const [archivoAntes,   setArchivoAntes]   = useState(null)
  const [archivoDespues, setArchivoDespues] = useState(null)
  const [subiendo,       setSubiendo]       = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [seccion,        setSeccion]        = useState(0)

  // ── Cargar insumos disponibles ────────────────────────────────
  useEffect(() => {
    const cargarInsumos = async () => {
      const { data } = await supabase
        .from('insumo')
        .select('id, nombre, unidad, stock')
        .eq('activo', true)
        .order('nombre')
      setInsumosDisponibles(data ?? [])
    }
    cargarInsumos()
  }, [])

  // ── Cargar ficha existente ────────────────────────────────────
  useEffect(() => {
    const checklistInicial = {}
    serviciosCita.forEach(s => { checklistInicial[s] = false })
    PASOS_ADICIONALES.forEach(p => { checklistInicial[p] = false })

    if (fichaExistente) {
      setForm({
        condicion_pelaje:      fichaExistente.condicion_pelaje      ?? 'BUENO',
        condicion_piel:        fichaExistente.condicion_piel        ?? 'NORMAL',
        comportamiento:        fichaExistente.comportamiento        ?? 'TRANQUILO',
        observaciones_entrada: fichaExistente.observaciones_entrada ?? '',
        checklist:             { ...checklistInicial, ...(fichaExistente.checklist ?? {}) },
        foto_antes:            fichaExistente.foto_antes            ?? null,
        foto_despues:          fichaExistente.foto_despues          ?? null,
        tiempo_servicio:       fichaExistente.tiempo_servicio       ?? '',
        observaciones_salida:  fichaExistente.observaciones_salida  ?? '',
        recomendaciones:       fichaExistente.recomendaciones       ?? '',
      })
      setInsumosUsados(fichaExistente.insumos_usados ?? [])
    } else {
      setForm(p => ({ ...p, checklist: checklistInicial }))
    }
  }, [fichaExistente])

  const set = (campo, valor) => setForm(p => ({ ...p, [campo]: valor }))
  const toggleCheck = (item) =>
    setForm(p => ({ ...p, checklist: { ...p.checklist, [item]: !p.checklist[item] } }))

  // ── Insumos ───────────────────────────────────────────────────
  const agregarInsumo = () => {
    if (!insumoAgregar) return
    const insumo = insumosDisponibles.find(i => i.id === insumoAgregar)
    if (!insumo) return
    if (insumosUsados.find(i => i.id_insumo === insumo.id)) return
    setInsumosUsados(prev => [...prev, {
      id_insumo: insumo.id,
      nombre:    insumo.nombre,
      unidad:    insumo.unidad,
      cantidad:  1,
    }])
    setInsumoAgregar('')
  }

  const quitarInsumo = (id_insumo) =>
    setInsumosUsados(prev => prev.filter(i => i.id_insumo !== id_insumo))

  const setCantidad = (id_insumo, cantidad) =>
    setInsumosUsados(prev => prev.map(i =>
      i.id_insumo === id_insumo ? { ...i, cantidad: parseFloat(cantidad) || 0 } : i
    ))

  // ── Validación del checklist ──────────────────────────────────
  const serviciosPendientes = serviciosCita.filter(s => !form.checklist[s])
  const checklistServiciosOK = serviciosPendientes.length === 0
  const puedeCompletar = checklistServiciosOK  // bloqueo si hay servicios sin marcar

  // Stats del checklist
  const totalItems      = Object.keys(form.checklist).length
  const completadosItems = Object.values(form.checklist).filter(Boolean).length

  // ── Guardar ───────────────────────────────────────────────────
  const handleGuardar = async (completada = false) => {
    // Bloquear si intenta completar con checklist incompleto
    if (completada && !puedeCompletar) {
      return // El botón ya está deshabilitado, pero por seguridad
    }

    setLoading(true)
    let urlAntes   = form.foto_antes
    let urlDespues = form.foto_despues

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
      insumos_usados:       insumosUsados,       // ← selector real de insumos
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
  const SECCIONES = ['📋 Evaluación inicial', '✅ Servicios e insumos', '🏁 Cierre']

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <h2 style={s.titulo}>📋 Ficha Técnica</h2>
            <p style={s.subtitulo}>
              🐾 <strong>{mascota?.nombre}</strong> · {mascota?.raza} · {mascota?.tamanio}
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
                fontWeight: seccion === i ? 700 : 400, cursor: 'pointer',
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
                <SelectorBotones opciones={CONDICION_PELAJE} valor={form.condicion_pelaje}
                  onChange={v => set('condicion_pelaje', v)} colorMap={COLOR_PELAJE} />
              </div>
              <div style={s.campo}>
                <label style={s.label}>Condición de la piel</label>
                <SelectorBotones opciones={CONDICION_PIEL} valor={form.condicion_piel}
                  onChange={v => set('condicion_piel', v)} colorMap={COLOR_PIEL} />
              </div>
              <div style={s.campo}>
                <label style={s.label}>Comportamiento al ingreso</label>
                <SelectorBotones opciones={COMPORTAMIENTOS} valor={form.comportamiento}
                  onChange={v => set('comportamiento', v)} colorMap={COLOR_COMP} />
              </div>
              <div style={s.campo}>
                <label style={s.label}>Observaciones al ingreso</label>
                <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical' }}
                  placeholder="Ej: Llegó con el pelaje enredado..."
                  value={form.observaciones_entrada}
                  onChange={e => set('observaciones_entrada', e.target.value)} />
              </div>
              <div style={s.campo}>
                <label style={s.label}>📷 Foto antes del servicio</label>
                <div style={s.fotoBox} onClick={() => document.getElementById('fotoAntes').click()}>
                  <input id="fotoAntes" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => setArchivoAntes(e.target.files[0])} />
                  {archivoAntes ? (
                    <p style={{ margin: 0, color: '#6c63ff', fontWeight: 600, fontSize: 13 }}>📷 {archivoAntes.name}</p>
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

          {/* ── SECCIÓN 1: Servicios e insumos ── */}
          {seccion === 1 && (
            <div style={s.seccion}>

              {/* Progreso general */}
              <div style={s.progreso}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>Progreso del servicio</span>
                  <span style={{ fontSize: 13, color: completadosItems === totalItems ? '#2e7d32' : '#6c63ff', fontWeight: 700 }}>
                    {completadosItems}/{totalItems}
                  </span>
                </div>
                <div style={{ height: 8, background: '#f0f0f0', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${totalItems > 0 ? (completadosItems / totalItems) * 100 : 0}%`,
                    background: completadosItems === totalItems ? '#22c55e' : 'linear-gradient(90deg, #6c63ff, #a78bfa)',
                    borderRadius: 10, transition: 'all 0.3s',
                  }} />
                </div>
              </div>

              {/* ── Checklist de servicios de la cita (OBLIGATORIO) ── */}
              <div style={s.campo}>
                <label style={s.label}>
                  ✅ Servicios de la cita
                  <span style={{
                    marginLeft: 8, fontSize: 10, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 20,
                    background: '#fff3e0', color: '#e65100',
                  }}>
                    OBLIGATORIO para completar ficha
                  </span>
                </label>

                {/* Alerta si hay servicios pendientes */}
                {serviciosPendientes.length > 0 && (
                  <div style={s.alertaChecklist}>
                    <span>⚠️</span>
                    <div>
                      <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 12, color: '#c05500' }}>
                        Servicios pendientes de marcar:
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: '#c05500' }}>
                        {serviciosPendientes.join(' · ')}
                      </p>
                    </div>
                  </div>
                )}

                {serviciosCita.length === 0 ? (
                  <p style={{ color: '#aaa', fontSize: 13 }}>No hay servicios registrados en esta cita</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {serviciosCita.map(servicio => (
                      <label key={servicio}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                          background: form.checklist[servicio] ? '#f0fdf4' : '#fff5f0',
                          border: `1.5px solid ${form.checklist[servicio] ? '#22c55e' : '#fed7aa'}`,
                          transition: 'all 0.15s',
                        }}
                      >
                        <input type="checkbox"
                          checked={form.checklist[servicio] ?? false}
                          onChange={() => toggleCheck(servicio)}
                          style={{ width: 18, height: 18, accentColor: '#6c63ff', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 600, fontSize: 14, color: form.checklist[servicio] ? '#2e7d32' : '#c05500' }}>
                          {form.checklist[servicio] ? '✅ ' : '⭕ '}{servicio}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Pasos adicionales (opcionales) ── */}
              <div style={s.campo}>
                <label style={s.label}>🧹 Pasos adicionales</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {PASOS_ADICIONALES.map(item => (
                    <label key={item}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                        background: form.checklist[item] ? '#f0eeff' : '#fafafa',
                        border: `1.5px solid ${form.checklist[item] ? '#6c63ff' : '#e5e7eb'}`,
                      }}
                    >
                      <input type="checkbox"
                        checked={form.checklist[item] ?? false}
                        onChange={() => toggleCheck(item)}
                        style={{ width: 16, height: 16, accentColor: '#6c63ff', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 13, fontWeight: form.checklist[item] ? 600 : 400, color: form.checklist[item] ? '#6c63ff' : '#555' }}>
                        {item}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Selector de insumos usados ── */}
              <div style={s.campo}>
                <label style={s.label}>
                  🧴 Insumos utilizados
                  <span style={{ marginLeft: 6, fontSize: 11, color: '#888', fontWeight: 400 }}>
                    (se descontarán del inventario al completar la ficha)
                  </span>
                </label>

                {/* Agregar insumo */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    style={{ ...s.input, flex: 1 }}
                    value={insumoAgregar}
                    onChange={e => setInsumoAgregar(e.target.value)}
                  >
                    <option value="">— Seleccionar insumo —</option>
                    {insumosDisponibles
                      .filter(i => !insumosUsados.find(u => u.id_insumo === i.id))
                      .map(i => (
                        <option key={i.id} value={i.id}>
                          {i.nombre} (Stock: {i.stock} {i.unidad})
                        </option>
                      ))
                    }
                  </select>
                  <button
                    type="button"
                    style={{ ...s.btnAgregar, opacity: insumoAgregar ? 1 : 0.5 }}
                    onClick={agregarInsumo}
                    disabled={!insumoAgregar}
                  >
                    + Agregar
                  </button>
                </div>

                {/* Lista de insumos seleccionados */}
                {insumosUsados.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>
                    Sin insumos registrados aún
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                    {insumosUsados.map(item => (
                      <div key={item.id_insumo} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 8,
                        background: '#f0eeff', border: '1px solid #c4b5fd',
                      }}>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#6c63ff' }}>
                          🧴 {item.nombre}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number" min="0.1" step="0.1"
                            value={item.cantidad}
                            onChange={e => setCantidad(item.id_insumo, e.target.value)}
                            style={{
                              width: 60, padding: '4px 8px', borderRadius: 6,
                              border: '1px solid #c4b5fd', fontSize: 13, textAlign: 'center',
                              outline: 'none', background: '#fff',
                            }}
                          />
                          <span style={{ fontSize: 11, color: '#888' }}>{item.unidad}</span>
                        </div>
                        <button type="button"
                          style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: 16, padding: '0 2px' }}
                          onClick={() => quitarInsumo(item.id_insumo)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div style={{ padding: '6px 10px', background: '#ede9fe', borderRadius: 8, fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>
                      📦 {insumosUsados.length} insumo{insumosUsados.length > 1 ? 's' : ''} se descontarán al completar la ficha
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── SECCIÓN 2: Cierre ── */}
          {seccion === 2 && (
            <div style={s.seccion}>

              {/* Alerta de bloqueo si checklist incompleto */}
              {!puedeCompletar && (
                <div style={s.alertaBloqueo}>
                  <span style={{ fontSize: 20 }}>🔒</span>
                  <div>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13, color: '#c62828' }}>
                      No se puede completar la ficha
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: '#c62828' }}>
                      Debes marcar todos los servicios de la cita en el paso anterior:
                    </p>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 12, color: '#c62828' }}>
                      {serviciosPendientes.map(s => <li key={s}>{s}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              <div style={s.campo}>
                <label style={s.label}>⏱ Tiempo real del servicio (min)</label>
                <input style={s.input} type="number" min="10" max="480" step="5"
                  placeholder="Ej: 90"
                  value={form.tiempo_servicio}
                  onChange={e => set('tiempo_servicio', e.target.value)} />
              </div>

              <div style={s.campo}>
                <label style={s.label}>Observaciones al finalizar</label>
                <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical' }}
                  placeholder="Ej: Mascota tranquila durante todo el proceso..."
                  value={form.observaciones_salida}
                  onChange={e => set('observaciones_salida', e.target.value)} />
              </div>

              <div style={s.campo}>
                <label style={s.label}>💡 Recomendaciones para el cliente</label>
                <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical' }}
                  placeholder="Ej: Recomendar baño cada 3 semanas..."
                  value={form.recomendaciones}
                  onChange={e => set('recomendaciones', e.target.value)} />
              </div>

              <div style={s.campo}>
                <label style={s.label}>📷 Foto después del servicio</label>
                <div style={s.fotoBox} onClick={() => document.getElementById('fotoDespues').click()}>
                  <input id="fotoDespues" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => setArchivoDespues(e.target.files[0])} />
                  {archivoDespues ? (
                    <p style={{ margin: 0, color: '#6c63ff', fontWeight: 600, fontSize: 13 }}>📷 {archivoDespues.name}</p>
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

              {/* Resumen final */}
              <div style={s.resumenBox}>
                <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13, color: '#6c63ff' }}>📋 Resumen</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                  <span style={{ color: '#888' }}>Pelaje:</span>
                  <span style={{ fontWeight: 600 }}>{form.condicion_pelaje}</span>
                  <span style={{ color: '#888' }}>Piel:</span>
                  <span style={{ fontWeight: 600 }}>{form.condicion_piel}</span>
                  <span style={{ color: '#888' }}>Servicios:</span>
                  <span style={{ fontWeight: 600, color: puedeCompletar ? '#2e7d32' : '#c62828' }}>
                    {serviciosCita.filter(s => form.checklist[s]).length}/{serviciosCita.length}
                    {puedeCompletar ? ' ✅' : ' ⚠️ incompleto'}
                  </span>
                  <span style={{ color: '#888' }}>Insumos:</span>
                  <span style={{ fontWeight: 600, color: '#6c63ff' }}>
                    {insumosUsados.length} a descontar
                  </span>
                  {form.tiempo_servicio && (
                    <>
                      <span style={{ color: '#888' }}>Tiempo:</span>
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
          <div style={{ display: 'flex', gap: 8 }}>
            {seccion > 0 && (
              <button style={s.btnNavegar} onClick={() => setSeccion(p => p - 1)}>← Anterior</button>
            )}
            {seccion < 2 && (
              <button style={{ ...s.btnNavegar, background: '#f0eeff', color: '#6c63ff' }}
                onClick={() => setSeccion(p => p + 1)}>
                Siguiente →
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{ ...s.btnGuardar, background: '#f3f4f6', color: '#555', opacity: loading ? 0.6 : 1 }}
              onClick={() => handleGuardar(false)} disabled={loading}
            >
              {loading && !subiendo ? 'Guardando...' : '💾 Guardar borrador'}
            </button>

            {seccion === 2 && (
              <button
                style={{
                  ...s.btnGuardar,
                  opacity: (loading || !puedeCompletar) ? 0.5 : 1,
                  cursor:  !puedeCompletar ? 'not-allowed' : 'pointer',
                  background: !puedeCompletar ? '#9ca3af' : '#6c63ff',
                  position: 'relative',
                }}
                onClick={() => handleGuardar(true)}
                disabled={loading || !puedeCompletar}
                title={!puedeCompletar ? `Faltan por marcar: ${serviciosPendientes.join(', ')}` : ''}
              >
                {subiendo ? 'Subiendo fotos...' :
                 loading  ? 'Completando...'   :
                 !puedeCompletar ? `🔒 Checklist incompleto` :
                 '✅ Completar ficha'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

const s = {
  overlay:        { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal:          { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' },
  header:         { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 },
  titulo:         { margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1a1a2e' },
  subtitulo:      { margin: '0 0 4px', fontSize: 13, color: '#555' },
  btnCerrar:      { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999', flexShrink: 0 },
  alertaAlergia:  { marginTop: 6, padding: '6px 12px', background: '#fff3e0', border: '1px solid #f97316', borderRadius: 8, fontSize: 12, color: '#c05500' },
  pasos:          { display: 'flex', gap: 6, padding: '12px 24px', borderBottom: '1px solid #f5f5f5', flexShrink: 0 },
  paso:           { flex: 1, padding: '7px 0', border: 'none', borderRadius: 8, fontSize: 11, textAlign: 'center' },
  body:           { padding: '20px 24px', overflowY: 'auto', flex: 1 },
  seccion:        { display: 'flex', flexDirection: 'column', gap: 16 },
  campo:          { display: 'flex', flexDirection: 'column', gap: 6 },
  label:          { fontSize: 13, fontWeight: 600, color: '#444' },
  input:          { padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fafafa', color: '#333', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  fotoBox:        { border: '2px dashed #e5e7eb', borderRadius: 10, padding: '16px', textAlign: 'center', cursor: 'pointer', background: '#fafafa', minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  progreso:       { background: '#f8f8ff', border: '1px solid #ede9fe', borderRadius: 10, padding: '12px 14px' },
  alertaChecklist:{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 8 },
  alertaBloqueo:  { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10 },
  resumenBox:     { background: '#f8f8ff', border: '1px solid #ede9fe', borderRadius: 10, padding: '14px 16px' },
  btnAgregar:     { padding: '9px 14px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  footer:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '14px 24px', borderTop: '1px solid #f0f0f0', flexShrink: 0, flexWrap: 'wrap' },
  btnNavegar:     { padding: '8px 16px', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnGuardar:     { padding: '9px 18px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
}
