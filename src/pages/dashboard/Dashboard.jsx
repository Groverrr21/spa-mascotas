import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const COLORES = {
  purple: '#6c63ff',
  green:  '#2e7d32',
  blue:   '#1565c0',
  orange: '#e65100',
  red:    '#c62828',
}

const ESTADO_COLORES = {
  PENDIENTE:  '#e65100',
  CONFIRMADA: '#1565c0',
  COMPLETADA: '#2e7d32',
  CANCELADA:  '#c62828',
}

function StatCard({ icono, titulo, valor, subtitulo, color }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', gap: 16,
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{
        width: 52, height: 52, minWidth: 52, borderRadius: 12,
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
      }}>
        {icono}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 13, color: '#888', fontWeight: 600 }}>{titulo}</p>
        <p style={{ margin: '2px 0', fontSize: 28, fontWeight: 800, color: '#1a1a2e' }}>{valor}</p>
        {subtitulo && <p style={{ margin: 0, fontSize: 12, color: '#aaa' }}>{subtitulo}</p>}
      </div>
    </div>
  )
}

// ── DASHBOARD ADMINISTRADOR ───────────────────────────────────
function DashboardAdmin({ perfil }) {
  const [stats,          setStats]          = useState(null)
  const [citasMes,       setCitasMes]       = useState([])
  const [estadosCitas,   setEstadosCitas]   = useState([])
  const [serviciosTop,   setServiciosTop]   = useState([])
  const [citasRecientes, setCitasRecientes] = useState([])
  const [loading,        setLoading]        = useState(true)

  useEffect(() => { cargarTodo() }, [])

  const cargarTodo = async () => {
    setLoading(true)
    await Promise.all([
      cargarStats(),
      cargarCitasPorMes(),
      cargarEstadosCitas(),
      cargarServiciosTop(),
      cargarCitasRecientes(),
    ])
    setLoading(false)
  }

  const cargarStats = async () => {
    const [
      { count: totalClientes },
      { count: totalMascotas },
      { count: totalCitas },
      { data: facturas },
    ] = await Promise.all([
      supabase.from('usuario').select('*', { count: 'exact', head: true }).eq('rol', 'CLIENTE'),
      supabase.from('mascota').select('*', { count: 'exact', head: true }),
      supabase.from('cita').select('*', { count: 'exact', head: true }),
      supabase.from('factura').select('total'),
    ])
    const totalFacturado = (facturas ?? []).reduce((s, f) => s + parseFloat(f.total ?? 0), 0)
    setStats({ totalClientes, totalMascotas, totalCitas, totalFacturado })
  }

  const cargarCitasPorMes = async () => {
    const { data } = await supabase.from('cita').select('fecha, estado').order('fecha')
    if (!data) return

    const meses = {}
    const ahora = new Date()
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      const key = fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      meses[key] = { mes: key, citas: 0, completadas: 0 }
    }
    data.forEach(c => {
      const key = new Date(c.fecha).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      if (meses[key]) { meses[key].citas++; if (c.estado === 'COMPLETADA') meses[key].completadas++ }
    })
    setCitasMes(Object.values(meses))
  }

  const cargarEstadosCitas = async () => {
    const { data } = await supabase.from('cita').select('estado')
    if (!data) return
    const conteo = {}
    data.forEach(c => { conteo[c.estado] = (conteo[c.estado] ?? 0) + 1 })
    setEstadosCitas(
      Object.entries(conteo).map(([estado, cantidad]) => ({
        estado, cantidad, color: ESTADO_COLORES[estado] ?? '#888'
      }))
    )
  }

  const cargarServiciosTop = async () => {
    const { data } = await supabase.from('cita_servicio').select('servicio(nombre)')
    if (!data) return
    const conteo = {}
    data.forEach(cs => {
      const n = cs.servicio?.nombre
      if (n) conteo[n] = (conteo[n] ?? 0) + 1
    })
    setServiciosTop(
      Object.entries(conteo)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5)
    )
  }

  const cargarCitasRecientes = async () => {
    const { data } = await supabase
      .from('cita')
      .select('id, fecha, estado, mascota(nombre)')
      .order('created_at', { ascending: false })
      .limit(5)
    setCitasRecientes(data ?? [])
  }

  if (loading) return <Cargando />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <BannerBienvenida perfil={perfil} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard icono="👥" titulo="Clientes"     valor={stats?.totalClientes ?? 0}                         subtitulo="registrados"   color={COLORES.purple} />
        <StatCard icono="🐾" titulo="Mascotas"     valor={stats?.totalMascotas ?? 0}                         subtitulo="en el sistema" color={COLORES.green}  />
        <StatCard icono="📅" titulo="Citas totales" valor={stats?.totalCitas ?? 0}                           subtitulo="agendadas"     color={COLORES.blue}   />
        <StatCard icono="💰" titulo="Facturado"    valor={`Bs. ${(stats?.totalFacturado ?? 0).toFixed(0)}`} subtitulo="total cobrado" color={COLORES.orange} />
      </div>

      {/* Gráficas fila 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={s.card}>
          <h3 style={s.cardTitulo}>📈 Citas por mes</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={citasMes}>
              <defs>
                <linearGradient id="gCitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6c63ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6c63ff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gComp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2e7d32" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2e7d32" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="citas"       name="Total citas"  stroke="#6c63ff" fill="url(#gCitas)" strokeWidth={2} />
              <Area type="monotone" dataKey="completadas" name="Completadas"  stroke="#2e7d32" fill="url(#gComp)"  strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={s.card}>
          <h3 style={s.cardTitulo}>🔵 Estados de citas</h3>
          {estadosCitas.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={estadosCitas} dataKey="cantidad" nameKey="estado" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                    {estadosCitas.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                {estadosCitas.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: e.color, display: 'inline-block' }} />
                      {e.estado}
                    </span>
                    <strong>{e.cantidad}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : <SinDatos />}
        </div>
      </div>

      {/* Gráficas fila 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={s.card}>
          <h3 style={s.cardTitulo}>✂️ Servicios más solicitados</h3>
          {serviciosTop.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={serviciosTop} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11, fill: '#555' }} width={110} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} formatter={v => [v, 'Solicitudes']} />
                <Bar dataKey="cantidad" fill="#6c63ff" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <SinDatos />}
        </div>

        <div style={s.card}>
          <h3 style={s.cardTitulo}>🕐 Citas recientes</h3>
          <ListaCitasRecientes citas={citasRecientes} />
        </div>
      </div>
    </div>
  )
}

// ── DASHBOARD CLIENTE ─────────────────────────────────────────
function DashboardCliente({ perfil }) {
  const [misMascotas,  setMisMascotas]  = useState([])
  const [misCitas,     setMisCitas]     = useState([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => { cargarTodo() }, [])

  const cargarTodo = async () => {
    setLoading(true)
    const { data: mascotas } = await supabase
      .from('mascota').select('id, nombre, raza, tamanio').eq('id_cliente', perfil.id)

    const ids = (mascotas ?? []).map(m => m.id)
    let citas = []
    if (ids.length > 0) {
      const { data } = await supabase
        .from('cita')
        .select('id, fecha, estado, mascota(nombre), cita_servicio(servicio(nombre, precio))')
        .in('id_mascota', ids)
        .order('fecha', { ascending: false })
        .limit(10)
      citas = data ?? []
    }

    setMisMascotas(mascotas ?? [])
    setMisCitas(citas)
    setLoading(false)
  }

  if (loading) return <Cargando />

  const citasPendientes  = misCitas.filter(c => c.estado === 'PENDIENTE').length
  const citasCompletadas = misCitas.filter(c => c.estado === 'COMPLETADA').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <BannerBienvenida perfil={perfil} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        <StatCard icono="🐾" titulo="Mis mascotas"    valor={misMascotas.length}  subtitulo="registradas"   color={COLORES.green}  />
        <StatCard icono="📅" titulo="Citas totales"   valor={misCitas.length}     subtitulo="en el sistema" color={COLORES.blue}   />
        <StatCard icono="⏳" titulo="Pendientes"      valor={citasPendientes}     subtitulo="por confirmar" color={COLORES.orange} />
        <StatCard icono="🏁" titulo="Completadas"     valor={citasCompletadas}    subtitulo="servicios recibidos" color={COLORES.green} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Mis mascotas */}
        <div style={s.card}>
          <h3 style={s.cardTitulo}>🐾 Mis mascotas</h3>
          {misMascotas.length === 0 ? (
            <div style={s.vacio}>
              <span style={{ fontSize: 40 }}>🐶</span>
              <p style={{ color: '#aaa', margin: '8px 0 0', fontSize: 13 }}>
                Aún no tienes mascotas registradas
              </p>
              <a href="/mascotas" style={s.linkBtn}>+ Registrar mascota</a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {misMascotas.map(m => (
                <div key={m.id} style={s.itemRow}>
                  <span style={{ fontSize: 22 }}>🐾</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>{m.nombre}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>{m.raza || 'Sin raza'} · {m.tamanio}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mis citas recientes */}
        <div style={s.card}>
          <h3 style={s.cardTitulo}>📅 Mis citas recientes</h3>
          {misCitas.length === 0 ? (
            <div style={s.vacio}>
              <span style={{ fontSize: 40 }}>📅</span>
              <p style={{ color: '#aaa', margin: '8px 0 0', fontSize: 13 }}>Sin citas aún</p>
              <a href="/citas" style={s.linkBtn}>+ Agendar cita</a>
            </div>
          ) : (
            <ListaCitasRecientes citas={misCitas.slice(0, 5)} />
          )}
        </div>

      </div>
    </div>
  )
}

// ── DASHBOARD GROOMER ─────────────────────────────────────────
function DashboardGroomer({ perfil }) {
  const [misCitas,  setMisCitas]  = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { cargarTodo() }, [])

  const cargarTodo = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('cita')
      .select('id, fecha, estado, mascota(nombre, tamanio), cita_servicio(servicio(nombre))')
      .eq('id_groomer', perfil.id)
      .order('fecha', { ascending: false })
      .limit(20)
    setMisCitas(data ?? [])
    setLoading(false)
  }

  if (loading) return <Cargando />

  const hoy         = new Date().toDateString()
  const citasHoy    = misCitas.filter(c => new Date(c.fecha).toDateString() === hoy)
  const pendientes  = misCitas.filter(c => c.estado === 'PENDIENTE').length
  const confirmadas = misCitas.filter(c => c.estado === 'CONFIRMADA').length
  const completadas = misCitas.filter(c => c.estado === 'COMPLETADA').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <BannerBienvenida perfil={perfil} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 }}>
        <StatCard icono="📅" titulo="Citas hoy"    valor={citasHoy.length}  subtitulo="programadas"  color={COLORES.purple} />
        <StatCard icono="⏳" titulo="Pendientes"   valor={pendientes}       subtitulo="por confirmar" color={COLORES.orange} />
        <StatCard icono="✅" titulo="Confirmadas"  valor={confirmadas}      subtitulo="listas"        color={COLORES.blue}   />
        <StatCard icono="🏁" titulo="Completadas"  valor={completadas}      subtitulo="este período"  color={COLORES.green}  />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={s.card}>
          <h3 style={s.cardTitulo}>📅 Citas de hoy ({citasHoy.length})</h3>
          {citasHoy.length === 0 ? (
            <div style={s.vacio}>
              <span style={{ fontSize: 36 }}>🌟</span>
              <p style={{ color: '#aaa', margin: '8px 0 0', fontSize: 13 }}>No tienes citas para hoy</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {citasHoy.map(c => <CitaGroomerItem key={c.id} cita={c} />)}
            </div>
          )}
        </div>

        <div style={s.card}>
          <h3 style={s.cardTitulo}>🕐 Próximas citas</h3>
          <ListaCitasRecientes citas={misCitas.filter(c => c.estado !== 'CANCELADA').slice(0, 5)} />
        </div>
      </div>
    </div>
  )
}

