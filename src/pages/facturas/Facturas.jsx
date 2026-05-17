import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useFacturas } from './useFacturas'
import FacturaModal from './FacturaModal'

function formatFecha(f) {
  return new Date(f).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

function formatHora(f) {
  return new Date(f).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit'
  })
}

export default function Facturas() {
  const { perfil } = useAuth()
  const { facturas, citasSinFactura, loading, emitirFactura } = useFacturas()
  const [modalAbierto, setModalAbierto] = useState(false)

  const totalGeneral = facturas.reduce((sum, f) => sum + parseFloat(f.total ?? 0), 0)

  return (
    <div>

      {/* Encabezado */}
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>🧾 Facturas</h1>
          <p style={estilos.subtitulo}>
            {loading ? 'Cargando...' : `${facturas.length} factura${facturas.length !== 1 ? 's' : ''} emitida${facturas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button style={estilos.btnAgregar} onClick={() => setModalAbierto(true)}>
          + Nueva factura
        </button>
      </div>

      {/* Resumen total */}
      {!loading && facturas.length > 0 && (
        <div style={estilos.resumenBox}>
          <div style={estilos.resumenItem}>
            <span style={estilos.resumenLabel}>Total facturado</span>
            <span style={estilos.resumenValor}>
              Bs. {totalGeneral.toFixed(2)}
            </span>
          </div>
          <div style={estilos.resumenDivider} />
          <div style={estilos.resumenItem}>
            <span style={estilos.resumenLabel}>Facturas emitidas</span>
            <span style={estilos.resumenValor}>{facturas.length}</span>
          </div>
          <div style={estilos.resumenDivider} />
          <div style={estilos.resumenItem}>
            <span style={estilos.resumenLabel}>Citas sin facturar</span>
            <span style={{
              ...estilos.resumenValor,
              color: citasSinFactura.length > 0 ? '#e65100' : '#2e7d32'
            }}>
              {citasSinFactura.length}
            </span>
          </div>
        </div>
      )}

      {/* Cargando */}
      {loading && (
        <div style={estilos.estadoVacio}>
          <span style={{ fontSize: 40 }}>⏳</span>
          <p style={{ color: '#888' }}>Cargando facturas...</p>
        </div>
      )}

      {/* Sin facturas */}
      {!loading && facturas.length === 0 && (
        <div style={estilos.estadoVacio}>
          <span style={{ fontSize: 64 }}>🧾</span>
          <h3 style={{ margin: '12px 0 4px', color: '#333' }}>
            No hay facturas aún
          </h3>
          <p style={{ color: '#888', margin: '0 0 20px' }}>
            Emite la primera factura para una cita completada
          </p>
          <button style={estilos.btnAgregar} onClick={() => setModalAbierto(true)}>
            + Emitir primera factura
          </button>
        </div>
      )}

      {/* Lista de facturas */}
      {!loading && facturas.length > 0 && (
        <div style={estilos.lista}>
          {facturas.map((factura, index) => {
            const servicios = factura.cita?.cita_servicio ?? []
            const nroFactura = String(facturas.length - index).padStart(4, '0')

            return (
              <div key={factura.id} style={estilos.card}>

                {/* Header de la factura */}
                <div style={estilos.cardHeader}>
                  <div style={estilos.nroFactura}>
                    <span style={estilos.nroLabel}>FACTURA</span>
                    <span style={estilos.nroValor}>#{nroFactura}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={estilos.fechaEmision}>
                      📅 {formatFecha(factura.fecha_emision)}
                    </p>
                    <p style={estilos.horaEmision}>
                      🕐 {formatHora(factura.fecha_emision)}
                    </p>
                  </div>
                </div>

                {/* Info de la cita */}
                <div style={estilos.cardBody}>
                  <div style={estilos.infoRow}>
                    <span style={estilos.infoLabel}>Mascota</span>
                    <span style={estilos.infoValor}>
                      🐾 {factura.cita?.mascota?.nombre ?? '—'}
                    </span>
                  </div>
                  <div style={estilos.infoRow}>
                    <span style={estilos.infoLabel}>Fecha de cita</span>
                    <span style={estilos.infoValor}>
                      {factura.cita?.fecha
                        ? formatFecha(factura.cita.fecha)
                        : '—'}
                    </span>
                  </div>
                  <div style={estilos.infoRow}>
                    <span style={estilos.infoLabel}>Cajero</span>
                    <span style={estilos.infoValor}>
                      👤 {factura.cajero?.nombre ?? '—'}
                    </span>
                  </div>
                </div>

                {/* Servicios */}
                {servicios.length > 0 && (
                  <div style={estilos.serviciosBox}>
                    <p style={estilos.serviciosLabel}>SERVICIOS</p>
                    {servicios.map((cs, i) => (
                      <div key={i} style={estilos.servicioRow}>
                        <span style={{ fontSize: 13, color: '#555' }}>
                          ✂️ {cs.servicio?.nombre}
                        </span>
                        <span style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>
                          Bs. {parseFloat(cs.servicio?.precio ?? 0).toFixed(2)}
                        </span>
                      </div>
                    ))}

                    {/* Descuento */}
                    {parseFloat(factura.descuento) > 0 && (
                      <div style={{ ...estilos.servicioRow, color: '#2e7d32' }}>
                        <span style={{ fontSize: 13 }}>🎉 Descuento</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          - Bs. {parseFloat(factura.descuento).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Observaciones */}
                {factura.observaciones && (
                  <div style={estilos.observaciones}>
                    <span style={{ fontSize: 12, color: '#888' }}>
                      📝 {factura.observaciones}
                    </span>
                  </div>
                )}

                {/* Total */}
                <div style={estilos.cardFooter}>
                  <span style={estilos.totalLabel}>TOTAL COBRADO</span>
                  <span style={estilos.totalValor}>
                    Bs. {parseFloat(factura.total).toFixed(2)}
                  </span>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
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

const estilos = {
  encabezado: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
    flexWrap: 'wrap', gap: 12,
  },
  titulo:    { margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' },
  subtitulo: { margin: 0, color: '#888', fontSize: 14 },
  btnAgregar: {
    padding: '10px 20px', background: '#6c63ff',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  resumenBox: {
    display: 'flex', gap: 0,
    background: '#fff', borderRadius: 14,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: 20, overflow: 'hidden',
  },
  resumenItem: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '20px 16px', gap: 4,
  },
  resumenLabel: {
    fontSize: 11, color: '#aaa',
    fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  resumenValor: {
    fontSize: 24, fontWeight: 800, color: '#6c63ff',
  },
  resumenDivider: {
    width: 1, background: '#f0f0f0', margin: '16px 0',
  },
  estadoVacio: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '60px 20px',
    background: '#fff', borderRadius: 16, textAlign: 'center',
  },
  lista: { display: 'flex', flexDirection: 'column', gap: 14 },
  card: {
    background: '#fff', borderRadius: 14,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '16px 20px',
    background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)',
  },
  nroFactura: { display: 'flex', flexDirection: 'column', gap: 2 },
  nroLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1 },
  nroValor: { fontSize: 22, fontWeight: 800, color: '#fff' },
  fechaEmision: { margin: '0 0 2px', fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  horaEmision:  { margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  cardBody: {
    padding: '14px 20px',
    display: 'flex', flexDirection: 'column', gap: 6,
    borderBottom: '1px solid #f5f5f5',
  },
  infoRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: { fontSize: 12, color: '#aaa', fontWeight: 600 },
  infoValor: { fontSize: 13, color: '#333', fontWeight: 600 },
  serviciosBox: {
    padding: '12px 20px',
    display: 'flex', flexDirection: 'column', gap: 6,
    borderBottom: '1px solid #f5f5f5',
    background: '#fafafa',
  },
  serviciosLabel: {
    margin: '0 0 4px', fontSize: 10,
    fontWeight: 700, color: '#6c63ff', letterSpacing: 1,
  },
  servicioRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  observaciones: {
    padding: '10px 20px',
    background: '#fffbf0',
    borderBottom: '1px solid #f5f5f5',
  },
  cardFooter: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '14px 20px',
    background: '#f8f8ff',
  },
  totalLabel: {
    fontSize: 11, fontWeight: 700,
    color: '#888', letterSpacing: 1,
  },
  totalValor: {
    fontSize: 22, fontWeight: 800, color: '#6c63ff',
  },
}