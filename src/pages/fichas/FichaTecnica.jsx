import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useFichaTecnica } from './useFichaTecnica'
import FichaModal from './FichaModal'

const COLOR_COND = {
  BUENO:        { bg: '#e8f5e9', color: '#2e7d32' },
  REGULAR:      { bg: '#fff3e0', color: '#e65100' },
  MALO:         { bg: '#ffebee', color: '#c62828' },
  MUY_MALO:     { bg: '#fce4ec', color: '#880e4f' },
  NORMAL:       { bg: '#e8f5e9', color: '#2e7d32' },
  SECA:         { bg: '#fff3e0', color: '#e65100' },
  GRASA:        { bg: '#e3f2fd', color: '#1565c0' },
  CON_LESIONES: { bg: '#ffebee', color: '#c62828' },
  TRANQUILO:    { bg: '#e8f5e9', color: '#2e7d32' },
  NERVIOSO:     { bg: '#fff3e0', color: '#e65100' },
  AGRESIVO:     { bg: '#ffebee', color: '#c62828' },
  INQUIETO:     { bg: '#e3f2fd', color: '#1565c0' },
}

function Badge({ texto }) {
  const c = COLOR_COND[texto] ?? { bg: '#f5f5f5', color: '#888' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: c.bg, color: c.color }}>
      {texto}
    </span>
  )
}

