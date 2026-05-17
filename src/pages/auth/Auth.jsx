import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const VISTA = {
  LOGIN:    'login',
  REGISTRO: 'registro',
  CODIGO:   'codigo'
}
 
function calcularFuerza(password) {
  let pts = 0
  if (password.length >= 8)           pts++
  if (password.length >= 12)          pts++
  if (/[A-Z]/.test(password))         pts++
  if (/[a-z]/.test(password))         pts++
  if (/[0-9]/.test(password))         pts++
  if (/[^A-Za-z0-9]/.test(password)) pts++
  if (pts <= 2) return { nivel: 'Débil',   color: '#ef4444', pct: 25  }
  if (pts <= 3) return { nivel: 'Regular', color: '#f97316', pct: 50  }
  if (pts <= 4) return { nivel: 'Buena',   color: '#3b82f6', pct: 75  }
  return             { nivel: 'Fuerte',  color: '#22c55e', pct: 100 }
}

function validarPassword(p) {
  const err = []
  if (p.length < 8)              err.push('Mínimo 8 caracteres')
  if (!/[A-Z]/.test(p))         err.push('Al menos una mayúscula')
  if (!/[a-z]/.test(p))         err.push('Al menos una minúscula')
  if (!/[0-9]/.test(p))         err.push('Al menos un número')
  if (!/[^A-Za-z0-9]/.test(p)) err.push('Al menos un símbolo')
  return err
}

async function registrarLog(accion, email, detalle = '') {
  try {
    const info = {
      accion, email, detalle,
      fecha: new Date().toISOString(),
      navegador: navigator.userAgent.substring(0, 100),
    }
    const logs = JSON.parse(localStorage.getItem('spa_logs') || '[]')
    logs.unshift(info)
    localStorage.setItem('spa_logs', JSON.stringify(logs.slice(0, 100)))
    await supabase.from('log_auditoria').insert(info)
  } catch (e) {}
}

