import { useState } from 'react'

const ROLES_STAFF = ['GROOMER', 'CAJERO', 'ADMINISTRADOR']

const COLOR_ROL = {
  GROOMER:       { bg: '#e3f2fd', color: '#1565c0' },
  CAJERO:        { bg: '#fff3e0', color: '#e65100' },
  ADMINISTRADOR: { bg: '#f3e5f5', color: '#6a1b9a' },
}

function calcularFuerza(p) {
  let pts = 0
  if (p.length >= 8)           pts++
  if (/[A-Z]/.test(p))         pts++
  if (/[a-z]/.test(p))         pts++
  if (/[0-9]/.test(p))         pts++
  if (/[^A-Za-z0-9]/.test(p)) pts++
  if (pts <= 2) return { color: '#e53e3e', pct: 25,  label: 'Débil'  }
  if (pts <= 3) return { color: '#e65100', pct: 50,  label: 'Regular'}
  if (pts <= 4) return { color: '#1565c0', pct: 75,  label: 'Buena'  }
  return               { color: '#2e7d32', pct: 100, label: 'Fuerte' }
}

export default function PersonalModal({ onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    nombre:   '',
    email:    '',
    password: '',
    rol:      'GROOMER'
  })
  const [verPass, setVerPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const fuerza = calcularFuerza(form.password)

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return alert('Escribe el nombre')
    if (!form.email.trim())  return alert('Escribe el email')
    if (form.password.length < 8)
      return alert('La contraseña debe tener al menos 8 caracteres')
    if (!/[A-Z]/.test(form.password))
      return alert('La contraseña debe tener al menos una mayúscula')
    if (!/[0-9]/.test(form.password))
      return alert('La contraseña debe tener al menos un número')

    setLoading(true)
    const exito = await onGuardar(form)
    if (exito) onCerrar()
    setLoading(false)
  }

  const colores = COLOR_ROL[form.rol]

  return (
    <div style={estilos.overlay} onClick={onCerrar}>
      <div style={estilos.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={estilos.header}>
          <h2 style={estilos.titulo}>👤 Crear personal</h2>
          <button style={estilos.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        <div style={estilos.body}>

          {/* Selector de rol */}
          <div style={estilos.campo}>
            <label style={estilos.label}>Rol del personal</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {ROLES_STAFF.map(rol => {
                const c = COLOR_ROL[rol]
                const activo = form.rol === rol
                return (
                  <button
                    key={rol}
                    style={{
                      flex: 1, padding: '10px 8px',
                      borderRadius: 10, border: '2px solid',
                      borderColor: activo ? c.color : '#e5e7eb',
                      background: activo ? c.bg : '#fafafa',
                      color: activo ? c.color : '#888',
                      fontWeight: activo ? 700 : 400,
                      fontSize: 12, cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onClick={() => setForm(p => ({ ...p, rol }))}
                  >
                    {rol === 'GROOMER' && '✂️ '}
                    {rol === 'CAJERO' && '💰 '}
                    {rol === 'ADMINISTRADOR' && '👑 '}
                    {rol}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Info del rol */}
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: colores.bg, border: `1px solid ${colores.color}30`
          }}>
            <p style={{ margin: 0, fontSize: 12, color: colores.color, fontWeight: 600 }}>
              {form.rol === 'GROOMER' && '✂️ El Groomer puede ver y gestionar citas e inventario'}
              {form.rol === 'CAJERO' && '💰 El Cajero puede gestionar clientes y emitir facturas'}
              {form.rol === 'ADMINISTRADOR' && '👑 El Administrador tiene acceso completo al sistema'}
            </p>
          </div>

          {/* Nombre */}
          <div style={estilos.campo}>
            <label style={estilos.label}>
              Nombre completo <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              style={estilos.input}
              name="nombre"
              placeholder="Nombre del empleado"
              value={form.nombre}
              onChange={handleChange}
              autoFocus
            />
          </div>

          {/* Email */}
          <div style={estilos.campo}>
            <label style={estilos.label}>
              Email <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              style={estilos.input}
              name="email"
              type="email"
              placeholder="empleado@spa.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          {/* Contraseña temporal */}
          <div style={estilos.campo}>
            <label style={estilos.label}>
              Contraseña temporal <span style={{ color: 'red' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...estilos.input, paddingRight: 44 }}
                name="password"
                type={verPass ? 'text' : 'password'}
                placeholder="Mín. 8 chars, mayús, número"
                value={form.password}
                onChange={handleChange}
              />
              <button
                style={estilos.btnOjo}
                onClick={() => setVerPass(!verPass)}
                type="button"
              >
                {verPass ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Barra de fuerza */}
            {form.password && (
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 5, borderRadius: 10, background: '#eee', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 10,
                    width: `${fuerza.pct}%`,
                    background: fuerza.color,
                    transition: 'all 0.3s'
                  }} />
                </div>
                <span style={{ fontSize: 11, color: fuerza.color, fontWeight: 700 }}>
                  Contraseña {fuerza.label}
                </span>
              </div>
            )}
          </div>

          {/* Aviso — sin email de verificación */}
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 10, padding: '10px 14px'
          }}>
            <p style={{ margin: 0, fontSize: 12, color: '#166534' }}>
              ✅ La cuenta se activa de inmediato. El empleado puede
              iniciar sesión con estas credenciales desde ya.
              Compártelas de forma segura.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div style={estilos.footer}>
          <button style={estilos.btnCancelar} onClick={onCerrar}>
            Cancelar
          </button>
          <button
            style={{ ...estilos.btnGuardar, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Creando...' : '✅ Crear personal'}
          </button>
        </div>

      </div>
    </div>
  )
}

const estilos = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000, padding: 16,
  },
  modal: {
    background: '#fff', borderRadius: 16,
    width: '100%', maxWidth: 480,
    maxHeight: '90vh', display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #f0f0f0', flexShrink: 0,
  },
  titulo: { margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a2e' },
  btnCerrar: {
    background: 'none', border: 'none',
    fontSize: 18, cursor: 'pointer', color: '#999',
  },
  body: {
    padding: '20px 24px', display: 'flex',
    flexDirection: 'column', gap: 14,
    overflowY: 'auto', flex: 1,
  },
  campo: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#444' },
  input: {
    padding: '10px 12px', borderRadius: 8,
    border: '1.5px solid #e5e7eb', fontSize: 14,
    outline: 'none', background: '#fff',
    color: '#333', fontFamily: 'inherit',
    width: '100%', boxSizing: 'border-box',
  },
  btnOjo: {
    position: 'absolute', right: 12, top: '50%',
    transform: 'translateY(-50%)', background: 'none',
    border: 'none', cursor: 'pointer', fontSize: 16, padding: 0,
  },
  footer: {
    display: 'flex', gap: 10, padding: '16px 24px',
    borderTop: '1px solid #f0f0f0',
    justifyContent: 'flex-end', flexShrink: 0,
  },
  btnCancelar: {
    padding: '10px 20px', background: '#f3f4f6',
    color: '#555', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  btnGuardar: {
    padding: '10px 24px', background: '#6c63ff',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
}