function formatFecha(f) {
  return new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function FichaTecnica() {
  const { perfil } = useAuth()
  const { fichas, loading, guardarFicha, buscarFichaPorCita, subirFoto } = useFichaTecnica(perfil)

  const [modalAbierto,   setModalAbierto]   = useState(false)
  const [citaSeleccionada, setCitaSeleccionada] = useState(null)
  const [fichaSeleccionada, setFichaSeleccionada] = useState(null)
  const [filtro,         setFiltro]         = useState('TODAS')
  const [buscando,       setBuscando]       = useState(false)

  const fichasFiltradas = filtro === 'TODAS'
    ? fichas
    : filtro === 'COMPLETADAS'
      ? fichas.filter(f => f.completada)
      : fichas.filter(f => !f.completada)

  const abrirFicha = async (ficha) => {
    setBuscando(true)
    const fichaData = await buscarFichaPorCita(ficha.id_cita)
    setFichaSeleccionada(fichaData)
    setCitaSeleccionada(ficha.cita)
    setBuscando(false)
    setModalAbierto(true)
  }

  return (
    <div>

      {/* Encabezado */}
      <div style={es.encabezado}>
        <div>
          <h1 style={es.titulo}>📋 Fichas Técnicas</h1>
          <p style={es.subtitulo}>
            {loading ? 'Cargando...' : `${fichas.length} ficha${fichas.length !== 1 ? 's' : ''} registrada${fichas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Stats rápidos */}
      {!loading && fichas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total fichas',   valor: fichas.length,                                   color: '#6c63ff' },
            { label: 'Completadas',    valor: fichas.filter(f => f.completada).length,          color: '#2e7d32' },
            { label: 'En progreso',    valor: fichas.filter(f => !f.completada).length,         color: '#e65100' },
            { label: 'Con fotos',      valor: fichas.filter(f => f.foto_antes || f.foto_despues).length, color: '#1565c0' },
          ].map((stat, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: `4px solid ${stat.color}` }}>
              <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.valor}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#888', fontWeight: 600 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['TODAS', 'COMPLETADAS', 'EN PROGRESO'].map(f => (
          <button key={f}
            style={{
              padding: '6px 16px', border: 'none', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              background: filtro === f ? '#6c63ff' : '#f3f4f6',
              color:      filtro === f ? '#fff'    : '#555',
              fontWeight: filtro === f ? 700 : 400,
            }}
            onClick={() => setFiltro(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Cargando */}
      {(loading || buscando) && (
        <div style={es.estadoVacio}>
          <span style={{ fontSize: 40 }}>⏳</span>
          <p style={{ color: '#888' }}>Cargando fichas...</p>
        </div>
      )}

      {/* Sin fichas */}
      {!loading && fichasFiltradas.length === 0 && (
        <div style={es.estadoVacio}>
          <span style={{ fontSize: 64 }}>📋</span>
          <h3 style={{ margin: '12px 0 4px', color: '#333' }}>
            {filtro === 'TODAS' ? 'Sin fichas técnicas aún' : `Sin fichas ${filtro.toLowerCase()}`}
          </h3>
          <p style={{ color: '#888', margin: 0, fontSize: 13 }}>
            Las fichas se crean desde la sección de <strong>Citas</strong> al hacer clic en "📋 Ficha"
          </p>
        </div>
      )}

      {/* Lista de fichas */}
      {!loading && fichasFiltradas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fichasFiltradas.map(ficha => {
            const mascota = ficha.cita?.mascota
            const servicios = (ficha.cita?.cita_servicio ?? []).map(cs => cs.servicio?.nombre).filter(Boolean)
            const checklistItems = Object.entries(ficha.checklist ?? {})
            const completados = checklistItems.filter(([, v]) => v).length

            return (
              <div key={ficha.id} style={{
                ...es.card,
                borderLeft: `4px solid ${ficha.completada ? '#2e7d32' : '#6c63ff'}`,
                opacity: 1,
              }}>

                {/* Fila superior */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: ficha.completada ? '#e8f5e9' : '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      🐾
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>
                          {mascota?.nombre ?? '—'}
                        </h3>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                          background: ficha.completada ? '#e8f5e9' : '#f0eeff',
                          color:      ficha.completada ? '#2e7d32' : '#6c63ff',
                        }}>
                          {ficha.completada ? '✅ COMPLETADA' : '🔄 EN PROGRESO'}
                        </span>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>
                        {mascota?.raza} · {mascota?.tamanio} · {formatFecha(ficha.created_at)}
                      </p>
                    </div>
                  </div>

                  <button style={es.btnVer} onClick={() => abrirFicha(ficha)}>
                    {ficha.completada ? '👁️ Ver ficha' : '✏️ Editar ficha'}
                  </button>
                </div>

                {/* Badges de condición */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Badge texto={ficha.condicion_pelaje} />
                  <Badge texto={ficha.condicion_piel} />
                  <Badge texto={ficha.comportamiento} />
                </div>

                {/* Progreso checklist */}
                {checklistItems.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#888' }}>Checklist de servicios</span>
                      <span style={{ color: '#6c63ff', fontWeight: 700 }}>{completados}/{checklistItems.length}</span>
                    </div>
                    <div style={{ height: 5, background: '#f0f0f0', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${checklistItems.length > 0 ? (completados / checklistItems.length) * 100 : 0}%`,
                        background: 'linear-gradient(90deg, #6c63ff, #a78bfa)',
                        borderRadius: 10,
                      }} />
                    </div>
                  </div>
                )}

                {/* Info adicional */}
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#888', flexWrap: 'wrap' }}>
                  {ficha.tiempo_servicio && (
                    <span>⏱ {ficha.tiempo_servicio} min</span>
                  )}
                  {ficha.foto_antes && <span>📷 Foto antes</span>}
                  {ficha.foto_despues && <span>📷 Foto después</span>}
                  {ficha.recomendaciones && (
                    <span style={{ color: '#6c63ff' }}>💡 Con recomendaciones</span>
                  )}
                  {ficha.groomer?.nombre && (
                    <span>✂️ {ficha.groomer.nombre}</span>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* Modal ficha */}
      {modalAbierto && citaSeleccionada && (
        <FichaModal
          cita={citaSeleccionada}
          fichaExistente={fichaSeleccionada}
          perfil={perfil}
          onGuardar={{ guardar: guardarFicha, subirFoto }}
          onCerrar={() => { setModalAbierto(false); setCitaSeleccionada(null); setFichaSeleccionada(null) }}
        />
      )}

    </div>
  )
}

const es = {
  encabezado:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  titulo:      { margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' },
  subtitulo:   { margin: 0, color: '#888', fontSize: 14 },
  estadoVacio: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, textAlign: 'center' },
  card:        { background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 12 },
  btnVer:      { padding: '7px 16px', background: '#f0eeff', color: '#6c63ff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
}
