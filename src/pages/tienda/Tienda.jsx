import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTienda } from './useTienda'
import ProductoModal from './ProductoModal'
import toast from 'react-hot-toast'
import { TIENDA_CONFIG } from '../../config/tienda.config'

const CATEGORIAS = ['TODOS', 'HIGIENE', 'ACCESORIOS', 'MEDICAMENTOS', 'SNACKS', 'JUGUETES', 'OTROS']

const COLOR_CAT = {
  HIGIENE:      { bg: '#e3f2fd', color: '#1565c0', icono: '🧴' },
  ACCESORIOS:   { bg: '#f3e5f5', color: '#6a1b9a', icono: '🎀' },
  MEDICAMENTOS: { bg: '#fce4ec', color: '#c62828', icono: '💊' },
  SNACKS:       { bg: '#fff3e0', color: '#e65100', icono: '🦴' },
  JUGUETES:     { bg: '#e8f5e9', color: '#2e7d32', icono: '🎾' },
  OTROS:        { bg: '#f5f5f5', color: '#555555', icono: '📦' },
}

// ── Genera el texto del pedido ────────────────────────────────
function generarMensajePedido(carrito, perfil) {
  const lineas = carrito.map(item =>
    `• ${item.nombre} x${item.cantidad} — Bs. ${(item.precio * item.cantidad).toFixed(2)}`
  )
  const total = carrito.reduce((sum, i) => sum + i.precio * i.cantidad, 0)

  return [
    TIENDA_CONFIG.saludo_pedido,
    '',
    ...lineas,
    '',
    `TOTAL: Bs. ${total.toFixed(2)}`,
    '',
    `Cliente: ${perfil?.nombre ?? 'Cliente'}`,
    `Tienda: ${TIENDA_CONFIG.nombre_spa}`,
  ].join('\n')
}

