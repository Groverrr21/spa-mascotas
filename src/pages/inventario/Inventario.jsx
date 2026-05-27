import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useInventario } from './useInventario'
import InsumoModal from './InsumoModal'
import MovimientoModal from './MovimientoModal'

const CATEGORIAS = ['TODOS', 'HIGIENE', 'HERRAMIENTAS', 'MEDICAMENTOS', 'ACCESORIOS', 'LIMPIEZA', 'OTROS']

const COLOR_CAT = {
  HIGIENE:       { bg: '#e3f2fd', color: '#1565c0', icono: '🧴' },
  HERRAMIENTAS:  { bg: '#fff3e0', color: '#e65100', icono: '✂️' },
  MEDICAMENTOS:  { bg: '#fce4ec', color: '#c62828', icono: '💊' },
  ACCESORIOS:    { bg: '#f3e5f5', color: '#6a1b9a', icono: '🎀' },
  LIMPIEZA:      { bg: '#e8f5e9', color: '#2e7d32', icono: '🧹' },
  OTROS:         { bg: '#f5f5f5', color: '#555555', icono: '📦' },
}

const COLOR_MOV = {
  ENTRADA:    { bg: '#e8f5e9', color: '#2e7d32', icono: '📦' },
  SALIDA:     { bg: '#e3f2fd', color: '#1565c0', icono: '📤' },
  MERMA:      { bg: '#ffebee', color: '#c62828', icono: '⚠️' },
  DEVOLUCION: { bg: '#fff3e0', color: '#e65100', icono: '↩️' },
}

const NIVEL_CONFIG = {
  CRITICO:  { color: '#c62828', bg: '#ffebee', icono: '🔴', label: 'Crítico'  },
  ALTO:     { color: '#e65100', bg: '#fff3e0', icono: '🟠', label: 'Alto'     },
  MODERADO: { color: '#1565c0', bg: '#e3f2fd', icono: '🔵', label: 'Moderado' },
}

function formatFecha(f) {
  return new Date(f).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

function BarraStock({ stock, minimo }) {
  const pct   = minimo > 0 ? Math.min((stock / (minimo * 3)) * 100, 100) : 100
  const color = stock <= 0        ? '#e53e3e'
              : stock <= minimo   ? '#f97316'
              : stock <= minimo*2 ? '#3b82f6'
              : '#22c55e'
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 6, borderRadius: 10, background: '#f0f0f0', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 10, transition: 'all 0.3s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 11, color, fontWeight: 600 }}>
          {stock <= 0 ? '🔴 Sin stock' : stock <= minimo ? '🟠 Stock bajo' : '🟢 Stock OK'}
        </span>
        <span style={{ fontSize: 11, color: '#aaa' }}>Mín: {minimo}</span>
      </div>
    </div>
  )
}

