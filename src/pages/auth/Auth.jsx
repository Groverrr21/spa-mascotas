import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// ── Logger de auditoría ───────────────────────────────────────
async function logAuditoria(accion, email, detalle = '') {
  try {
    await supabase.from('log_auditoria').insert({
      accion, email, detalle,
      navegador: navigator.userAgent.substring(0, 120),
    })
  } catch (e) {
    console.warn('Log error:', e)
  }
}

export default function Auth() {
  const [modo,     setModo]     = useState('login')   // 'login' | 'registro' | 'otp'
  const [form,     setForm]     = useState({ nombre: '', email: '', password: '', confirmar: '', telefono: '' })
  const [loading,  setLoading]  = useState(false)
  const [verPass,  setVerPass]  = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode,  setOtpCode]  = useState('')

  const set = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  // ── LOGIN ─────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!form.email.trim() || !form.password) return toast.error('Completa todos los campos')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email:    form.email.trim().toLowerCase(),
        password: form.password,
      })
      if (error) {
        await logAuditoria('LOGIN_FALLIDO', form.email, error.message)
        toast.error('Email o contraseña incorrectos')
      } else {
        await logAuditoria('LOGIN_EXITOSO', form.email, 'Inicio de sesión correcto')
      }
    } catch (e) {
      toast.error('Error inesperado')
    }
    setLoading(false)
  }

  // ── REGISTRO ──────────────────────────────────────────────────
  const handleRegistro = async () => {
    if (!form.nombre.trim())    return toast.error('Escribe tu nombre')
    if (!form.email.trim())     return toast.error('Escribe tu email')
    if (form.password.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres')
    if (form.password !== form.confirmar) return toast.error('Las contraseñas no coinciden')

    setLoading(true)
    try {
      await logAuditoria('REGISTRO_INTENTO', form.email, 'Intento de registro')

      const { data, error } = await supabase.auth.signUp({
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        options:  { data: { nombre: form.nombre.trim(), rol: 'CLIENTE' } },
      })

      if (error) {
        await logAuditoria('REGISTRO_ERROR', form.email, error.message)
        if (error.message.includes('already registered'))
          toast.error('Ese email ya está registrado')
        else
          toast.error(`Error: ${error.message}`)
        setLoading(false)
        return
      }

      // Guardar teléfono si fue ingresado
      if (form.telefono.trim() && data.user) {
        await supabase
          .from('usuario')
          .update({ telefono: form.telefono.trim() })
          .eq('id', data.user.id)
      }

      await logAuditoria('REGISTRO_EXITOSO', form.email, 'Cuenta creada correctamente')
      toast.success('¡Cuenta creada!')

      // Si Supabase pide OTP
      if (!data.session) {
        setOtpEmail(form.email.trim().toLowerCase())
        setModo('otp')
      }
    } catch (e) {
      toast.error('Error inesperado')
    }
    setLoading(false)
  }

  // ── OTP ───────────────────────────────────────────────────────
  const handleOtp = async () => {
    if (otpCode.length < 6) return toast.error('Ingresa el código de 6 dígitos')
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: otpEmail, token: otpCode, type: 'signup'
      })
      if (error) {
        await logAuditoria('OTP_FALLIDO', otpEmail, error.message)
        toast.error('Código incorrecto o expirado')
      } else {
        await logAuditoria('OTP_EXITOSO', otpEmail, 'Verificación OTP correcta')
        toast.success('¡Verificado! Iniciando sesión...')
      }
    } catch (e) {
      toast.error('Error al verificar')
    }
    setLoading(false)
  }

  return (
    <div style={s.fondo}>
      <div style={s.card}>

        {/* Logo */}
        <div style={s.logoBox}>
          <span style={{ fontSize: 48 }}>🐾</span>
          <h1 style={s.logoTitulo}>Spa Mascotas</h1>
          <p style={s.logoSub}>Sistema de gestión</p>
        </div>

        {/* ── LOGIN ── */}
        {modo === 'login' && (
          <>
            <h2 style={s.titulo}>Iniciar sesión</h2>

            <div style={s.campo}>
              <label style={s.label}>Email</label>
              <input style={s.input} name="email" type="email"
                placeholder="tu@email.com"
                value={form.email} onChange={set}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>

            <div style={s.campo}>
              <label style={s.label}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...s.input, paddingRight: 44 }}
                  name="password"
                  type={verPass ? 'text' : 'password'}
                  placeholder="Tu contraseña"
                  value={form.password} onChange={set}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button style={s.btnOjo} onClick={() => setVerPass(!verPass)} type="button">
                  {verPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              style={{ ...s.btnPrimario, opacity: loading ? 0.7 : 1 }}
              onClick={handleLogin} disabled={loading}>
              {loading ? 'Iniciando...' : 'Iniciar sesión'}
            </button>

            <p style={s.switchText}>
              ¿No tienes cuenta?{' '}
              <button style={s.switchBtn} onClick={() => setModo('registro')}>
                Regístrate aquí
              </button>
            </p>
          </>
        )}

        {/* ── REGISTRO ── */}
        {modo === 'registro' && (
          <>
            <h2 style={s.titulo}>Crear cuenta</h2>

            <div style={s.campo}>
              <label style={s.label}>Nombre completo <span style={{ color: 'red' }}>*</span></label>
              <input style={s.input} name="nombre"
                placeholder="Tu nombre"
                value={form.nombre} onChange={set} autoFocus />
            </div>

            <div style={s.campo}>
              <label style={s.label}>Email <span style={{ color: 'red' }}>*</span></label>
              <input style={s.input} name="email" type="email"
                placeholder="tu@email.com"
                value={form.email} onChange={set} />
            </div>

            {/* TELÉFONO — nuevo campo */}
            <div style={s.campo}>
              <label style={s.label}>
                Teléfono WhatsApp
                <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>
                  (para notificaciones)
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>
                  💬
                </span>
                <input
                  style={{ ...s.input, paddingLeft: 38 }}
                  name="telefono"
                  type="tel"
                  placeholder="Ej: 59170000000"
                  value={form.telefono}
                  onChange={set}
                />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#aaa' }}>
                Incluye el código de país. Ej: 591 para Bolivia
              </p>
            </div>

            <div style={s.campo}>
              <label style={s.label}>Contraseña <span style={{ color: 'red' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...s.input, paddingRight: 44 }}
                  name="password"
                  type={verPass ? 'text' : 'password'}
                  placeholder="Mín. 8 caracteres"
                  value={form.password} onChange={set}
                />
                <button style={s.btnOjo} onClick={() => setVerPass(!verPass)} type="button">
                  {verPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={s.campo}>
              <label style={s.label}>Confirmar contraseña <span style={{ color: 'red' }}>*</span></label>
              <input style={s.input} name="confirmar" type="password"
                placeholder="Repite tu contraseña"
                value={form.confirmar} onChange={set} />
              {form.confirmar && form.password !== form.confirmar && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#e53e3e' }}>
                  Las contraseñas no coinciden
                </p>
              )}
            </div>

            <button
              style={{ ...s.btnPrimario, opacity: loading ? 0.7 : 1 }}
              onClick={handleRegistro} disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>

            <p style={s.switchText}>
              ¿Ya tienes cuenta?{' '}
              <button style={s.switchBtn} onClick={() => setModo('login')}>
                Inicia sesión
              </button>
            </p>
          </>
        )}

        {/* ── OTP ── */}
        {modo === 'otp' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 48 }}>📧</span>
              <h2 style={s.titulo}>Verificar email</h2>
              <p style={{ color: '#666', fontSize: 14, margin: '8px 0 0' }}>
                Enviamos un código de 6 dígitos a<br />
                <strong>{otpEmail}</strong>
              </p>
            </div>

            <div style={s.campo}>
              <label style={s.label}>Código de verificación</label>
              <input
                style={{ ...s.input, textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 700 }}
                type="text" maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <button
              style={{ ...s.btnPrimario, opacity: loading ? 0.7 : 1 }}
              onClick={handleOtp} disabled={loading}>
              {loading ? 'Verificando...' : 'Verificar código'}
            </button>

            <p style={s.switchText}>
              <button style={s.switchBtn} onClick={() => setModo('login')}>
                ← Volver al login
              </button>
            </p>
          </>
        )}

      </div>
    </div>
  )
}

const s = {
  fondo:      { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d4e 100%)', padding: 16 },
  card:       { background: '#fff', borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 420, boxShadow: '0 24px 80px rgba(0,0,0,0.3)' },
  logoBox:    { textAlign: 'center', marginBottom: 28 },
  logoTitulo: { margin: '8px 0 4px', fontSize: 24, fontWeight: 800, color: '#1a1a2e' },
  logoSub:    { margin: 0, color: '#888', fontSize: 13 },
  titulo:     { margin: '0 0 20px', fontSize: 20, fontWeight: 700, color: '#1a1a2e' },
  campo:      { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  label:      { fontSize: 13, fontWeight: 600, color: '#444' },
  input:      { padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fafafa', color: '#333', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', transition: 'border-color 0.2s' },
  btnOjo:     { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 },
  btnPrimario:{ width: '100%', padding: '13px 0', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4, transition: 'all 0.2s' },
  switchText: { textAlign: 'center', margin: '16px 0 0', fontSize: 13, color: '#888' },
  switchBtn:  { background: 'none', border: 'none', color: '#6c63ff', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
}