export default function Auth() {
  const [vista, setVista]         = useState(VISTA.LOGIN)
  const [nombre, setNombre]       = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [verPass, setVerPass]     = useState(false)
  const [codigo, setCodigo]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [intentos, setIntentos]   = useState(0)
  const [bloqueado, setBloqueado] = useState(false)
  const [tiempoBloqueo, setTiempoBloqueo] = useState(0)
  const [mounted, setMounted]     = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setTimeout(() => setMounted(true), 50)
  }, [])

  useEffect(() => {
    if (!bloqueado) return
    const iv = setInterval(() => {
      setTiempoBloqueo(prev => {
        if (prev <= 1) { setBloqueado(false); setIntentos(0); clearInterval(iv); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [bloqueado])

  const fuerza = calcularFuerza(password)

  const handleRegistro = async () => {
    if (!nombre || !email || !password) return toast.error('Completa todos los campos')
    const errs = validarPassword(password)
    if (errs.length > 0) return toast.error(errs[0])
    setLoading(true)
    await registrarLog('REGISTRO_INTENTO', email)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nombre, rol: 'CLIENTE' } }
    })
    if (error) {
      await registrarLog('REGISTRO_ERROR', email, error.message)
      if (error.message.includes('already registered')) {
        toast.error('Ese email ya tiene cuenta'); setVista(VISTA.LOGIN)
      } else toast.error(error.message)
    } else {
      await registrarLog('REGISTRO_EXITOSO', email)
      toast.success('¡Código enviado a tu email!')
      setVista(VISTA.CODIGO)
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    if (bloqueado) return toast.error(`Bloqueado. Espera ${tiempoBloqueo}s`)
    if (!email || !password) return toast.error('Completa todos los campos')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const n = intentos + 1
      setIntentos(n)
      await registrarLog('LOGIN_FALLIDO', email, `Intento ${n}/5`)
      if (n >= 5) { setBloqueado(true); setTiempoBloqueo(300); toast.error('🔒 Bloqueado 5 minutos') }
      else toast.error(`Credenciales incorrectas. Intento ${n}/5`)
      if (error.message.includes('Email not confirmed')) { setVista(VISTA.CODIGO) }
    } else {
      setIntentos(0)
      await registrarLog('LOGIN_EXITOSO', email)
      toast.success('¡Bienvenido!')
      navigate('/dashboard')
    }
    setLoading(false)
  }

  const handleVerificarCodigo = async () => {
    if (codigo.length !== 6) return toast.error('El código tiene 6 dígitos')
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: 'signup' })
    if (error) {
      toast.error(error.message.includes('expired') ? 'Código expirado (15 min)' : 'Código incorrecto')
      await registrarLog('OTP_FALLIDO', email)
    } else {
      await registrarLog('OTP_EXITOSO', email)
      toast.success('¡Email verificado!')
      navigate('/dashboard')
    }
    setLoading(false)
  }

  const handleReenviar = async () => {
    setLoading(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) toast.error(error.message)
    else toast.success('Código reenviado (15 min)')
    setLoading(false)
  }

  const handleKey = (e) => {
    if (e.key !== 'Enter') return
    if (vista === VISTA.LOGIN)    handleLogin()
    if (vista === VISTA.REGISTRO) handleRegistro()
    if (vista === VISTA.CODIGO)   handleVerificarCodigo()
  }

  // ── PANTALLA CÓDIGO OTP ──────────────────────────────────────
  if (vista === VISTA.CODIGO) {
    return (
      <div style={s.page}>
        <div style={s.bgGlow} />
        <div style={{
          ...s.card,
          maxWidth: 400, width: '100%', margin: 'auto',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.5s ease',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={s.iconBox}>📧</div>
            <h1 style={s.cardTitle}>Verifica tu email</h1>
            <p style={s.cardSub}>
              Código enviado a<br />
              <strong style={{ color: '#e2e8f0' }}>{email}</strong>
            </p>
            <p style={{ color: '#f97316', fontSize: 12, marginTop: 8 }}>
              ⏱ Expira en 15 minutos
            </p>
          </div>

          <div style={s.field}>
            <label style={s.label}>Código de 6 dígitos</label>
            <input
              style={{ ...s.input, fontSize: 26, fontWeight: 800, textAlign: 'center', letterSpacing: 14, color: '#38bdf8' }}
              type="text" inputMode="numeric" maxLength={6}
              placeholder="000000"
              value={codigo}
              onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleKey}
              autoFocus
            />
          </div>

          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1, marginTop: 8 }} onClick={handleVerificarCodigo} disabled={loading}>
            {loading ? 'Verificando...' : 'Confirmar código'}
          </button>
          <button style={s.btnGhost} onClick={handleReenviar} disabled={loading}>
            ¿No llegó? Reenviar código
          </button>
          <p style={s.toggle}>
            <span style={s.link} onClick={() => setVista(VISTA.REGISTRO)}>← Volver</span>
          </p>
        </div>
      </div>
    )
  }

  // ── PANTALLA PRINCIPAL ───────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.bgGlow} />
      <div style={s.bgGrid} />

      {/* Panel izquierdo — branding */}
      <div style={{
        ...s.branding,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateX(0)' : 'translateX(-30px)',
        transition: 'all 0.6s ease'
      }}>
        <div style={s.brandLogo}>🐾</div>
        <h1 style={s.brandTitle}>Spa<br />Mascotas</h1>
        <p style={s.brandSub}>
          Sistema profesional de gestión integral para tu negocio de cuidado animal
        </p>

        <div style={s.brandFeatures}>
          {[
            { icono: '📅', texto: 'Agenda de citas inteligente' },
            { icono: '🐾', texto: 'Gestión de mascotas y clientes' },
            { icono: '🧾', texto: 'Facturación automática' },
            { icono: '📊', texto: 'Dashboard con estadísticas' },
          ].map((f, i) => (
            <div key={i} style={s.brandFeatureItem}>
              <span style={s.brandFeatureIcono}>{f.icono}</span>
              <span style={s.brandFeatureTexto}>{f.texto}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{
        ...s.formPanel,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateX(0)' : 'translateX(30px)',
        transition: 'all 0.6s ease 0.1s'
      }}>
        <div style={s.card}>

          {/* Tabs login / registro */}
          <div style={s.tabs}>
            <button
              style={{ ...s.tab, ...(vista === VISTA.LOGIN ? s.tabActivo : {}) }}
              onClick={() => { setVista(VISTA.LOGIN); setPassword(''); setIntentos(0) }}
            >
              Iniciar sesión
            </button>
            <button
              style={{ ...s.tab, ...(vista === VISTA.REGISTRO ? s.tabActivo : {}) }}
              onClick={() => { setVista(VISTA.REGISTRO); setPassword('') }}
            >
              Crear cuenta
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>

            {/* ── AVISO TIPO DE USUARIO — solo en registro ── */}
            {vista === VISTA.REGISTRO && (
              <div style={{
                background: 'rgba(56,189,248,0.06)',
                border: '1px solid rgba(56,189,248,0.2)',
                borderRadius: 12,
                padding: '14px 16px',
              }}>
                {/* Título sección */}
                <p style={{
                  margin: '0 0 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#38bdf8',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  📋 Tipo de cuenta
                </p>

                {/* Cliente — activo */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  marginBottom: 10,
                }}>
                  <span style={{ fontSize: 22 }}>👤</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#86efac', fontSize: 13 }}>
                      Cliente
                    </p>
                    <p style={{ margin: 0, color: '#4ade80', fontSize: 11 }}>
                      Registra mascotas y agenda citas
                    </p>
                  </div>
                  <span style={{
                    background: 'rgba(34,197,94,0.15)',
                    color: '#4ade80',
                    fontSize: 10, fontWeight: 700,
                    padding: '3px 10px', borderRadius: 20,
                    whiteSpace: 'nowrap',
                  }}>
                    ✅ REGISTRO LIBRE
                  </span>
                </div>

                {/* Separador */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 0 10px' }} />

                {/* Roles de personal */}
                <p style={{
                  margin: '0 0 8px',
                  fontSize: 11,
                  color: '#475569',
                  fontWeight: 600,
                }}>
                  🔒 El personal es creado solo por el Administrador:
                </p>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { icono: '✂️', rol: 'Groomer',       color: '#60a5fa' },
                    { icono: '💰', rol: 'Cajero',        color: '#fb923c' },
                    { icono: '👑', rol: 'Administrador', color: '#c084fc' },
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(15,23,42,0.6)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      opacity: 0.6,
                    }}>
                      <span style={{ fontSize: 14 }}>{item.icono}</span>
                      <span style={{ fontSize: 11, color: item.color, fontWeight: 600 }}>
                        {item.rol}
                      </span>
                      <span style={{ fontSize: 10, color: '#475569' }}>🔒</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nombre — solo registro */}
            {vista === VISTA.REGISTRO && (
              <div style={s.field}>
                <label style={s.label}>Nombre completo</label>
                <input
                  style={s.input}
                  type="text"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  onKeyDown={handleKey}
                  autoFocus
                />
              </div>
            )}

            {/* Email */}
            <div style={s.field}>
              <label style={s.label}>Correo electrónico</label>
              <div style={{ position: 'relative' }}>
                <span style={s.inputIcon}>✉️</span>
                <input
                  style={{ ...s.input, paddingLeft: 40 }}
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={handleKey}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div style={s.field}>
              <label style={s.label}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <span style={s.inputIcon}>🔒</span>
                <input
                  style={{ ...s.input, paddingLeft: 40, paddingRight: 44 }}
                  type={verPass ? 'text' : 'password'}
                  placeholder={vista === VISTA.REGISTRO
                    ? 'Mín. 8 chars, mayús, núm, símbolo'
                    : 'Tu contraseña'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKey}
                />
                <button style={s.btnOjo} onClick={() => setVerPass(!verPass)} type="button">
                  {verPass ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Medidor de fuerza — solo en registro */}
              {vista === VISTA.REGISTRO && password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, borderRadius: 10, background: '#1e293b', overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{
                      height: '100%', width: `${fuerza.pct}%`,
                      background: fuerza.color, borderRadius: 10, transition: 'all 0.3s'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: fuerza.color, fontWeight: 700 }}>
                      Contraseña {fuerza.nivel}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                    {[
                      { t: '8+ caracteres',  ok: password.length >= 8 },
                      { t: 'Mayúscula',      ok: /[A-Z]/.test(password) },
                      { t: 'Minúscula',      ok: /[a-z]/.test(password) },
                      { t: 'Número',         ok: /[0-9]/.test(password) },
                      { t: 'Símbolo (!@#)', ok: /[^A-Za-z0-9]/.test(password) },
                    ].map((r, i) => (
                      <span key={i} style={{
                        fontSize: 10,
                        color: r.ok ? '#22c55e' : '#475569',
                        display: 'flex', alignItems: 'center', gap: 3
                      }}>
                        {r.ok ? '✅' : '⭕'} {r.t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Alerta bloqueo */}
            {bloqueado && (
              <div style={s.alertaBloqueo}>
                🔒 Cuenta bloqueada —{' '}
                <strong>
                  {Math.floor(tiempoBloqueo / 60)}:{String(tiempoBloqueo % 60).padStart(2, '0')}
                </strong>
              </div>
            )}

            {/* Contador intentos */}
            {intentos > 0 && !bloqueado && vista === VISTA.LOGIN && (
              <div style={s.alertaIntentos}>
                ⚠️ {intentos}/5 intentos fallidos{intentos >= 3 ? ' — cuidado' : ''}
              </div>
            )}

            {/* Botón principal */}
            <button
              style={{
                ...s.btn,
                opacity: (loading || bloqueado) ? 0.6 : 1,
                cursor: bloqueado ? 'not-allowed' : 'pointer',
                marginTop: 4
              }}
              onClick={vista === VISTA.LOGIN ? handleLogin : handleRegistro}
              disabled={loading || bloqueado}
            >
              {loading
                ? 'Cargando...'
                : vista === VISTA.LOGIN ? 'Iniciar sesión →' : 'Crear cuenta →'}
            </button>

          </div>
        </div>

        {/* Footer */}
        <p style={s.footer}>
          © 2026 Spa Mascotas · Sistema de gestión profesional
        </p>
      </div>
    </div>
  )
}

// ── ESTILOS ────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    background: '#0a0f1e',
    fontFamily: "'Segoe UI', sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'fixed',
    top: '-20%', left: '-10%',
    width: '60%', height: '60%',
    background: 'radial-gradient(ellipse, rgba(56,189,248,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  bgGrid: {
    position: 'fixed',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(56,189,248,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56,189,248,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
    zIndex: 0,
  },
  branding: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '60px 64px',
    position: 'relative',
    zIndex: 1,
  },
  brandLogo: {
    fontSize: 56,
    marginBottom: 16,
    lineHeight: 1,
  },
  brandTitle: {
    fontSize: 52,
    fontWeight: 800,
    color: '#f1f5f9',
    margin: '0 0 16px',
    lineHeight: 1.1,
    letterSpacing: -1,
  },
  brandSub: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 1.7,
    maxWidth: 340,
    marginBottom: 40,
  },
  brandFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  brandFeatureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  brandFeatureIcono: {
    width: 36, height: 36, minWidth: 36,
    borderRadius: 8,
    background: 'rgba(56,189,248,0.1)',
    border: '1px solid rgba(56,189,248,0.15)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 18,
  },
  brandFeatureTexto: {
    fontSize: 14, color: '#94a3b8',
  },
  formPanel: {
    width: 500,
    minWidth: 440,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '40px 48px',
    position: 'relative',
    zIndex: 1,
    borderLeft: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(15,23,42,0.8)',
    backdropFilter: 'blur(20px)',
    overflowY: 'auto',
  },
  card: {
    background: 'rgba(30,41,59,0.6)',
    border: '1px solid rgba(56,189,248,0.12)',
    borderRadius: 20,
    padding: '32px 28px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
  },
  cardTitle: {
    margin: '12px 0 6px',
    fontSize: 22,
    fontWeight: 700,
    color: '#f1f5f9',
  },
  cardSub: {
    margin: 0,
    color: '#64748b',
    fontSize: 13,
    lineHeight: 1.6,
  },
  iconBox: {
    width: 56, height: 56,
    background: 'rgba(56,189,248,0.1)',
    border: '1px solid rgba(56,189,248,0.2)',
    borderRadius: 16,
    display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: 28,
  },
  tabs: {
    display: 'flex',
    background: 'rgba(15,23,42,0.6)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  tab: {
    flex: 1, padding: '9px 0',
    background: 'transparent',
    border: 'none', borderRadius: 10,
    color: '#475569', fontSize: 13,
    fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActivo: {
    background: 'rgba(56,189,248,0.15)',
    color: '#38bdf8',
    boxShadow: '0 0 0 1px rgba(56,189,248,0.2)',
  },
  field: {
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  label: {
    fontSize: 12, fontWeight: 600,
    color: '#94a3b8', letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  inputIcon: {
    position: 'absolute', left: 12, top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 16, pointerEvents: 'none',
  },
  input: {
    width: '100%', padding: '11px 14px',
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(56,189,248,0.15)',
    borderRadius: 10, fontSize: 14,
    color: '#e2e8f0', outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  btnOjo: {
    position: 'absolute', right: 12, top: '50%',
    transform: 'translateY(-50%)',
    background: 'none', border: 'none',
    cursor: 'pointer', fontSize: 16, padding: 0,
  },
  btn: {
    width: '100%', padding: '13px',
    background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    letterSpacing: 0.3,
    boxShadow: '0 4px 20px rgba(56,189,248,0.25)',
    transition: 'all 0.2s',
  },
  btnGhost: {
    width: '100%', padding: '11px',
    background: 'transparent',
    color: '#38bdf8',
    border: '1px solid rgba(56,189,248,0.3)',
    borderRadius: 10, fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
    marginTop: 8,
  },
  toggle: {
    textAlign: 'center', fontSize: 13,
    color: '#475569', margin: '8px 0 0',
  },
  link: {
    color: '#38bdf8', fontWeight: 600, cursor: 'pointer',
  },
  alertaBloqueo: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#fca5a5', borderRadius: 10,
    padding: '10px 14px', fontSize: 13, textAlign: 'center',
  },
  alertaIntentos: {
    background: 'rgba(249,115,22,0.1)',
    border: '1px solid rgba(249,115,22,0.3)',
    color: '#fdba74', borderRadius: 10,
    padding: '8px 14px', fontSize: 13, textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    color: '#1e293b',
    fontSize: 12,
    marginTop: 24,
  },
}