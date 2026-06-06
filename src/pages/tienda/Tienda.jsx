import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTienda } from './useTienda'
import ProductoModal from './ProductoModal'
import toast from 'react-hot-toast'
import { TIENDA_CONFIG } from '../../config/tienda.config'

const CATEGORIAS = ['TODOS','HIGIENE','ACCESORIOS','MEDICAMENTOS','SNACKS','JUGUETES','OTROS']

const COLOR_CAT = {
  HIGIENE:      { bg: '#e3f2fd', color: '#1565c0', icono: '🧴' },
  ACCESORIOS:   { bg: '#f3e5f5', color: '#6a1b9a', icono: '🎀' },
  MEDICAMENTOS: { bg: '#fce4ec', color: '#c62828', icono: '💊' },
  SNACKS:       { bg: '#fff3e0', color: '#e65100', icono: '🦴' },
  JUGUETES:     { bg: '#e8f5e9', color: '#2e7d32', icono: '🎾' },
  OTROS:        { bg: '#f5f5f5', color: '#555555', icono: '📦' },
}

const ESTADO_CONFIG = {
  PENDIENTE:  { bg: '#fff3e0', color: '#e65100', icono: '⏳', label: 'Pendiente'  },
  CONFIRMADO: { bg: '#e3f2fd', color: '#1565c0', icono: '✅', label: 'Confirmado' },
  ENTREGADO:  { bg: '#e8f5e9', color: '#2e7d32', icono: '📦', label: 'Entregado'  },
  CANCELADO:  { bg: '#ffebee', color: '#c62828', icono: '❌', label: 'Cancelado'  },
}

const CANAL_CONFIG = {
  WHATSAPP: { icono: '💬', color: '#25d366', label: 'WhatsApp' },
  TELEGRAM: { icono: '✈️', color: '#0088cc', label: 'Telegram' },
}