// ── DASHBOARD CAJERO ──────────────────────────────────────────
function DashboardCajero({ perfil }) {
  const [stats,    setStats]    = useState(null)
  const [facturas, setFacturas] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { cargarTodo() }, [])

  const cargarTodo = async () => {
    setLoading(true)
    const [
      { count: totalCitas },
      { count: citasSinFactura },
      { data: facturasData },
    ] = await Promise.all([
      supabase.from('cita').select('*', { count: 'exact', head: true }).eq('estado', 'COMPLETADA'),
      supabase.from('cita').select('*', { count: 'exact', head: true }).eq('estado', 'COMPLETADA')
        .not('id', 'in', `(select id_cita from factura)`),
      supabase.from('factura').select('total, fecha_emision').order('fecha_emision', { ascending: false }).limit(5),
    ])

    const totalFacturado = (facturasData ?? []).reduce((s, f) => s + parseFloat(f.total ?? 0), 0)
    setStats({ totalCitas: totalCitas ?? 0, citasSinFactura: citasSinFactura ?? 0, totalFacturado })
    setFacturas(facturasData ?? [])
    setLoading(false)
  }

  if (loading) return <Cargando />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <BannerBienvenida perfil={perfil} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        <StatCard icono="🏁" titulo="Citas completadas"  valor={stats?.totalCitas ?? 0}        subtitulo="listas para facturar"   color={COLORES.green}  />
        <StatCard icono="📋" titulo="Sin facturar"        valor={stats?.citasSinFactura ?? 0}   subtitulo="pendientes de cobro"    color={COLORES.orange} />
        <StatCard icono="💰" titulo="Facturado reciente"  valor={`Bs. ${(stats?.totalFacturado ?? 0).toFixed(0)}`} subtitulo="últimas 5 facturas" color={COLORES.purple} />
      </div>

      <div style={s.card}>
        <h3 style={s.cardTitulo}>🧾 Últimas facturas emitidas</h3>
        {facturas.length === 0 ? (
          <div style={s.vacio}>
            <span style={{ fontSize: 40 }}>🧾</span>
            <p style={{ color: '#aaa', margin: '8px 0 0', fontSize: 13 }}>Sin facturas emitidas aún</p>
            <a href="/facturas" style={s.linkBtn}>+ Emitir factura</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {facturas.map((f, i) => (
              <div key={i} style={{ ...s.itemRow, justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#555' }}>
                  📅 {new Date(f.fecha_emision).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#6c63ff' }}>
                  Bs. {parseFloat(f.total).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── COMPONENTES AUXILIARES ────────────────────────────────────

function BannerBienvenida({ perfil }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #6c63ff 0%, #a78bfa 100%)',
      borderRadius: 16, padding: '24px 28px', color: '#fff',
    }}>
      <p style={{ margin: '0 0 4px', opacity: 0.85, fontSize: 14 }}>Bienvenido de vuelta 👋</p>
      <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700 }}>{perfil?.nombre}</h1>
      <span style={{
        background: 'rgba(255,255,255,0.2)', padding: '3px 12px',
        borderRadius: 20, fontSize: 12, fontWeight: 600
      }}>
        {perfil?.rol}
      </span>
    </div>
  )
}

function ListaCitasRecientes({ citas }) {
  if (!citas || citas.length === 0) return <SinDatos />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {citas.map(cita => {
        const cfg = {
          PENDIENTE:  { color: '#e65100', bg: '#fff3e0' },
          CONFIRMADA: { color: '#1565c0', bg: '#e3f2fd' },
          COMPLETADA: { color: '#2e7d32', bg: '#e8f5e9' },
          CANCELADA:  { color: '#c62828', bg: '#ffebee' },
        }[cita.estado] ?? { color: '#888', bg: '#f5f5f5' }
        return (
          <div key={cita.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', background: '#fafafa',
            borderRadius: 10, border: '1px solid #f0f0f0',
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>
                🐾 {cita.mascota?.nombre ?? '—'}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>
                {new Date(cita.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700,
              padding: '3px 10px', borderRadius: 20,
              background: cfg.bg, color: cfg.color
            }}>
              {cita.estado}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function CitaGroomerItem({ cita }) {
  const cfg = {
    PENDIENTE:  { color: '#e65100', bg: '#fff3e0' },
    CONFIRMADA: { color: '#1565c0', bg: '#e3f2fd' },
    COMPLETADA: { color: '#2e7d32', bg: '#e8f5e9' },
  }[cita.estado] ?? { color: '#888', bg: '#f5f5f5' }

  return (
    <div style={{
      padding: '10px 14px', borderRadius: 10,
      border: `1px solid ${cfg.color}30`, background: cfg.bg + '40',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      <div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>
          🐾 {cita.mascota?.nombre} · {cita.mascota?.tamanio}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: '#888' }}>
          {(cita.cita_servicio ?? []).map(cs => cs.servicio?.nombre).join(', ')}
        </p>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
        {new Date(cita.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

function Cargando() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 48 }}>🐾</span>
      <p style={{ color: '#888' }}>Cargando dashboard...</p>
    </div>
  )
}

function SinDatos() {
  return <p style={{ color: '#aaa', textAlign: 'center', marginTop: 40, fontSize: 13 }}>Sin datos aún</p>
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function Dashboard() {
  const { perfil } = useAuth()

  if (!perfil) return <Cargando />

  if (perfil.rol === 'ADMINISTRADOR') return <DashboardAdmin    perfil={perfil} />
  if (perfil.rol === 'CLIENTE')       return <DashboardCliente  perfil={perfil} />
  if (perfil.rol === 'GROOMER')       return <DashboardGroomer  perfil={perfil} />
  if (perfil.rol === 'CAJERO')        return <DashboardCajero   perfil={perfil} />

  return <DashboardCliente perfil={perfil} />
}

const s = {
  card:      { background: '#fff', borderRadius: 14, padding: '20px 20px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTitulo:{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1a1a2e' },
  vacio:     { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 20px', textAlign: 'center' },
  itemRow:   { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#fafafa', borderRadius: 8 },
  linkBtn:   { marginTop: 10, color: '#6c63ff', fontWeight: 600, fontSize: 13, textDecoration: 'none', background: '#f0eeff', padding: '6px 16px', borderRadius: 20 },
}
