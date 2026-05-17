import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useMascotas } from './useMascotas'
import MascotaModal from './MascotaModal'

const COLOR_TAMANIO = {
  PEQUEÑO: { bg: '#e8f5e9', color: '#2e7d32' },
  MEDIANO: { bg: '#e3f2fd', color: '#1565c0' },
  GRANDE:  { bg: '#fff3e0', color: '#e65100' },
}

export default function Mascotas() {
  const { perfil } = useAuth()
  const { mascotas, loading, crearMascota, editarMascota, eliminarMascota }
    = useMascotas(perfil?.id)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [mascotaEditar, setMascotaEditar] = useState(null) // null = crear

  const abrirCrear = () => {
    setMascotaEditar(null)
    setModalAbierto(true)
  }

  const abrirEditar = (mascota) => {
    setMascotaEditar(mascota)
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setMascotaEditar(null)
  }

  const handleGuardar = async (datos) => {
    if (mascotaEditar) {
      return await editarMascota(mascotaEditar.id, datos)
    } else {
      return await crearMascota(datos)
    }
  }

  const handleEliminar = async (mascota) => {
    const confirmar = window.confirm(
      `¿Eliminar a ${mascota.nombre}? Esta acción no se puede deshacer.`
    )
    if (confirmar) await eliminarMascota(mascota.id)
  }

  return (
    <div>

      {/* Encabezado */}
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>🐾 Mis Mascotas</h1>
          <p style={estilos.subtitulo}>
            {mascotas.length === 0
              ? 'Aún no tienes mascotas registradas'
              : `${mascotas.length} mascota${mascotas.length > 1 ? 's' : ''} registrada${mascotas.length > 1 ? 's' : ''}`
            }
          </p>
        </div>
        <button style={estilos.btnAgregar} onClick={abrirCrear}>
          + Agregar mascota
        </button>
      </div>

      {/* Estado de carga */}
      {loading && (
        <div style={estilos.estadoVacio}>
          <span style={{ fontSize: 40 }}>⏳</span>
          <p>Cargando mascotas...</p>
        </div>
      )}

      {/* Sin mascotas */}
      {!loading && mascotas.length === 0 && (
        <div style={estilos.estadoVacio}>
          <span style={{ fontSize: 64 }}>🐶</span>
          <h3 style={{ margin: '12px 0 4px', color: '#333' }}>
            No tienes mascotas aún
          </h3>
          <p style={{ color: '#888', margin: '0 0 20px' }}>
            Registra tu primera mascota para poder agendar citas
          </p>
          <button style={estilos.btnAgregar} onClick={abrirCrear}>
            + Agregar mi primera mascota
          </button>
        </div>
      )}

      {/* Grid de mascotas */}
      {!loading && mascotas.length > 0 && (
        <div style={estilos.grid}>
          {mascotas.map(mascota => {
            const colores = COLOR_TAMANIO[mascota.tamanio] ?? COLOR_TAMANIO.MEDIANO
            return (
              <div key={mascota.id} style={estilos.card}>

                {/* Avatar de la mascota */}
                <div style={estilos.cardAvatar}>
                  🐾
                </div>

                {/* Info */}
                <div style={estilos.cardInfo}>
                  <h3 style={estilos.cardNombre}>{mascota.nombre}</h3>
                  <p style={estilos.cardRaza}>{mascota.raza || 'Raza no especificada'}</p>

                  <div style={estilos.cardTags}>
                    {/* Tamaño */}
                    <span style={{
                      ...estilos.tag,
                      background: colores.bg,
                      color: colores.color
                    }}>
                      {mascota.tamanio}
                    </span>

                    {/* Edad */}
                    {mascota.edad && (
                      <span style={{ ...estilos.tag, background: '#f3f4f6', color: '#555' }}>
                        {mascota.edad} año{mascota.edad > 1 ? 's' : ''}
                      </span>
                    )}

                    {/* Vacunas */}
                    <span style={{
                      ...estilos.tag,
                      background: mascota.vacunas === 'Al día' ? '#e8f5e9' : '#fff3e0',
                      color: mascota.vacunas === 'Al día' ? '#2e7d32' : '#e65100',
                    }}>
                      💉 {mascota.vacunas}
                    </span>
                  </div>
                </div>

                {/* Botones de acción */}
                <div style={estilos.cardAcciones}>
                  <button
                    style={estilos.btnEditar}
                    onClick={() => abrirEditar(mascota)}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    style={estilos.btnEliminar}
                    onClick={() => handleEliminar(mascota)}
                  >
                    🗑️
                  </button>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* Modal crear/editar */}
      {modalAbierto && (
        <MascotaModal
          mascota={mascotaEditar}
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
    justifyContent: 'center',
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
    gap: 12,
  },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6c63ff22, #a78bfa22)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
  },
  cardNombre: {
    margin: '0 0 2px',
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  cardRaza: {
    margin: '0 0 10px',
    fontSize: 13,
    color: '#888',
  },
  cardTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 20,
  },
  cardAcciones: {
    display: 'flex',
    gap: 8,
    paddingTop: 12,
    borderTop: '1px solid #f0f0f0',
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