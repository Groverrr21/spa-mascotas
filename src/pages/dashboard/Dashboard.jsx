import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

// ── Colores del sistema ─────────────────────────────
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

// ── Tarjeta de estadística ──────────────────────────
function StatCard({ icono, titulo, valor, subtitulo, color }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      padding: '20px 24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{
        width: 52, height: 52, minWidth: 52,
        borderRadius: 12,
        background: `${color}15`,
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 26,
      }}>
        {icono}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 13, color: '#888', fontWeight: 600 }}>
          {titulo}
        </p>
        <p style={{ margin: '2px 0', fontSize: 28, fontWeight: 800, color: '#1a1a2e' }}>
          {valor}
        </p>
        {subtitulo && (
          <p style={{ margin: 0, fontSize: 12, color: '#aaa' }}>{subtitulo}</p>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { perfil } = useAuth()
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [citasMes, setCitasMes] = useState([])
  const [estadosCitas, setEstadosCitas] = useState([])
  const [serviciosTop, setServiciosTop] = useState([])
  const [citasRecientes, setCitasRecientes] = useState([])

  useEffect(() => {
    if (perfil) cargarDatos()
  }, [perfil])

  const cargarDatos = async () => {
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

  // ── Estadísticas generales ──────────────────────
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

    const totalFacturado = (facturas ?? [])
      .reduce((sum, f) => sum + parseFloat(f.total ?? 0), 0)

    setStats({ totalClientes, totalMascotas, totalCitas, totalFacturado })
  }

  // ── Citas por mes (últimos 6 meses) ────────────
  const cargarCitasPorMes = async () => {
    const { data } = await supabase
      .from('cita')
      .select('fecha, estado')
      .order('fecha')

    if (!data) return

    const meses = {}
    const ahora = new Date()

    // Inicializar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      const key = fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      meses[key] = { mes: key, citas: 0, completadas: 0 }
    }

    data.forEach(cita => {
      const fecha = new Date(cita.fecha)
      const key = fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      if (meses[key]) {
        meses[key].citas++
        if (cita.estado === 'COMPLETADA') meses[key].completadas++
      }
    })

    setCitasMes(Object.values(meses))
  }

  // ── Distribución de estados ─────────────────────
  const cargarEstadosCitas = async () => {
    const { data } = await supabase.from('cita').select('estado')
    if (!data) return

    const conteo = {}
    data.forEach(c => {
      conteo[c.estado] = (conteo[c.estado] ?? 0) + 1
    })

    const resultado = Object.entries(conteo).map(([estado, cantidad]) => ({
      estado,
      cantidad,
      color: ESTADO_COLORES[estado] ?? '#888'
    }))

    setEstadosCitas(resultado)
  }

  // ── Servicios más solicitados ───────────────────
  const cargarServiciosTop = async () => {
    const { data } = await supabase
      .from('cita_servicio')
      .select('servicio(nombre, precio)')

    if (!data) return

    const conteo = {}
    data.forEach(cs => {
      const nombre = cs.servicio?.nombre
      if (nombre) {
        conteo[nombre] = (conteo[nombre] ?? 0) + 1
      }
    })

    const resultado = Object.entries(conteo)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)

    setServiciosTop(resultado)
  }

  // ── Citas recientes ─────────────────────────────
  const cargarCitasRecientes = async () => {
    const { data } = await supabase
      .from('cita')
      .select(`
        id, fecha, estado,
        mascota ( nombre ),
        cita_servicio ( servicio ( nombre ) )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    setCitasRecientes(data ?? [])
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', minHeight: 400,
        flexDirection: 'column', gap: 12
      }}>
        <span style={{ fontSize: 48 }}>🐾</span>
        <p style={{ color: '#888' }}>Cargando dashboard...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Bienvenida */}
      <div style={{
        background: 'linear-gradient(135deg, #6c63ff 0%, #a78bfa 100%)',
        borderRadius: 16, padding: '24px 28px', color: '#fff',
      }}>
        <p style={{ margin: '0 0 4px', opacity: 0.85, fontSize: 14 }}>
          Bienvenido de vuelta 👋
        </p>
        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700 }}>
          {perfil?.nombre}
        </h1>
        <span style={{
          background: 'rgba(255,255,255,0.2)',
          padding: '3px 12px', borderRadius: 20,
          fontSize: 12, fontWeight: 600
        }}>
          {perfil?.rol}
        </span>
      </div>

      {/* Tarjetas de estadísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16,
      }}>
        <StatCard
          icono="👥" titulo="Clientes"
          valor={stats?.totalClientes ?? 0}
          subtitulo="registrados"
          color={COLORES.purple}
        />
        <StatCard
          icono="🐾" titulo="Mascotas"
          valor={stats?.totalMascotas ?? 0}
          subtitulo="en el sistema"
          color={COLORES.green}
        />
        <StatCard
          icono="📅" titulo="Citas totales"
          valor={stats?.totalCitas ?? 0}
          subtitulo="agendadas"
          color={COLORES.blue}
        />
        <StatCard
          icono="💰" titulo="Facturado"
          valor={`Bs. ${(stats?.totalFacturado ?? 0).toFixed(0)}`}
          subtitulo="total cobrado"
          color={COLORES.orange}
        />
      </div>

      {/* Gráfica de citas por mes + estados */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

        {/* Área — citas por mes */}
        <div style={estilos.graficoCard}>
          <h3 style={estilos.graficoTitulo}>📈 Citas por mes</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={citasMes}>
              <defs>
                <linearGradient id="colorCitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6c63ff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2e7d32" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Area
                type="monotone" dataKey="citas"
                name="Total citas"
                stroke="#6c63ff" fill="url(#colorCitas)"
                strokeWidth={2}
              />
              <Area
                type="monotone" dataKey="completadas"
                name="Completadas"
                stroke="#2e7d32" fill="url(#colorComp)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie — estados de citas */}
        <div style={estilos.graficoCard}>
          <h3 style={estilos.graficoTitulo}>🔵 Estados de citas</h3>
          {estadosCitas.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={estadosCitas}
                    dataKey="cantidad"
                    nameKey="estado"
                    cx="50%" cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                  >
                    {estadosCitas.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [val, name]}
                    contentStyle={{ borderRadius: 8, border: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Leyenda */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                {estadosCitas.map((e, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', fontSize: 12
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: e.color, display: 'inline-block'
                      }}/>
                      {e.estado}
                    </span>
                    <strong>{e.cantidad}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>
              Sin datos aún
            </p>
          )}
        </div>

      </div>

      {/* Servicios más solicitados + Citas recientes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Bar — servicios top */}
        <div style={estilos.graficoCard}>
          <h3 style={estilos.graficoTitulo}>✂️ Servicios más solicitados</h3>
          {serviciosTop.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={serviciosTop} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category" dataKey="nombre"
                  tick={{ fontSize: 11, fill: '#555' }} width={100}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none' }}
                  formatter={(val) => [val, 'Solicitudes']}
                />
                <Bar dataKey="cantidad" fill="#6c63ff" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#aaa', textAlign: 'center', marginTop: 60 }}>
              Sin datos aún
            </p>
          )}
        </div>

        {/* Citas recientes */}
        <div style={estilos.graficoCard}>
          <h3 style={estilos.graficoTitulo}>🕐 Citas recientes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {citasRecientes.length === 0 && (
              <p style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>
                Sin citas aún
              </p>
            )}
            {citasRecientes.map(cita => {
              const cfg = {
                PENDIENTE:  { color: '#e65100', bg: '#fff3e0' },
                CONFIRMADA: { color: '#1565c0', bg: '#e3f2fd' },
                COMPLETADA: { color: '#2e7d32', bg: '#e8f5e9' },
                CANCELADA:  { color: '#c62828', bg: '#ffebee' },
              }[cita.estado] ?? { color: '#888', bg: '#f5f5f5' }

              return (
                <div key={cita.id} style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: '#fafafa',
                  borderRadius: 10,
                  border: '1px solid #f0f0f0',
                }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>
                      🐾 {cita.mascota?.nombre ?? '—'}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>
                      {new Date(cita.fecha).toLocaleDateString('es-ES', {
                        day: 'numeric', month: 'short'
                      })}
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
        </div>

      </div>

    </div>
  )
}

const estilos = {
  graficoCard: {
    background: '#fff',
    borderRadius: 14,
    padding: '20px 20px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  graficoTitulo: {
    margin: '0 0 16px',
    fontSize: 15,
    fontWeight: 700,
    color: '#1a1a2e',
  },
}