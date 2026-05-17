import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useServicios } from './useServicios'
import ServicioModal from './ServicioModal'

// Convierte minutos a texto legible
function formatDuracion(minutos) {
  if (minutos < 60) return `${minutos} min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m > 0 ? `${h}h ${m}min` : `${h} hora${h > 1 ? 's' : ''}`
}

// Color de fondo por duración
function colorDuracion(minutos) {
  if (minutos <= 45)  return { bg: '#e8f5e9', color: '#2e7d32' }
  if (minutos <= 90)  return { bg: '#e3f2fd', color: '#1565c0' }
  return { bg: '#f3e5f5', color: '#6a1b9a' }
}

export default function Servicios() {
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'ADMINISTRADOR'

  const { servicios, loading, crearServicio, editarServicio, eliminarServicio }
    = useServicios()

  const [modalAbierto, setModalAbierto]   = useState(false)
  const [servicioEditar, setServicioEditar] = useState(null)

  const abrirCrear = () => {
    setServicioEditar(null)
    setModalAbierto(true)
  }

  const abrirEditar = (servicio) => {
    setServicioEditar(servicio)
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setServicioEditar(null)
  }

  const handleGuardar = async (datos) => {
    if (servicioEditar) return await editarServicio(servicioEditar.id, datos)
    return await crearServicio(datos)
  }

  const handleEliminar = async (servicio) => {
    const confirmar = window.confirm(
      `¿Eliminar el servicio "${servicio.nombre}"? Esta acción no se puede deshacer.`
    )
    if (confirmar) await eliminarServicio(servicio.id)
  }

  return (
    <div>

      {/* Encabezado */}
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>✂️ Servicios</h1>
          <p style={estilos.subtitulo}>
            {loading
              ? 'Cargando...'
              : `${servicios.length} servicio${servicios.length !== 1 ? 's' : ''} disponible${servicios.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        {/* Solo el admin puede crear servicios */}
        {esAdmin && (
          <button style={estilos.btnAgregar} onClick={abrirCrear}>
            + Nuevo servicio
          </button>
        )}
      </div>

      {/* Cargando */}
      {loading && (
        <div style={estilos.estadoVacio}>
          <span style={{ fontSize: 40 }}>⏳</span>
          <p style={{ color: '#888' }}>Cargando servicios...</p>
        </div>
      )}

      {/* Sin servicios */}
      {!loading && servicios.length === 0 && (
        <div style={estilos.estadoVacio}>
          <span style={{ fontSize: 64 }}>✂️</span>
          <h3 style={{ margin: '12px 0 4px', color: '#333' }}>
            No hay servicios aún
          </h3>
          <p style={{ color: '#888', margin: '0 0 20px' }}>
            {esAdmin
              ? 'Crea el primer servicio para que los clientes puedan agendar citas'
              : 'Próximamente habrá servicios disponibles'}
          </p>
          {esAdmin && (
            <button style={estilos.btnAgregar} onClick={abrirCrear}>
              + Crear primer servicio
            </button>
          )}
        </div>
      )}

      {/* Grid de servicios */}
      {!loading && servicios.length > 0 && (
        <div style={estilos.grid}>
          {servicios.map(servicio => {
            const colores = colorDuracion(servicio.duracion)
            return (
              <div key={servicio.id} style={estilos.card}>

                {/* Icono y nombre */}
                <div style={estilos.cardTop}>
                  <div style={estilos.cardIcono}>✂️</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={estilos.cardNombre}>{servicio.nombre}</h3>
                    {servicio.descripcion && (
                      <p style={estilos.cardDesc}>{servicio.descripcion}</p>
                    )}
                  </div>
                </div>

                {/* Precio y duración */}
                <div style={estilos.cardInfo}>
                  <div style={estilos.cardPrecio}>
                    <span style={estilos.precioLabel}>Precio</span>
                    <span style={estilos.precioValor}>
                      Bs. {parseFloat(servicio.precio).toFixed(2)}
                    </span>
                  </div>

                  <span style={{
                    ...estilos.tag,
                    background: colores.bg,
                    color: colores.color
                  }}>
                    ⏱ {formatDuracion(servicio.duracion)}
                  </span>
                </div>

                {/* Botones — solo admin */}
                {esAdmin && (
                  <div style={estilos.cardAcciones}>
                    <button
                      style={estilos.btnEditar}
                      onClick={() => abrirEditar(servicio)}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      style={estilos.btnEliminar}
                      onClick={() => handleEliminar(servicio)}
                    >
                      🗑️
                    </button>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <ServicioModal
          servicio={servicioEditar}
          onGuardar={handleGuardar}
          onCerrar={cerrarModal}
        />
      )}

    </div>
  )
}

const estilos = {
  encabezado: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  titulo: {
    margin: '0 0 4px',
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  subtitulo: {
    margin: 0,
    color: '#888',
    fontSize: 14,
  },
  btnAgregar: {
    padding: '10px 20px',
    background: '#6c63ff',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  estadoVacio: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    background: '#fff',
    borderRadius: 16,
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#fff',
    borderRadius: 14,
    padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  cardTop: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardIcono: {
    width: 44,
    height: 44,
    minWidth: 44,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #6c63ff22, #a78bfa22)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
  },
  cardNombre: {
    margin: '0 0 4px',
    fontSize: 16,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  cardDesc: {
    margin: 0,
    fontSize: 12,
    color: '#888',
    lineHeight: 1.5,
  },
  cardInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderTop: '1px solid #f5f5f5',
    borderBottom: '1px solid #f5f5f5',
  },
  cardPrecio: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  precioLabel: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  precioValor: {
    fontSize: 20,
    fontWeight: 700,
    color: '#6c63ff',
  },
  tag: {
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 12px',
    borderRadius: 20,
  },
  cardAcciones: {
    display: 'flex',
    gap: 8,
  },
  btnEditar: {
    flex: 1,
    padding: '8px 0',
    background: '#f3f4f6',
    color: '#444',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnEliminar: {
    padding: '8px 12px',
    background: '#fff0f0',
    color: '#e53e3e',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  },
}