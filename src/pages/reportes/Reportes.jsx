import { useState } from 'react'
import { useReportes } from './useReportes'
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

// ── Configuración ─────────────────────────────────────────────
const PERIODOS = [
  { valor: 'semana',       label: 'Últimos 7 días' },
  { valor: 'mes',          label: 'Este mes'        },
  { valor: 'mes_anterior', label: 'Mes anterior'    },
  { valor: 'anio',         label: 'Este año'        },
  { valor: 'todo',         label: 'Todo el tiempo'  },
]

const ESTADO_COLOR = {
  PENDIENTE:  '#e65100',
  CONFIRMADA: '#1565c0',
  COMPLETADA: '#2e7d32',
  CANCELADA:  '#c62828',
}

// ── Tarjeta de estadística ────────────────────────────────────
function StatCard({ icono, titulo, valor, sub, color = '#6c63ff' }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      padding: '18px 20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      borderLeft: `4px solid ${color}`,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 48, height: 48, minWidth: 48, borderRadius: 12,
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
      }}>
        {icono}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 12, color: '#888', fontWeight: 600 }}>{titulo}</p>
        <p style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{valor}</p>
        {sub && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#aaa' }}>{sub}</p>}
      </div>
    </div>
  )
}

function GraficoCard({ titulo, children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      padding: '20px 20px 16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      ...style,
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>
        {titulo}
      </h3>
      {children}
    </div>
  )
}

function SinDatos({ texto = 'Sin datos para este período' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', color: '#aaa' }}>
      <span style={{ fontSize: 36 }}>📭</span>
      <p style={{ margin: '8px 0 0', fontSize: 13 }}>{texto}</p>
    </div>
  )
}

// ── TAB VENTAS ────────────────────────────────────────────────
function TabVentas({ data }) {
  if (!data) return <SinDatos />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div style={grid4}>
        <StatCard icono="💰" titulo="Total facturado"    valor={`Bs. ${data.totalFacturado.toFixed(2)}`}  color="#6c63ff" />
        <StatCard icono="🧾" titulo="Facturas emitidas"  valor={data.cantidadFacturas}                    color="#1565c0" />
        <StatCard icono="📊" titulo="Promedio x factura" valor={`Bs. ${data.promedio.toFixed(2)}`}        color="#2e7d32" />
        <StatCard icono="🎉" titulo="Total descuentos"   valor={`Bs. ${data.totalDescuentos.toFixed(2)}`} color="#e65100" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        {/* Ingresos por mes */}
        <GraficoCard titulo="💰 Ingresos por mes (Bs.)">
          {data.ingresosPorMes.length === 0 ? <SinDatos /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.ingresosPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip
                  formatter={v => [`Bs. ${v}`, 'Ingresos']}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="total" fill="#6c63ff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GraficoCard>

        {/* Servicios más rentables */}
        <GraficoCard titulo="✂️ Servicios más rentables">
          {data.serviciosRentables.length === 0 ? <SinDatos /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.serviciosRentables} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `Bs.${v}`} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10, fill: '#555' }} width={90} />
                <Tooltip
                  formatter={(v, name) => name === 'ingresos' ? [`Bs. ${v}`, 'Ingresos'] : [v, 'Solicitudes']}
                  contentStyle={{ borderRadius: 8, border: 'none' }}
                />
                <Bar dataKey="ingresos"  fill="#6c63ff" radius={[0, 4, 4, 0]} name="ingresos" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GraficoCard>
      </div>

      {/* Tabla de servicios */}
      {data.serviciosRentables.length > 0 && (
        <GraficoCard titulo="📋 Detalle de servicios facturados">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f8ff' }}>
                {['Servicio', 'Solicitudes', 'Ingresos generados'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#888', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.serviciosRentables.map((s, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1a1a2e' }}>{s.nombre}</td>
                  <td style={{ padding: '10px 14px', color: '#555' }}>{s.cantidad} veces</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#6c63ff' }}>Bs. {s.ingresos.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GraficoCard>
      )}
    </div>
  )
}