export default function Tienda() {
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'ADMINISTRADOR'

  const {
    productos, loading,
    fetchPedidos,
    crearProducto, editarProducto, eliminarProducto,
    guardarPedido,
  } = useTienda()

  // ── Estado local ──────────────────────────────────────────────
  const [filtroCateg,     setFiltroCateg]     = useState('TODOS')
  const [busqueda,        setBusqueda]        = useState('')
  const [carrito,         setCarrito]         = useState([])   // { id, nombre, precio, cantidad, stock }
  const [mostrarCarrito,  setMostrarCarrito]  = useState(false)
  const [modalProducto,   setModalProducto]   = useState(false)
  const [productoEditar,  setProductoEditar]  = useState(null)
  const [enviando,        setEnviando]        = useState(false)

  useEffect(() => {
    if (perfil?.id) fetchPedidos(perfil.id)
  }, [perfil?.id])

  // ── Filtros ───────────────────────────────────────────────────
  const productosFiltrados = productos.filter(p => {
    const matchCateg = filtroCateg === 'TODOS' || p.categoria === filtroCateg
    const matchBusq  = !busqueda   || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return matchCateg && matchBusq
  })

  // ── Carrito ───────────────────────────────────────────────────
  const totalCarrito   = carrito.reduce((sum, i) => sum + i.precio * i.cantidad, 0)
  const cantidadItems  = carrito.reduce((sum, i) => sum + i.cantidad, 0)

  const agregarAlCarrito = (producto) => {
    if (producto.stock <= 0) { toast.error('Sin stock disponible'); return }
    setCarrito(prev => {
      const existe = prev.find(i => i.id === producto.id)
      if (existe) {
        if (existe.cantidad >= producto.stock) {
          toast.error(`Solo hay ${producto.stock} unidades disponibles`)
          return prev
        }
        return prev.map(i => i.id === producto.id
          ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      toast.success(`${producto.nombre} agregado al carrito`)
      return [...prev, {
        id:       producto.id,
        nombre:   producto.nombre,
        precio:   parseFloat(producto.precio),
        cantidad: 1,
        stock:    producto.stock,
      }]
    })
  }

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev => prev
      .map(i => i.id === id ? { ...i, cantidad: Math.max(0, Math.min(i.stock, i.cantidad + delta)) } : i)
      .filter(i => i.cantidad > 0)
    )
  }

  const quitarDelCarrito = (id) => {
    setCarrito(prev => prev.filter(i => i.id !== id))
  }

  const vaciarCarrito = () => {
    setCarrito([])
    toast('Carrito vaciado')
  }

  // ── Enviar pedido ─────────────────────────────────────────────
  const enviarPedido = async (canal) => {
    if (carrito.length === 0) { toast.error('El carrito está vacío'); return }
    setEnviando(true)

    const mensaje = generarMensajePedido(carrito, perfil)

    // Guardar en BD
    const idPedido = await guardarPedido({
      idCliente: perfil.id,
      items:     carrito,
      total:     totalCarrito,
      canal,
      notas:     null,
    })

    if (idPedido) {
      if (canal === 'WHATSAPP') {
        const url = `https://wa.me/${TIENDA_CONFIG.whatsapp}?text=${encodeURIComponent(mensaje)}`
        window.open(url, '_blank')
        toast.success('¡Pedido enviado por WhatsApp!')
      } else {
        // Telegram: copiar mensaje y abrir chat
        try {
          await navigator.clipboard.writeText(mensaje)
          toast.success('Mensaje copiado. Pégalo en Telegram.')
        } catch {
          toast('Abre Telegram y pega el pedido manualmente.')
        }
        const url = `https://t.me/${TIENDA_CONFIG.telegram}`
        window.open(url, '_blank')
      }
      setCarrito([])
      setMostrarCarrito(false)
    }
    setEnviando(false)
  }

  // ── Admin CRUD ────────────────────────────────────────────────
  const abrirCrear  = () => { setProductoEditar(null); setModalProducto(true) }
  const abrirEditar = (p) => { setProductoEditar(p);   setModalProducto(true) }

  const handleGuardar = async (datos) => {
    if (productoEditar) return await editarProducto(productoEditar.id, datos)
    return await crearProducto(datos)
  }

  const handleEliminar = async (p) => {
    if (window.confirm(`¿Eliminar "${p.nombre}"?`))
      await eliminarProducto(p.id, p.nombre)
  }

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

      {/* ── COLUMNA IZQUIERDA: Catálogo ── */}
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
            {/* Botón carrito móvil / resumen */}
            {carrito.length > 0 && (
              <button style={es.btnCarrito} onClick={() => setMostrarCarrito(!mostrarCarrito)}>
                🛒 {cantidadItems} · Bs. {totalCarrito.toFixed(2)}
              </button>
            )}
            {esAdmin && (
              <button style={es.btnAgregar} onClick={abrirCrear}>
                + Nuevo producto
              </button>
            )}
          </div>
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
          <input
            style={es.buscador}
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {/* Filtros categoría */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {CATEGORIAS.map(cat => (
            <button key={cat}
              style={{
                padding: '5px 14px', border: 'none', borderRadius: 20, fontSize: 12,
                cursor: 'pointer',
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

        {/* Loading */}
        {loading && (
          <div style={es.estadoVacio}>
            <span style={{ fontSize: 40 }}>⏳</span>
            <p style={{ color: '#888' }}>Cargando productos...</p>
          </div>
        )}

        {/* Sin productos */}
        {!loading && productosFiltrados.length === 0 && (
          <div style={es.estadoVacio}>
            <span style={{ fontSize: 64 }}>🛍️</span>
            <h3 style={{ margin: '12px 0 4px', color: '#333' }}>
              {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay productos aún'}
            </h3>
            {esAdmin && (
              <button style={{ ...es.btnAgregar, marginTop: 12 }} onClick={abrirCrear}>
                + Crear primer producto
              </button>
            )}
          </div>
        )}

        {/* Grid de productos */}
        {!loading && productosFiltrados.length > 0 && (
          <div style={es.grid}>
            {productosFiltrados.map(producto => {
              const cfg        = COLOR_CAT[producto.categoria] ?? COLOR_CAT.OTROS
              const sinStock   = producto.stock <= 0
              const enCarrito  = carrito.find(i => i.id === producto.id)

              return (
                <div key={producto.id} style={{
                  ...es.card,
                  opacity: sinStock ? 0.7 : 1,
                  borderTop: enCarrito ? '3px solid #6c63ff' : '3px solid transparent',
                }}>

                  {/* Imagen o placeholder */}
                  <div style={{
                    height: 120, borderRadius: 10, overflow: 'hidden',
                    background: cfg.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 4, position: 'relative',
                  }}>
                    {producto.imagen_url ? (
                      <img src={producto.imagen_url} alt={producto.nombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <span style={{ fontSize: 48 }}>{cfg.icono}</span>
                    )}
                    {sinStock && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                          SIN STOCK
                        </span>
                      </div>
                    )}
                    {enCarrito && (
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        background: '#6c63ff', color: '#fff',
                        borderRadius: '50%', width: 24, height: 24,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {enCarrito.cantidad}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>
                        {producto.nombre}
                      </h3>
                      <span style={{ ...es.tag, background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
                        {cfg.icono}
                      </span>
                    </div>
                    {producto.descripcion && (
                      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#888', lineHeight: 1.5 }}>
                        {producto.descripcion}
                      </p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: '#6c63ff' }}>
                        Bs. {parseFloat(producto.precio).toFixed(2)}
                      </span>
                      <span style={{ fontSize: 12, color: sinStock ? '#e53e3e' : '#888' }}>
                        {sinStock ? '⚠️ Sin stock' : `📦 ${producto.stock} disponibles`}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid #f5f5f5' }}>
                    {/* Botón agregar al carrito */}
                    {!sinStock && (
                      <button
                        style={{
                          ...es.btnAgregar,
                          flex: 1, padding: '8px 0', fontSize: 13,
                          background: enCarrito ? '#f0eeff' : '#6c63ff',
                          color:      enCarrito ? '#6c63ff' : '#fff',
                        }}
                        onClick={() => agregarAlCarrito(producto)}
                      >
                        {enCarrito ? `✅ En carrito (${enCarrito.cantidad})` : '🛒 Agregar'}
                      </button>
                    )}

                    {/* Admin: editar y eliminar */}
                    {esAdmin && (
                      <>
                        <button style={es.btnEditar}   onClick={() => abrirEditar(producto)}>✏️</button>
                        <button style={es.btnEliminar} onClick={() => handleEliminar(producto)}>🗑️</button>
                      </>
                    )}
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── COLUMNA DERECHA: Carrito ── */}
      {(carrito.length > 0 || mostrarCarrito) && (
        <div style={es.carritoPanel}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>
              🛒 Carrito
            </h2>
            {carrito.length > 0 && (
              <button style={{ background: 'none', border: 'none', color: '#e53e3e', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                onClick={vaciarCarrito}>
                Vaciar
              </button>
            )}
          </div>

          {carrito.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
              <span style={{ fontSize: 40 }}>🛒</span>
              <p style={{ margin: '8px 0 0', fontSize: 13 }}>El carrito está vacío</p>
            </div>
          ) : (
            <>
              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {carrito.map(item => (
                  <div key={item.id} style={es.carritoItem}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
                        {item.nombre}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: '#6c63ff', fontWeight: 600 }}>
                        Bs. {(item.precio * item.cantidad).toFixed(2)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button style={es.btnCantidad} onClick={() => cambiarCantidad(item.id, -1)}>−</button>
                      <span style={{ fontSize: 15, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                        {item.cantidad}
                      </span>
                      <button style={es.btnCantidad} onClick={() => cambiarCantidad(item.id, 1)}>+</button>
                      <button
                        style={{ ...es.btnCantidad, color: '#e53e3e', marginLeft: 4 }}
                        onClick={() => quitarDelCarrito(item.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div style={es.carritoTotal}>
                <span style={{ fontSize: 14, color: '#555' }}>
                  {cantidadItems} producto{cantidadItems !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#6c63ff' }}>
                  Bs. {totalCarrito.toFixed(2)}
                </span>
              </div>

              {/* Vista previa del mensaje */}
              <div style={es.mensajePreview}>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#6c63ff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Vista previa del pedido
                </p>
                <pre style={{ margin: 0, fontSize: 11, color: '#555', whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: 1.6 }}>
                  {generarMensajePedido(carrito, perfil)}
                </pre>
              </div>

              {/* Botones de envío */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                <button
                  style={{ ...es.btnWhatsApp, opacity: enviando ? 0.7 : 1 }}
                  onClick={() => enviarPedido('WHATSAPP')}
                  disabled={enviando}
                >
                  <span style={{ fontSize: 18 }}>💬</span>
                  {enviando ? 'Enviando...' : 'Pedir por WhatsApp'}
                </button>
                <button
                  style={{ ...es.btnTelegram, opacity: enviando ? 0.7 : 1 }}
                  onClick={() => enviarPedido('TELEGRAM')}
                  disabled={enviando}
                >
                  <span style={{ fontSize: 18 }}>✈️</span>
                  {enviando ? 'Enviando...' : 'Pedir por Telegram'}
                </button>
              </div>

              <p style={{ margin: '10px 0 0', fontSize: 11, color: '#aaa', textAlign: 'center' }}>
                Al confirmar se guardará el pedido y se abrirá {' '}
                WhatsApp / Telegram con el mensaje listo.
              </p>
            </>
          )}
        </div>
      )}

      {/* Modal producto */}
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
  encabezado:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  titulo:        { margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' },
  subtitulo:     { margin: 0, color: '#888', fontSize: 14 },
  btnAgregar:    { padding: '10px 20px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnCarrito:    { padding: '10px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  buscador:      { width: '100%', padding: '10px 10px 10px 38px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' },
  estadoVacio:   { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, textAlign: 'center' },
  grid:          { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
  card:          { background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 8 },
  tag:           { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 },
  btnEditar:     { padding: '7px 10px', background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  btnEliminar:   { padding: '7px 10px', background: '#fff0f0', color: '#e53e3e', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  carritoPanel:  { width: 320, minWidth: 300, background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', position: 'sticky', top: 20, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' },
  carritoItem:   { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f8f8ff', borderRadius: 10, border: '1px solid #ede9fe' },
  carritoTotal:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f0eeff', borderRadius: 10 },
  mensajePreview:{ padding: '10px 14px', background: '#f8f8ff', borderRadius: 10, border: '1px solid #ede9fe', marginTop: 12 },
  btnCantidad:   { width: 28, height: 28, borderRadius: 6, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  btnWhatsApp:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', background: '#25d366', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnTelegram:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', background: '#0088cc', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
}