function formatFecha(f) {
  return new Date(f).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function generarMensajePedido(carrito, perfil) {
  const lineas = carrito.map(i =>
    `• ${i.nombre} x${i.cantidad} — Bs. ${(i.precio * i.cantidad).toFixed(2)}`
  )
  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
  return [
    TIENDA_CONFIG.saludo_pedido, '',
    ...lineas, '',
    `TOTAL: Bs. ${total.toFixed(2)}`, '',
    `Cliente: ${perfil?.nombre ?? 'Cliente'}`,
    `Tienda: ${TIENDA_CONFIG.nombre_spa}`,
  ].join('\n')
}

export default function Tienda() {
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'ADMINISTRADOR'

  const {
    productos, pedidos, loading, loadingPed,
    crearProducto, editarProducto, eliminarProducto,
    cambiarEstadoPedido, guardarPedido,
  } = useTienda(perfil)

  const [tab,            setTab]            = useState('catalogo')
  const [filtroCateg,    setFiltroCateg]    = useState('TODOS')
  const [busqueda,       setBusqueda]       = useState('')
  const [carrito,        setCarrito]        = useState([])
  const [modalProducto,  setModalProducto]  = useState(false)
  const [productoEditar, setProductoEditar] = useState(null)
  const [enviando,       setEnviando]       = useState(false)
  const [pedidoExpandido,setPedidoExpandido]= useState(null)

  const totalCarrito  = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const cantidadItems = carrito.reduce((s, i) => s + i.cantidad, 0)

  const productosFiltrados = productos.filter(p => {
    const matchC = filtroCateg === 'TODOS' || p.categoria === filtroCateg
    const matchB = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return matchC && matchB
  })

  // ── Carrito helpers ───────────────────────────────────────────
  const agregar = (p) => {
    if (p.stock <= 0) { toast.error('Sin stock'); return }
    setCarrito(prev => {
      const ex = prev.find(i => i.id === p.id)
      if (ex) {
        if (ex.cantidad >= p.stock) { toast.error(`Solo hay ${p.stock} disponibles`); return prev }
        return prev.map(i => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      toast.success(`${p.nombre} agregado`)
      return [...prev, { id: p.id, nombre: p.nombre, precio: parseFloat(p.precio), cantidad: 1, stock: p.stock }]
    })
  }

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev =>
      prev.map(i => i.id === id
        ? { ...i, cantidad: Math.max(0, Math.min(i.stock, i.cantidad + delta)) }
        : i
      ).filter(i => i.cantidad > 0)
    )
  }

  const quitar = (id) => setCarrito(prev => prev.filter(i => i.id !== id))

  // ── Enviar pedido ─────────────────────────────────────────────
  const enviarPedido = async (canal) => {
    if (carrito.length === 0) { toast.error('El carrito está vacío'); return }
    setEnviando(true)

    const mensaje  = generarMensajePedido(carrito, perfil)
    const idPedido = await guardarPedido({
      idCliente: perfil.id,
      items:     carrito,
      total:     totalCarrito,
      canal,
      notas:     null,
    })

    if (idPedido) {
      if (canal === 'WHATSAPP') {
        window.open(`https://wa.me/${TIENDA_CONFIG.whatsapp}?text=${encodeURIComponent(mensaje)}`, '_blank')
        toast.success('¡Pedido enviado por WhatsApp!')
      } else {
        try { await navigator.clipboard.writeText(mensaje) } catch {}
        window.open(`https://t.me/${TIENDA_CONFIG.telegram}`, '_blank')
        toast.success('Mensaje copiado. Pégalo en Telegram.')
      }
      setCarrito([])
    }
    setEnviando(false)
  }

  // ── Admin CRUD ────────────────────────────────────────────────
  const handleGuardar = async (datos) =>
    productoEditar
      ? await editarProducto(productoEditar.id, datos)
      : await crearProducto(datos)

  const handleEliminar = async (p) => {
    if (window.confirm(`¿Eliminar "${p.nombre}"?`)) await eliminarProducto(p.id, p.nombre)
  }

  // ── Estadísticas rápidas del historial ────────────────────────
  const totalVendido   = pedidos.reduce((s, p) => s + parseFloat(p.total ?? 0), 0)
  const pedidosPendientes = pedidos.filter(p => p.estado === 'PENDIENTE').length

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

      {/* ── COLUMNA PRINCIPAL ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Encabezado */}
        <div style={es.encabezado}>
          <div>
            <h1 style={es.titulo}>🛍️ Tienda</h1>
            <p style={es.subtitulo}>
              {loading ? 'Cargando...'
                : `${productos.length} producto${productos.length !== 1 ? 's' : ''} disponible${productos.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {carrito.length > 0 && (
              <button style={es.btnCarrito}>
                🛒 {cantidadItems} · Bs. {totalCarrito.toFixed(2)}
              </button>
            )}
            {esAdmin && (
              <button style={es.btnAgregar}
                onClick={() => { setProductoEditar(null); setModalProducto(true) }}>
                + Nuevo producto
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={es.tabs}>
          {[
            { id: 'catalogo',  label: '🛍️ Catálogo' },
            { id: 'historial', label: `📋 ${esAdmin ? 'Todos los pedidos' : 'Mis pedidos'} ${pedidos.length > 0 ? `(${pedidos.length})` : ''}` },
          ].map(t => (
            <button key={t.id}
              style={{ ...es.tab, ...(tab === t.id ? es.tabActivo : {}) }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ TAB CATÁLOGO ══ */}
        {tab === 'catalogo' && (
          <>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
              <input style={es.buscador} placeholder="Buscar producto..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {CATEGORIAS.map(cat => (
                <button key={cat}
                  style={{
                    padding: '5px 14px', border: 'none', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    background: filtroCateg === cat ? '#6c63ff' : '#f3f4f6',
                    color:      filtroCateg === cat ? '#fff'    : '#555',
                    fontWeight: filtroCateg === cat ? 700 : 400,
                  }}
                  onClick={() => setFiltroCateg(cat)}>
                  {COLOR_CAT[cat]?.icono ?? ''} {cat}
                </button>
              ))}
            </div>

            {loading && <div style={es.estadoVacio}><span style={{ fontSize: 40 }}>⏳</span><p>Cargando...</p></div>}

            {!loading && productosFiltrados.length === 0 && (
              <div style={es.estadoVacio}>
                <span style={{ fontSize: 64 }}>🛍️</span>
                <h3 style={{ margin: '12px 0 4px', color: '#333' }}>
                  {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay productos aún'}
                </h3>
              </div>
            )}

            {!loading && productosFiltrados.length > 0 && (
              <div style={es.grid}>
                {productosFiltrados.map(p => {
                  const cfg      = COLOR_CAT[p.categoria] ?? COLOR_CAT.OTROS
                  const sinStock = p.stock <= 0
                  const enCart   = carrito.find(i => i.id === p.id)

                  return (
                    <div key={p.id} style={{
                      ...es.card,
                      opacity:   sinStock ? 0.7 : 1,
                      borderTop: enCart ? '3px solid #6c63ff' : '3px solid transparent',
                    }}>
                      {/* Imagen */}
                      <div style={{ height: 110, borderRadius: 10, overflow: 'hidden', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {p.imagen_url
                          ? <img src={p.imagen_url} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                          : <span style={{ fontSize: 44 }}>{cfg.icono}</span>
                        }
                        {sinStock && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>SIN STOCK</span>
                          </div>
                        )}
                        {enCart && (
                          <div style={{ position: 'absolute', top: 6, right: 6, background: '#6c63ff', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                            {enCart.cantidad}
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                          <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{p.nombre}</h3>
                          <span style={{ ...es.tag, background: cfg.bg, color: cfg.color, flexShrink: 0 }}>{cfg.icono}</span>
                        </div>
                        {p.descripcion && (
                          <p style={{ margin: '0 0 6px', fontSize: 11, color: '#888', lineHeight: 1.4 }}>{p.descripcion}</p>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: '#6c63ff' }}>Bs. {parseFloat(p.precio).toFixed(2)}</span>
                          <span style={{ fontSize: 11, color: sinStock ? '#e53e3e' : '#888' }}>
                            {sinStock ? '⚠️ Sin stock' : `📦 ${p.stock}`}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid #f5f5f5' }}>
                        {!sinStock && (
                          <button
                            style={{ ...es.btnAgregar, flex: 1, padding: '7px 0', fontSize: 12, background: enCart ? '#f0eeff' : '#6c63ff', color: enCart ? '#6c63ff' : '#fff' }}
                            onClick={() => agregar(p)}>
                            {enCart ? `✅ En carrito (${enCart.cantidad})` : '🛒 Agregar'}
                          </button>
                        )}
                        {esAdmin && (
                          <>
                            <button style={es.btnEditar}   onClick={() => { setProductoEditar(p); setModalProducto(true) }}>✏️</button>
                            <button style={es.btnEliminar} onClick={() => handleEliminar(p)}>🗑️</button>
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

        {/* ══ TAB HISTORIAL ══ */}
        {tab === 'historial' && (
          <>
            {/* Stats del historial */}
            {pedidos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Total pedidos',   valor: pedidos.length,                                  color: '#6c63ff' },
                  { label: 'Pendientes',       valor: pedidosPendientes,                               color: '#e65100' },
                  { label: 'Entregados',       valor: pedidos.filter(p => p.estado==='ENTREGADO').length, color: '#2e7d32' },
                  { label: 'Total vendido',    valor: `Bs. ${totalVendido.toFixed(2)}`,                color: '#6c63ff' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: `4px solid ${s.color}` }}>
                    <p style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 800, color: s.color }}>{s.valor}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#888', fontWeight: 600 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {loadingPed && <div style={es.estadoVacio}><span style={{ fontSize: 40 }}>⏳</span><p>Cargando pedidos...</p></div>}

            {!loadingPed && pedidos.length === 0 && (
              <div style={es.estadoVacio}>
                <span style={{ fontSize: 64 }}>📋</span>
                <h3 style={{ margin: '12px 0 4px', color: '#333' }}>No hay pedidos aún</h3>
                <p style={{ color: '#888', margin: 0 }}>Los pedidos aparecerán aquí cuando los clientes compren</p>
              </div>
            )}

            {!loadingPed && pedidos.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pedidos.map((pedido, idx) => {
                  const cfgEstado = ESTADO_CONFIG[pedido.estado] ?? ESTADO_CONFIG.PENDIENTE
                  const cfgCanal  = CANAL_CONFIG[pedido.canal]  ?? CANAL_CONFIG.WHATSAPP
                  const expandido = pedidoExpandido === pedido.id
                  const nroPedido = String(pedidos.length - idx).padStart(4, '0')
                  const totalItems = (pedido.pedido_item ?? []).reduce((s, i) => s + i.cantidad, 0)

                  return (
                    <div key={pedido.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

                      {/* Header del pedido */}
                      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1 }}>PEDIDO</p>
                            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>#{nroPedido}</p>
                          </div>
                          {/* Canal */}
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: cfgCanal.color, color: '#fff' }}>
                            {cfgCanal.icono} {cfgCanal.label}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: '0 0 2px', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                            📅 {formatFecha(pedido.created_at)}
                          </p>
                          <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#6c63ff' }}>
                            Bs. {parseFloat(pedido.total).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Info rápida */}
                      <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid #f5f5f5' }}>

                        {/* Cliente */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#6c63ff', fontSize: 16 }}>
                            {pedido.cliente?.nombre?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>
                              {pedido.cliente?.nombre ?? '—'}
                            </p>
                            <p style={{ margin: 0, fontSize: 11, color: '#888' }}>
                              {pedido.cliente?.email ?? ''}
                            </p>
                          </div>
                        </div>

                        {/* Resumen */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 12, color: '#888' }}>
                            🛒 {totalItems} producto{totalItems !== 1 ? 's' : ''}
                          </span>

                          {/* Badge estado */}
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: cfgEstado.bg, color: cfgEstado.color }}>
                            {cfgEstado.icono} {cfgEstado.label}
                          </span>

                          {/* Cambiar estado (admin) */}
                          {esAdmin && pedido.estado !== 'CANCELADO' && pedido.estado !== 'ENTREGADO' && (
                            <select
                              style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fafafa', cursor: 'pointer', color: '#333' }}
                              value={pedido.estado}
                              onChange={e => cambiarEstadoPedido(pedido.id, e.target.value)}
                            >
                              <option value="PENDIENTE">⏳ Pendiente</option>
                              <option value="CONFIRMADO">✅ Confirmado</option>
                              <option value="ENTREGADO">📦 Entregado</option>
                              <option value="CANCELADO">❌ Cancelado</option>
                            </select>
                          )}

                          {/* Expandir */}
                          <button
                            style={{ padding: '4px 12px', background: '#f0eeff', color: '#6c63ff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => setPedidoExpandido(expandido ? null : pedido.id)}
                          >
                            {expandido ? '▲ Ocultar' : '▼ Ver detalle'}
                          </button>
                        </div>
                      </div>

                      {/* Detalle expandible */}
                      {expandido && (
                        <div style={{ padding: '12px 20px', background: '#fafafe' }}>
                          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#6c63ff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Productos del pedido
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {(pedido.pedido_item ?? []).map((item, i) => {
                              const cfgP = COLOR_CAT[item.producto?.categoria] ?? COLOR_CAT.OTROS
                              const subtotal = item.cantidad * parseFloat(item.precio_unitario)
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #ede9fe' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 20 }}>{cfgP.icono}</span>
                                    <div>
                                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
                                        {item.producto?.nombre ?? '—'}
                                      </p>
                                      <p style={{ margin: 0, fontSize: 11, color: '#888' }}>
                                        {item.cantidad} unidad{item.cantidad !== 1 ? 'es' : ''} × Bs. {parseFloat(item.precio_unitario).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                  <span style={{ fontWeight: 700, color: '#6c63ff', fontSize: 14 }}>
                                    Bs. {subtotal.toFixed(2)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>

                          {/* Total del pedido */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 10, paddingTop: 10, borderTop: '1px solid #ede9fe' }}>
                            <span style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>TOTAL DEL PEDIDO</span>
                            <span style={{ fontSize: 20, fontWeight: 800, color: '#6c63ff' }}>
                              Bs. {parseFloat(pedido.total).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── CARRITO LATERAL (solo en tab catálogo) ── */}
      {tab === 'catalogo' && carrito.length > 0 && (
        <div style={es.carritoPanel}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>🛒 Carrito</h2>
            <button style={{ background: 'none', border: 'none', color: '#e53e3e', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setCarrito([])}>Vaciar</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {carrito.map(item => (
              <div key={item.id} style={es.carritoItem}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{item.nombre}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6c63ff', fontWeight: 700 }}>
                    Bs. {(item.precio * item.cantidad).toFixed(2)}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button style={es.btnCant} onClick={() => cambiarCantidad(item.id, -1)}>−</button>
                  <span style={{ fontSize: 14, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{item.cantidad}</span>
                  <button style={es.btnCant} onClick={() => cambiarCantidad(item.id,  1)}>+</button>
                  <button style={{ ...es.btnCant, color: '#e53e3e', marginLeft: 2 }} onClick={() => quitar(item.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <div style={es.carritoTotal}>
            <span style={{ fontSize: 13, color: '#555' }}>{cantidadItems} item{cantidadItems !== 1 ? 's' : ''}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#6c63ff' }}>Bs. {totalCarrito.toFixed(2)}</span>
          </div>

          {/* Preview */}
          <div style={{ padding: '10px 12px', background: '#f8f8ff', borderRadius: 10, border: '1px solid #ede9fe', margin: '12px 0' }}>
            <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#6c63ff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Vista previa del mensaje
            </p>
            <pre style={{ margin: 0, fontSize: 11, color: '#555', whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: 1.6 }}>
              {generarMensajePedido(carrito, perfil)}
            </pre>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button style={{ ...es.btnWA, opacity: enviando ? 0.7 : 1 }}
              onClick={() => enviarPedido('WHATSAPP')} disabled={enviando}>
              <span>💬</span> {enviando ? 'Enviando...' : 'Pedir por WhatsApp'}
            </button>
            <button style={{ ...es.btnTG, opacity: enviando ? 0.7 : 1 }}
              onClick={() => enviarPedido('TELEGRAM')} disabled={enviando}>
              <span>✈️</span> {enviando ? 'Enviando...' : 'Pedir por Telegram'}
            </button>
          </div>

          <p style={{ margin: '10px 0 0', fontSize: 10, color: '#aaa', textAlign: 'center' }}>
            Se guardará el pedido y se generará la factura automáticamente.
          </p>
        </div>
      )}

      {modalProducto && (
        <ProductoModal
          producto={productoEditar}
          onGuardar={handleGuardar}
          onCerrar={() => { setModalProducto(false); setProductoEditar(null) }}
        />
      )}

    </div>
  )
}

const es = {
  encabezado:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  titulo:      { margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' },
  subtitulo:   { margin: 0, color: '#888', fontSize: 14 },
  btnAgregar:  { padding: '10px 20px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnCarrito:  { padding: '10px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  tabs:        { display: 'flex', background: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 },
  tab:         { flex: 1, padding: '9px 0', background: 'transparent', border: 'none', borderRadius: 10, color: '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  tabActivo:   { background: '#fff', color: '#6c63ff', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
  buscador:    { width: '100%', padding: '10px 10px 10px 38px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' },
  estadoVacio: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, textAlign: 'center' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px,1fr))', gap: 16 },
  card:        { background: '#fff', borderRadius: 14, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 8 },
  tag:         { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 },
  btnEditar:   { padding: '6px 10px', background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
  btnEliminar: { padding: '6px 10px', background: '#fff0f0', color: '#e53e3e', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
  carritoPanel:{ width: 300, minWidth: 280, background: '#fff', borderRadius: 16, padding: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', position: 'sticky', top: 20, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' },
  carritoItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', background: '#f8f8ff', borderRadius: 10, border: '1px solid #ede9fe' },
  carritoTotal:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: '#f0eeff', borderRadius: 10 },
  btnCant:     { width: 26, height: 26, borderRadius: 6, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  btnWA:       { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', background: '#25d366', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnTG:       { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', background: '#0088cc', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
}