// ── TAB CITAS ─────────────────────────────────────────────────
function TabCitas({ data }) {
  if (!data) return <SinDatos />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div style={grid4}>
        <StatCard icono="📅" titulo="Total citas"       valor={data.total}                         color="#6c63ff" />
        <StatCard icono="🏁" titulo="Completadas"       valor={data.completadas}                   color="#2e7d32" />
        <StatCard icono="❌" titulo="Canceladas"         valor={data.canceladas}                   color="#c62828" />
        <StatCard icono="📈" titulo="Tasa completación" valor={`${data.tasaCompletacion}%`}        color="#1565c0" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Citas por mes */}
        <GraficoCard titulo="📅 Citas por mes">
          {data.citasPorMes.length === 0 ? <SinDatos /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.citasPorMes}>
                <defs>
                  <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
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
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} />
                <Area type="monotone" dataKey="total"      name="Total"      stroke="#6c63ff" fill="url(#gTotal)" strokeWidth={2} />
                <Area type="monotone" dataKey="completadas" name="Completadas" stroke="#2e7d32" fill="url(#gComp)"  strokeWidth={2} />
                <Area type="monotone" dataKey="canceladas"  name="Canceladas"  stroke="#c62828" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </GraficoCard>

        {/* Por estado */}
        <GraficoCard titulo="🔵 Por estado">
          {data.porEstado.every(e => e.cantidad === 0) ? <SinDatos /> : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={data.porEstado.filter(e => e.cantidad > 0)}
                    dataKey="cantidad" nameKey="estado"
                    cx="50%" cy="50%" innerRadius={35} outerRadius={60}>
                    {data.porEstado.map((e, i) => (
                      <Cell key={i} fill={ESTADO_COLOR[e.estado] ?? '#888'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                {data.porEstado.filter(e => e.cantidad > 0).map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: ESTADO_COLOR[e.estado], display: 'inline-block' }} />
                      {e.estado}
                    </span>
                    <strong>{e.cantidad}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </GraficoCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Por día de la semana */}
        <GraficoCard titulo="📆 Citas por día de la semana">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.citasPorDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#888' }} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} formatter={v => [v, 'Citas']} />
              <Bar dataKey="cantidad" fill="#6c63ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GraficoCard>

        {/* Motivos de cancelación */}
        <GraficoCard titulo="❌ Motivos de cancelación">
          {data.motivosCancelacion.length === 0 ? (
            <SinDatos texto="Sin cancelaciones en este período" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.motivosCancelacion.map((m, i) => {
                const max = data.motivosCancelacion[0].cantidad
                const pct = (m.cantidad / max) * 100
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: '#555' }}>{m.motivo}</span>
                      <strong style={{ color: '#c62828' }}>{m.cantidad}</strong>
                    </div>
                    <div style={{ height: 6, background: '#f5f5f5', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#c62828', borderRadius: 10, transition: 'all 0.3s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GraficoCard>
      </div>
    </div>
  )
}

// ── TAB GROOMERS ──────────────────────────────────────────────
function TabGroomers({ data }) {
  if (!data || data.ranking.length === 0) return <SinDatos texto="Sin datos de groomers para este período" />

  const { ranking } = data
  const maxCompletadas = Math.max(...ranking.map(g => g.completadas), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Gráfica de barras */}
      <GraficoCard titulo="✂️ Citas por groomer">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ranking}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#888' }} />
            <YAxis tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} />
            <Bar dataKey="total"       name="Total"       fill="#6c63ff" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completadas" name="Completadas" fill="#2e7d32" radius={[4, 4, 0, 0]} />
            <Bar dataKey="canceladas"  name="Canceladas"  fill="#c62828" radius={[4, 4, 0, 0]} />
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      </GraficoCard>

      {/* Tabla de ranking */}
      <GraficoCard titulo="🏆 Ranking de groomers">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1a1a2e' }}>
              {['#', 'Groomer', 'Total', 'Completadas', 'Canceladas', 'Tasa', 'Calificación'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranking.map((g, i) => (
              <tr key={g.id} style={{ borderTop: '1px solid #f5f5f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '12px 14px', fontWeight: 700, color: i === 0 ? '#f59e0b' : '#aaa' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </td>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1a1a2e' }}>{g.nombre}</td>
                <td style={{ padding: '12px 14px', color: '#6c63ff', fontWeight: 700 }}>{g.total}</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: '#f0f0f0', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${maxCompletadas > 0 ? (g.completadas / maxCompletadas) * 100 : 0}%`, background: '#2e7d32', borderRadius: 10 }} />
                    </div>
                    <span style={{ color: '#2e7d32', fontWeight: 700, minWidth: 20 }}>{g.completadas}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 14px', color: '#c62828', fontWeight: 600 }}>{g.canceladas}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: g.tasaCompletacion >= 80 ? '#e8f5e9' : g.tasaCompletacion >= 60 ? '#fff3e0' : '#ffebee',
                    color:      g.tasaCompletacion >= 80 ? '#2e7d32' : g.tasaCompletacion >= 60 ? '#e65100' : '#c62828',
                  }}>
                    {g.tasaCompletacion}%
                  </span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  {g.promedioEstrellas !== null ? (
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                      {'⭐'.repeat(Math.round(g.promedioEstrellas))} {g.promedioEstrellas}
                    </span>
                  ) : (
                    <span style={{ color: '#ccc', fontSize: 12 }}>Sin calificaciones</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GraficoCard>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function Reportes() {
  const [tab,     setTab]     = useState('ventas')
  const [periodo, setPeriodo] = useState('mes')

  const { ventasData, citasData, groomersData, loading, recargar } = useReportes(periodo)

  const TABS = [
    { id: 'ventas',   label: '💰 Ventas'   },
    { id: 'citas',    label: '📅 Citas'    },
    { id: 'groomers', label: '✂️ Groomers' },
  ]

  return (
    <div>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>📊 Reportes</h1>
          <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Análisis y estadísticas del sistema</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Selector de período */}
          <select
            style={{
              padding: '8px 14px', borderRadius: 8,
              border: '1.5px solid #e5e7eb', fontSize: 13,
              background: '#fff', color: '#333', cursor: 'pointer',
              fontFamily: 'inherit', outline: 'none',
            }}
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
          >
            {PERIODOS.map(p => (
              <option key={p.valor} value={p.valor}>{p.label}</option>
            ))}
          </select>
          <button
            style={{ padding: '8px 14px', background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555' }}
            onClick={recargar}
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 24, gap: 4 }}>
        {TABS.map(t => (
          <button key={t.id}
            style={{
              flex: 1, padding: '9px 0',
              background: tab === t.id ? '#fff' : 'transparent',
              border: 'none', borderRadius: 10,
              color: tab === t.id ? '#6c63ff' : '#555',
              fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
              cursor: 'pointer',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', color: '#aaa' }}>
          <span style={{ fontSize: 48 }}>📊</span>
          <p style={{ margin: '12px 0 0' }}>Cargando reportes...</p>
        </div>
      ) : (
        <>
          {tab === 'ventas'   && <TabVentas   data={ventasData}   />}
          {tab === 'citas'    && <TabCitas    data={citasData}    />}
          {tab === 'groomers' && <TabGroomers data={groomersData} />}
        </>
      )}

    </div>
  )
}

// ── Utilidades de layout ──────────────────────────────────────
const grid4 = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 16,
}