export default function Inventario() {
  const { perfil } = useAuth()
  const esAdmin   = perfil?.rol === 'ADMINISTRADOR'

  const {
    insumos, movimientos, loading, loadingMov,
    alertasBajoStock, alertasConsumoElevado, valorTotal,
    crearInsumo, editarInsumo, eliminarInsumo,
    registrarMovimiento,
  } = useInventario()

  const [tab,          setTab]          = useState('insumos')
  const [filtroCateg,  setFiltroCateg]  = useState('TODOS')
  const [busqueda,     setBusqueda]     = useState('')
  const [modalInsumo,  setModalInsumo]  = useState(false)
  const [insumoEditar, setInsumoEditar] = useState(null)
  const [modalMovim,   setModalMovim]   = useState(false)
  const [insumoMovim,  setInsumoMovim]  = useState(null)

  const insumosFiltrados = insumos.filter(i => {
    const matchCateg = filtroCateg === 'TODOS' || i.categoria === filtroCateg
    const matchBusq  = !busqueda || i.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return matchCateg && matchBusq
  })

  const abrirCrear      = () => { setInsumoEditar(null); setModalInsumo(true) }
  const abrirEditar     = (i) => { setInsumoEditar(i);   setModalInsumo(true) }
  const abrirMovimiento = (i) => { setInsumoMovim(i);    setModalMovim(true)  }

  const handleGuardarInsumo = async (datos) => {
    if (insumoEditar) return await editarInsumo(insumoEditar.id, datos)
    return await crearInsumo(datos)
  }

  const handleEliminar = async (insumo) => {
    if (window.confirm(`¿Eliminar "${insumo.nombre}"? Esta acción no se puede deshacer.`))
      await eliminarInsumo(insumo.id, insumo.nombre)
  }

  return (
    <div>

      {/* Encabezado */}
      <div style={es.encabezado}>
        <div>
          <h1 style={es.titulo}>📦 Inventario</h1>
          <p style={es.subtitulo}>
            {loading ? 'Cargando...' : `${insumos.length} insumo${insumos.length !== 1 ? 's' : ''} registrado${insumos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {esAdmin && (
          <button style={es.btnAgregar} onClick={abrirCrear}>+ Nuevo insumo</button>
        )}
      </div>

      {/* Stats */}
      <div style={es.statsGrid}>
        <div style={{ ...es.statCard, borderLeft: '4px solid #6c63ff' }}>
          <span style={es.statNum}>{insumos.length}</span>
          <span style={es.statLabel}>Total insumos</span>
        </div>
        <div style={{ ...es.statCard, borderLeft: '4px solid #e53e3e' }}>
          <span style={{ ...es.statNum, color: alertasBajoStock.length > 0 ? '#e53e3e' : '#22c55e' }}>
            {alertasBajoStock.length}
          </span>
          <span style={es.statLabel}>Stock bajo / agotado</span>
        </div>
        <div style={{ ...es.statCard, borderLeft: '4px solid #f97316' }}>
          <span style={{ ...es.statNum, color: alertasConsumoElevado.length > 0 ? '#f97316' : '#22c55e' }}>
            {alertasConsumoElevado.length}
          </span>
          <span style={es.statLabel}>Consumo elevado</span>
        </div>
        <div style={{ ...es.statCard, borderLeft: '4px solid #22c55e' }}>
          <span style={{ ...es.statNum, color: '#22c55e', fontSize: 18 }}>
            Bs. {valorTotal.toFixed(2)}
          </span>
          <span style={es.statLabel}>Valor total inventario</span>
        </div>
      </div>

      {/* Alerta stock bajo */}
      {alertasBajoStock.length > 0 && (
        <div style={es.alertaBaja}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <strong>Stock bajo o agotado:</strong>{' '}
            {alertasBajoStock.map(i => i.nombre).join(', ')}
          </div>
        </div>
      )}

      {/* ── Alerta de consumo elevado ── */}
      {alertasConsumoElevado.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={es.alertaConsumoHeader}>
            <span style={{ fontSize: 18 }}>📈</span>
            <strong>
              Alerta de consumo elevado — {alertasConsumoElevado.length} insumo{alertasConsumoElevado.length > 1 ? 's' : ''} con stock proyectado para menos de 7 días
            </strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alertasConsumoElevado.map(item => {
              const cfg = NIVEL_CONFIG[item.nivel]
              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px', borderRadius: 10,
                  background: cfg.bg,
                  border: `1px solid ${cfg.color}30`,
                }}>
                  <span style={{ fontSize: 20 }}>{cfg.icono}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: cfg.color }}>
                        {item.nombre}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px',
                        borderRadius: 20, background: cfg.color, color: '#fff',
                      }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: cfg.color }}>
                      Stock actual: <strong>{item.stock} {item.unidad}</strong>
                      {' · '}Consumo 7 días: <strong>{item.totalConsumido7d} {item.unidad}</strong>
                      {' · '}Promedio diario: <strong>{item.consumoDiario} {item.unidad}/día</strong>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: cfg.color }}>
                      {item.diasRestantes < 1 ? '<1' : item.diasRestantes}
                    </p>
                    <p style={{ margin: 0, fontSize: 10, color: cfg.color, fontWeight: 600 }}>
                      {item.diasRestantes < 1 ? 'SE AGOTA HOY' : `día${item.diasRestantes !== 1 ? 's' : ''} restante${item.diasRestantes !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={es.tabs}>
        {[
          { id: 'insumos',      label: '📋 Insumos' },
          { id: 'movimientos',  label: '🔄 Historial de movimientos' },
        ].map(t => (
          <button key={t.id}
            style={{ ...es.tab, ...(tab === t.id ? es.tabActivo : {}) }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB INSUMOS ── */}
      {tab === 'insumos' && (
        <>
          {/* Buscador + Filtros */}
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
              <input
                style={es.buscador}
                placeholder="Buscar insumo..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIAS.map(cat => (
                <button key={cat}
                  style={{
                    padding: '5px 14px', border: 'none', borderRadius: 20,
                    fontSize: 12, cursor: 'pointer',
                    background: filtroCateg === cat ? '#6c63ff' : '#f3f4f6',
                    color:      filtroCateg === cat ? '#fff'    : '#555',
                    fontWeight: filtroCateg === cat ? 700 : 400,
                  }}
                  onClick={() => setFiltroCateg(cat)}
                >
                  {COLOR_CAT[cat]?.icono ?? ''} {cat}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div style={es.estadoVacio}>
              <span style={{ fontSize: 40 }}>⏳</span>
              <p style={{ color: '#888' }}>Cargando inventario...</p>
            </div>
          )}

          {!loading && insumosFiltrados.length === 0 && (
            <div style={es.estadoVacio}>
              <span style={{ fontSize: 64 }}>📦</span>
              <h3 style={{ margin: '12px 0 4px', color: '#333' }}>Sin insumos</h3>
              <p style={{ color: '#888', margin: '0 0 16px' }}>
                {busqueda ? `No se encontró "${busqueda}"` : 'Agrega el primer insumo al inventario'}
              </p>
              {esAdmin && (
                <button style={es.btnAgregar} onClick={abrirCrear}>+ Agregar insumo</button>
              )}
            </div>
          )}

          {!loading && insumosFiltrados.length > 0 && (
            <div style={es.grid}>
              {insumosFiltrados.map(insumo => {
                const cfg    = COLOR_CAT[insumo.categoria] ?? COLOR_CAT.OTROS
                const sinStock = parseFloat(insumo.stock) <= 0
                const alerta = alertasConsumoElevado.find(a => a.id === insumo.id)

                return (
                  <div key={insumo.id} style={{
                    ...es.card,
                    borderTop: alerta
                      ? `3px solid ${NIVEL_CONFIG[alerta.nivel].color}`
                      : sinStock
                        ? '3px solid #e53e3e'
                        : '3px solid transparent',
                  }}>
                    {/* Cabecera */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ ...es.cardIcono, background: cfg.bg, color: cfg.color }}>
                          {cfg.icono}
                        </div>
                        <div>
                          <h3 style={es.cardNombre}>{insumo.nombre}</h3>
                          <span style={{ ...es.tag, background: cfg.bg, color: cfg.color }}>
                            {insumo.categoria}
                          </span>
                        </div>
                      </div>
                      {/* Badge consumo elevado */}
                      {alerta && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 8px',
                          borderRadius: 20, whiteSpace: 'nowrap',
                          background: NIVEL_CONFIG[alerta.nivel].color,
                          color: '#fff',
                        }}>
                          📈 {NIVEL_CONFIG[alerta.nivel].label}
                        </span>
                      )}
                    </div>

                    {/* Stock */}
                    <div style={{ padding: '10px 0', borderTop: '1px solid #f5f5f5' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 26, fontWeight: 800, color: sinStock ? '#e53e3e' : '#1a1a2e' }}>
                          {parseFloat(insumo.stock).toFixed(0)}
                        </span>
                        <span style={{ fontSize: 13, color: '#888' }}>{insumo.unidad}</span>
                      </div>
                      <BarraStock stock={parseFloat(insumo.stock)} minimo={parseFloat(insumo.stock_minimo)} />

                      {/* Info de días restantes si hay alerta */}
                      {alerta && (
                        <p style={{
                          margin: '6px 0 0', fontSize: 11, fontWeight: 600,
                          color: NIVEL_CONFIG[alerta.nivel].color,
                        }}>
                          📈 Al ritmo actual se agota en{' '}
                          {alerta.diasRestantes < 1 ? 'menos de 1 día' : `~${alerta.diasRestantes} días`}
                          {' '}· Consumo: {alerta.consumoDiario} {insumo.unidad}/día
                        </p>
                      )}
                    </div>

                    {/* Precio unitario */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#aaa' }}>Precio unitario</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#6c63ff' }}>
                        Bs. {parseFloat(insumo.precio_unitario).toFixed(2)}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid #f5f5f5' }}>
                      <button style={{ ...es.btnMovimiento, flex: 1 }} onClick={() => abrirMovimiento(insumo)}>
                        🔄 Movimiento
                      </button>
                      {esAdmin && (
                        <>
                          <button style={es.btnEditar}   onClick={() => abrirEditar(insumo)}>✏️</button>
                          <button style={es.btnEliminar} onClick={() => handleEliminar(insumo)}>🗑️</button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── TAB MOVIMIENTOS ── */}
      {tab === 'movimientos' && (
        <div>
          {loadingMov && (
            <div style={es.estadoVacio}>
              <span style={{ fontSize: 40 }}>⏳</span>
              <p style={{ color: '#888' }}>Cargando historial...</p>
            </div>
          )}
          {!loadingMov && movimientos.length === 0 && (
            <div style={es.estadoVacio}>
              <span style={{ fontSize: 64 }}>📋</span>
              <h3 style={{ margin: '12px 0 4px', color: '#333' }}>Sin movimientos aún</h3>
              <p style={{ color: '#888', margin: 0 }}>Los movimientos de stock aparecerán aquí</p>
            </div>
          )}
          {!loadingMov && movimientos.length > 0 && (
            <div style={es.tablaWrapper}>
              <table style={es.tabla}>
                <thead>
                  <tr style={{ background: '#1a1a2e' }}>
                    {['Tipo', 'Insumo', 'Cantidad', 'Responsable', 'Observación', 'Fecha'].map(h => (
                      <th key={h} style={es.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov, i) => {
                    const cfg = COLOR_MOV[mov.tipo] ?? COLOR_MOV.ENTRADA
                    return (
                      <tr key={mov.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={es.td}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 20,
                            background: cfg.bg, color: cfg.color,
                            fontSize: 11, fontWeight: 700,
                          }}>
                            {cfg.icono} {mov.tipo}
                          </span>
                        </td>
                        <td style={{ ...es.td, fontWeight: 600, color: '#333' }}>{mov.insumo?.nombre ?? '—'}</td>
                        <td style={{ ...es.td, fontWeight: 700, color: cfg.color }}>
                          {mov.tipo === 'ENTRADA' || mov.tipo === 'DEVOLUCION' ? '+' : '-'}
                          {mov.cantidad} {mov.insumo?.unidad ?? ''}
                        </td>
                        <td style={{ ...es.td, color: '#555', fontSize: 13 }}>{mov.responsable?.nombre ?? '—'}</td>
                        <td style={{ ...es.td, color: '#888', fontSize: 12, maxWidth: 200 }}>{mov.observacion || '—'}</td>
                        <td style={{ ...es.td, color: '#aaa', fontSize: 12, whiteSpace: 'nowrap' }}>
                          📅 {formatFecha(mov.fecha)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modalInsumo && (
        <InsumoModal
          insumo={insumoEditar}
          onGuardar={handleGuardarInsumo}
          onCerrar={() => { setModalInsumo(false); setInsumoEditar(null) }}
        />
      )}

      {modalMovim && insumoMovim && (
        <MovimientoModal
          insumo={insumoMovim}
          perfil={perfil}
          onGuardar={registrarMovimiento}
          onCerrar={() => { setModalMovim(false); setInsumoMovim(null) }}
        />
      )}

    </div>
  )
}

const es = {
  encabezado:         { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  titulo:             { margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' },
  subtitulo:          { margin: 0, color: '#888', fontSize: 14 },
  btnAgregar:         { padding: '10px 20px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  statsGrid:          { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 },
  statCard:           { background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 4 },
  statNum:            { fontSize: 26, fontWeight: 800, color: '#6c63ff', lineHeight: 1 },
  statLabel:          { fontSize: 12, color: '#888', fontWeight: 600 },
  alertaBaja:         { display: 'flex', alignItems: 'center', gap: 10, background: '#fff3e0', border: '1px solid #f97316', borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: '#c05500' },
  alertaConsumoHeader:{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff3e0', border: '1px solid #f97316', borderRadius: '10px 10px 0 0', padding: '10px 16px', fontSize: 13, color: '#c05500', fontWeight: 600, marginBottom: 4 },
  tabs:               { display: 'flex', background: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 },
  tab:                { flex: 1, padding: '9px 0', background: 'transparent', border: 'none', borderRadius: 10, color: '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  tabActivo:          { background: '#fff', color: '#6c63ff', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
  buscador:           { width: '100%', padding: '10px 10px 10px 38px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' },
  estadoVacio:        { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, textAlign: 'center' },
  grid:               { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 },
  card:               { background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 10 },
  cardIcono:          { width: 40, height: 40, minWidth: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  cardNombre:         { margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#1a1a2e' },
  tag:                { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 },
  btnMovimiento:      { padding: '7px 0', background: '#f0eeff', color: '#6c63ff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnEditar:          { padding: '7px 10px', background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  btnEliminar:        { padding: '7px 10px', background: '#fff0f0', color: '#e53e3e', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  tablaWrapper:       { background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', overflowX: 'auto' },
  tabla:              { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:                 { padding: '11px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' },
  td:                 { padding: '11px 16px', verticalAlign: 'middle', borderBottom: '1px solid #f5f5f5' },
}
