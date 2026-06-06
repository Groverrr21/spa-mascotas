import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useFacturas } from './useFacturas'
import FacturaModal from './FacturaModal'

function formatFecha(f) {
  return new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatHora(f) {
  return new Date(f).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const METODO_CONFIG = {
  EFECTIVO:      { icono: '💵', label: 'Efectivo',      bg: '#e8f5e9', color: '#2e7d32' },
  QR:            { icono: '📱', label: 'QR',            bg: '#e3f2fd', color: '#1565c0' },
  TRANSFERENCIA: { icono: '🏦', label: 'Transferencia', bg: '#f3e5f5', color: '#6a1b9a' },
}

const TIPO_CONFIG = {
  SERVICIO: { icono: '✂️', label: 'Servicio',    bg: '#f0eeff', color: '#6c63ff' },
  TIENDA:   { icono: '🛍️', label: 'Tienda',      bg: '#e8f5e9', color: '#2e7d32' },
}

const COLOR_CAT = {
  HIGIENE:      '🧴', ACCESORIOS: '🎀', MEDICAMENTOS: '💊',
  SNACKS:       '🦴', JUGUETES:   '🎾', OTROS:        '📦',
}

export default function Facturas() {
  const { perfil } = useAuth()
  const { facturas, citasSinFactura, loading, emitirFactura } = useFacturas()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [filtroTipo,   setFiltroTipo]   = useState('TODOS')

  const facturasFiltradas = filtroTipo === 'TODOS'
    ? facturas
    : facturas.filter(f => (f.tipo ?? 'SERVICIO') === filtroTipo)

  const totalGeneral    = facturasFiltradas.reduce((s, f) => s + parseFloat(f.total ?? 0), 0)
  const totalServicio   = facturas.filter(f => (f.tipo ?? 'SERVICIO') === 'SERVICIO').reduce((s, f) => s + parseFloat(f.total ?? 0), 0)
  const totalTienda     = facturas.filter(f => f.tipo === 'TIENDA').reduce((s, f) => s + parseFloat(f.total ?? 0), 0)

  // Desglose por método
  const totalesPorMetodo = facturasFiltradas.reduce((acc, f) => {
    const m = f.metodo_pago ?? 'EFECTIVO'
    acc[m] = (acc[m] ?? 0) + parseFloat(f.total ?? 0)
    return acc
  }, {})

  return (
    <div>

      {/* Encabezado */}
      <div style={es.encabezado}>
        <div>
          <h1 style={es.titulo}>🧾 Facturas</h1>
          <p style={es.subtitulo}>
            {loading ? 'Cargando...' : `${facturas.length} factura${facturas.length !== 1 ? 's' : ''} emitida${facturas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button style={es.btnAgregar} onClick={() => setModalAbierto(true)}>
          + Nueva factura
        </button>
      </div>

      {/* Stats generales */}
      {!loading && facturas.length > 0 && (
        <>
          <div style={es.statsGrid}>
            <div style={{ ...es.statCard, borderLeft: '4px solid #6c63ff' }}>
              <span style={es.statNum}>Bs. {totalGeneral.toFixed(2)}</span>
              <span style={es.statLabel}>Total facturado</span>
            </div>
            <div style={{ ...es.statCard, borderLeft: `4px solid ${TIPO_CONFIG.SERVICIO.color}` }}>
              <span style={{ ...es.statNum, color: TIPO_CONFIG.SERVICIO.color }}>
                Bs. {totalServicio.toFixed(2)}
              </span>
              <span style={es.statLabel}>✂️ Por servicios</span>
            </div>
            <div style={{ ...es.statCard, borderLeft: `4px solid ${TIPO_CONFIG.TIENDA.color}` }}>
              <span style={{ ...es.statNum, color: TIPO_CONFIG.TIENDA.color }}>
                Bs. {totalTienda.toFixed(2)}
              </span>
              <span style={es.statLabel}>🛍️ Por tienda</span>
            </div>
            <div style={{ ...es.statCard, borderLeft: '4px solid #e65100' }}>
              <span style={{ ...es.statNum, color: citasSinFactura.length > 0 ? '#e65100' : '#2e7d32' }}>
                {citasSinFactura.length}
              </span>
              <span style={es.statLabel}>Citas sin facturar</span>
            </div>
          </div>

          {/* Desglose por método */}
          {Object.entries(totalesPorMetodo).length > 0 && (
            <div style={es.metodosGrid}>
              {Object.entries(totalesPorMetodo).map(([m, total]) => {
                const cfg = METODO_CONFIG[m] ?? METODO_CONFIG.EFECTIVO
                return (
                  <div key={m} style={{ ...es.metodoCard, borderLeft: `4px solid ${cfg.color}` }}>
                    <span style={{ fontSize: 20 }}>{cfg.icono}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: '#888', fontWeight: 600 }}>{cfg.label}</p>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: cfg.color }}>Bs. {total.toFixed(2)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Filtro por tipo */}
      {!loading && facturas.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { id: 'TODOS',    label: 'Todos',          icono: '🧾' },
            { id: 'SERVICIO', label: 'Servicios (spa)', icono: '✂️' },
            { id: 'TIENDA',   label: 'Tienda',          icono: '🛍️' },
          ].map(f => (
            <button key={f.id}
              style={{
                padding: '7px 16px', border: 'none', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                background: filtroTipo === f.id ? '#6c63ff' : '#f3f4f6',
                color:      filtroTipo === f.id ? '#fff'    : '#555',
                fontWeight: filtroTipo === f.id ? 700 : 400,
              }}
              onClick={() => setFiltroTipo(f.id)}
            >
              {f.icono} {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Cargando */}
      {loading && (
        <div style={es.estadoVacio}>
          <span style={{ fontSize: 40 }}>⏳</span>
          <p style={{ color: '#888' }}>Cargando facturas...</p>
        </div>
      )}

      {/* Sin facturas */}
      {!loading && facturasFiltradas.length === 0 && (
        <div style={es.estadoVacio}>
          <span style={{ fontSize: 64 }}>🧾</span>
          <h3 style={{ margin: '12px 0 4px', color: '#333' }}>
            {filtroTipo === 'TODOS' ? 'No hay facturas aún' : `No hay facturas de ${filtroTipo.toLowerCase()}`}
          </h3>
          {filtroTipo === 'TODOS' && (
            <button style={{ ...es.btnAgregar, marginTop: 12 }} onClick={() => setModalAbierto(true)}>
              + Emitir primera factura
            </button>
          )}
        </div>
      )}

      {/* Lista */}
      {!loading && facturasFiltradas.length > 0 && (
        <div style={es.lista}>
          {facturasFiltradas.map((factura, index) => {
            const cfgMetodo = METODO_CONFIG[factura.metodo_pago] ?? METODO_CONFIG.EFECTIVO
            const cfgTipo   = TIPO_CONFIG[factura.tipo ?? 'SERVICIO'] ?? TIPO_CONFIG.SERVICIO
            const nro       = String(facturasFiltradas.length - index).padStart(4, '0')
            const esTienda  = factura.tipo === 'TIENDA'

            return (
              <div key={factura.id} style={es.card}>

                {/* Header */}
                <div style={es.cardHeader}>
                  <div>
                    <span style={es.nroLabel}>FACTURA</span>
                    <p style={es.nroValor}>#{nro}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                    <p style={es.fechaEmision}>📅 {formatFecha(factura.fecha_emision)}</p>
                    <p style={es.horaEmision}>🕐 {formatHora(factura.fecha_emision)}</p>
                    {/* Badge tipo */}
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: cfgTipo.bg, color: cfgTipo.color }}>
                      {cfgTipo.icono} {cfgTipo.label}
                    </span>
                    {/* Badge método */}
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: cfgMetodo.bg, color: cfgMetodo.color }}>
                      {cfgMetodo.icono} {cfgMetodo.label}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div style={es.cardBody}>
                  {esTienda ? (
                    // ── Factura de TIENDA ──
                    <>
                      <div style={es.infoRow}>
                        <span style={es.infoLabel}>Cliente</span>
                        <span style={es.infoValor}>👤 {factura.pedido?.cliente?.nombre ?? '—'}</span>
                      </div>
                      <div style={es.infoRow}>
                        <span style={es.infoLabel}>Canal pedido</span>
                        <span style={es.infoValor}>
                          {factura.pedido?.canal === 'WHATSAPP' ? '💬' : '✈️'} {factura.pedido?.canal ?? '—'}
                        </span>
                      </div>
                    </>
                  ) : (
                    // ── Factura de SERVICIO ──
                    <>
                      <div style={es.infoRow}>
                        <span style={es.infoLabel}>Mascota</span>
                        <span style={es.infoValor}>🐾 {factura.cita?.mascota?.nombre ?? '—'}</span>
                      </div>
                      <div style={es.infoRow}>
                        <span style={es.infoLabel}>Fecha de cita</span>
                        <span style={es.infoValor}>{factura.cita?.fecha ? formatFecha(factura.cita.fecha) : '—'}</span>
                      </div>
                      <div style={es.infoRow}>
                        <span style={es.infoLabel}>Cajero</span>
                        <span style={es.infoValor}>👤 {factura.cajero?.nombre ?? '—'}</span>
                      </div>
                    </>
                  )}
                  <div style={es.infoRow}>
                    <span style={es.infoLabel}>Método de pago</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: cfgMetodo.color }}>
                      {cfgMetodo.icono} {cfgMetodo.label}
                    </span>
                  </div>
                </div>

                {/* Detalle de items */}
                <div style={es.serviciosBox}>
                  <p style={es.serviciosLabel}>
                    {esTienda ? 'PRODUCTOS' : 'SERVICIOS'}
                  </p>
                  {esTienda
                    ? (factura.pedido?.pedido_item ?? []).map((item, i) => (
                        <div key={i} style={es.servicioRow}>
                          <span style={{ fontSize: 13, color: '#555' }}>
                            {COLOR_CAT[item.producto?.categoria] ?? '📦'} {item.producto?.nombre}
                            <span style={{ color: '#aaa', marginLeft: 6 }}>×{item.cantidad}</span>
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                            Bs. {(item.cantidad * parseFloat(item.precio_unitario)).toFixed(2)}
                          </span>
                        </div>
                      ))
                    : (factura.cita?.cita_servicio ?? []).map((cs, i) => (
                        <div key={i} style={es.servicioRow}>
                          <span style={{ fontSize: 13, color: '#555' }}>✂️ {cs.servicio?.nombre}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                            Bs. {parseFloat(cs.servicio?.precio ?? 0).toFixed(2)}
                          </span>
                        </div>
                      ))
                  }
                  {parseFloat(factura.descuento) > 0 && (
                    <div style={{ ...es.servicioRow, color: '#2e7d32' }}>
                      <span style={{ fontSize: 13 }}>🎉 Descuento</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        - Bs. {parseFloat(factura.descuento).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {factura.observaciones && (
                  <div style={es.observaciones}>
                    <span style={{ fontSize: 12, color: '#888' }}>📝 {factura.observaciones}</span>
                  </div>
                )}

                {/* Total */}
                <div style={es.cardFooter}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={es.totalLabel}>TOTAL COBRADO</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: cfgMetodo.bg, color: cfgMetodo.color }}>
                      {cfgMetodo.icono} {cfgMetodo.label}
                    </span>
                  </div>
                  <span style={es.totalValor}>Bs. {parseFloat(factura.total).toFixed(2)}</span>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {modalAbierto && (
        <FacturaModal
          citasSinFactura={citasSinFactura}
          onGuardar={emitirFactura}
          onCerrar={() => setModalAbierto(false)}
        />
      )}

    </div>
  )
}

const es = {
  encabezado:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  titulo:        { margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' },
  subtitulo:     { margin: 0, color: '#888', fontSize: 14 },
  btnAgregar:    { padding: '10px 20px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  statsGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: 14 },
  statCard:      { background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 4 },
  statNum:       { fontSize: 20, fontWeight: 800, color: '#6c63ff', lineHeight: 1 },
  statLabel:     { fontSize: 11, color: '#888', fontWeight: 600 },
  metodosGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 10, marginBottom: 16 },
  metodoCard:    { background: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 10 },
  estadoVacio:   { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, textAlign: 'center' },
  lista:         { display: 'flex', flexDirection: 'column', gap: 14 },
  card:          { background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' },
  cardHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 20px', background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)' },
  nroLabel:      { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1, display: 'block' },
  nroValor:      { margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: '#fff' },
  fechaEmision:  { margin: '0 0 2px', fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  horaEmision:   { margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  cardBody:      { padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid #f5f5f5' },
  infoRow:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel:     { fontSize: 12, color: '#aaa', fontWeight: 600 },
  infoValor:     { fontSize: 13, color: '#333', fontWeight: 600 },
  serviciosBox:  { padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid #f5f5f5', background: '#fafafa' },
  serviciosLabel:{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#6c63ff', letterSpacing: 1 },
  servicioRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  observaciones: { padding: '10px 20px', background: '#fffbf0', borderBottom: '1px solid #f5f5f5' },
  cardFooter:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#f8f8ff' },
  totalLabel:    { fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1 },
  totalValor:    { fontSize: 22, fontWeight: 800, color: '#6c63ff' },
}
