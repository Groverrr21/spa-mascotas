import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function Perfil() {
  const { perfil } = useAuth()
  const [form,    setForm]    = useState({ nombre: '', telefono: '' })
  const [loading, setLoading] = useState(false)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    if (perfil) {
      setForm({
        nombre:   perfil.nombre    ?? '',
        telefono: perfil.telefono  ?? '',
      })
    }
  }, [perfil])

  const set = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleGuardar = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    setLoading(true)
    try {
      const { error } = await supabase
        .from('usuario')
        .update({ nombre: form.nombre.trim(), telefono: form.telefono.trim() || null })
        .eq('id', perfil.id)

      if (error) throw error
      toast.success('Perfil actualizado')
      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    } catch (e) {
      toast.error('Error al guardar')
    }
    setLoading(false)
  }

  const COLOR_ROL = {
    CLIENTE:       { bg: '#e8f5e9', color: '#2e7d32' },
    GROOMER:       { bg: '#e3f2fd', color: '#1565c0' },
    CAJERO:        { bg: '#fff3e0', color: '#e65100' },
    ADMINISTRADOR: { bg: '#f3e5f5', color: '#6a1b9a' },
  }
  const colores = COLOR_ROL[perfil?.rol] ?? COLOR_ROL.CLIENTE
  const inicial = perfil?.nombre?.charAt(0).toUpperCase() ?? '?'

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>
        👤 Mi Perfil
      </h1>
      <p style={{ margin: '0 0 24px', color: '#888', fontSize: 14 }}>
        Administra tu información personal
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, maxWidth: 700 }}>

        {/* Tarjeta de perfil */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#6c63ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700 }}>
            {inicial}
          </div>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>
              {perfil?.nombre}
            </p>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20, background: colores.bg, color: colores.color }}>
              {perfil?.rol}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#888' }}>{perfil?.email}</p>
          {perfil?.telefono && (
            <p style={{ margin: 0, fontSize: 12, color: '#2e7d32', fontWeight: 600 }}>
              💬 {perfil.telefono}
            </p>
          )}
        </div>

        {/* Formulario */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>
            Editar información
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>
                Nombre completo <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                style={inpStyle}
                name="nombre"
                value={form.nombre}
                onChange={set}
                placeholder="Tu nombre"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>
                Email
              </label>
              <input
                style={{ ...inpStyle, background: '#f5f5f5', color: '#999' }}
                value={perfil?.email ?? ''}
                disabled
              />
              <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>
                El email no se puede cambiar
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>
                Teléfono WhatsApp
                <span style={{ fontSize: 11, color: '#6c63ff', marginLeft: 6, fontWeight: 400 }}>
                  para recibir notificaciones
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>
                  💬
                </span>
                <input
                  style={{ ...inpStyle, paddingLeft: 38 }}
                  name="telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={set}
                  placeholder="Ej: 59170000000"
                />
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>
                Con código de país. Ej: 591 para Bolivia
              </p>
              {!perfil?.telefono && (
                <div style={{ padding: '8px 12px', background: '#fff3e0', borderRadius: 8, border: '1px solid #f97316' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#c05500', fontWeight: 600 }}>
                    ⚠️ Sin teléfono registrado — no podrás recibir notificaciones por WhatsApp
                  </p>
                </div>
              )}
            </div>

            <button
              style={{
                padding: '11px 0', background: guardado ? '#2e7d32' : '#6c63ff',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                transition: 'background 0.3s', opacity: loading ? 0.7 : 1,
              }}
              onClick={handleGuardar}
              disabled={loading}
            >
              {loading ? 'Guardando...' : guardado ? '✅ Guardado' : 'Guardar cambios'}
            </button>

          </div>
        </div>

      </div>
    </div>
  )
}

const inpStyle = {
  padding: '10px 12px', borderRadius: 8,
  border: '1.5px solid #e5e7eb', fontSize: 14,
  outline: 'none', background: '#fafafa',
  color: '#333', fontFamily: 'inherit',
  width: '100%', boxSizing: 'border-box',
}
