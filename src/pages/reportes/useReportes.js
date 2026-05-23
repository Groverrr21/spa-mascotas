import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// Devuelve { desde, hasta } según el período seleccionado
export function getRango(periodo) {
  const ahora = new Date()
  switch (periodo) {
    case 'semana': {
      const inicio = new Date(ahora)
      inicio.setDate(ahora.getDate() - 7)
      return { desde: inicio.toISOString(), hasta: ahora.toISOString() }
    }
    case 'mes':
      return {
        desde: new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString(),
        hasta: ahora.toISOString(),
      }
    case 'mes_anterior':
      return {
        desde: new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString(),
        hasta: new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59).toISOString(),
      }
    case 'anio':
      return {
        desde: new Date(ahora.getFullYear(), 0, 1).toISOString(),
        hasta: ahora.toISOString(),
      }
    default: // todo
      return { desde: '2020-01-01T00:00:00Z', hasta: ahora.toISOString() }
  }
}

export function useReportes(periodo) {
  const [ventasData,   setVentasData]   = useState(null)
  const [citasData,    setCitasData]    = useState(null)
  const [groomersData, setGroomersData] = useState(null)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    cargarTodo()
  }, [periodo])

  const cargarTodo = async () => {
    setLoading(true)
    try {
      await Promise.all([
        cargarVentas(),
        cargarCitas(),
        cargarGroomers(),
      ])
    } catch (e) {
      console.error(e)
      toast.error('Error al cargar reportes')
    }
    setLoading(false)
  }

  // ── VENTAS ───────────────────────────────────────────────────
  const cargarVentas = async () => {
    const { desde, hasta } = getRango(periodo)

    const { data: facturas, error } = await supabase
      .from('factura')
      .select('total, descuento, fecha_emision, id_cita, cita(cita_servicio(servicio(nombre, precio)))')
      .gte('fecha_emision', desde)
      .lte('fecha_emision', hasta)
      .order('fecha_emision')

    if (error) throw error

    const totalFacturado  = facturas.reduce((s, f) => s + parseFloat(f.total    ?? 0), 0)
    const totalDescuentos = facturas.reduce((s, f) => s + parseFloat(f.descuento ?? 0), 0)
    const promedio        = facturas.length > 0 ? totalFacturado / facturas.length : 0

    // Ingresos por mes
    const porMes = {}
    facturas.forEach(f => {
      const key = new Date(f.fecha_emision).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      porMes[key] = (porMes[key] ?? 0) + parseFloat(f.total ?? 0)
    })
    const ingresosPorMes = Object.entries(porMes).map(([mes, total]) => ({ mes, total: parseFloat(total.toFixed(2)) }))

    // Servicios más rentables
    const servicioConteo = {}
    facturas.forEach(f => {
      ;(f.cita?.cita_servicio ?? []).forEach(cs => {
        const nombre = cs.servicio?.nombre
        if (nombre) {
          servicioConteo[nombre] = servicioConteo[nombre] ?? { nombre, cantidad: 0, ingresos: 0 }
          servicioConteo[nombre].cantidad++
          servicioConteo[nombre].ingresos += parseFloat(cs.servicio?.precio ?? 0)
        }
      })
    })
    const serviciosRentables = Object.values(servicioConteo)
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 6)
      .map(s => ({ ...s, ingresos: parseFloat(s.ingresos.toFixed(2)) }))

    setVentasData({
      totalFacturado:  parseFloat(totalFacturado.toFixed(2)),
      totalDescuentos: parseFloat(totalDescuentos.toFixed(2)),
      cantidadFacturas: facturas.length,
      promedio:        parseFloat(promedio.toFixed(2)),
      ingresosPorMes,
      serviciosRentables,
    })
  }

  // ── CITAS ────────────────────────────────────────────────────
  const cargarCitas = async () => {
    const { desde, hasta } = getRango(periodo)

    const { data: citas, error } = await supabase
      .from('cita')
      .select('id, fecha, estado, motivo_cancelacion')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha')

    if (error) throw error

    // Conteo por estado
    const porEstado = { PENDIENTE: 0, CONFIRMADA: 0, COMPLETADA: 0, CANCELADA: 0 }
    citas.forEach(c => { porEstado[c.estado] = (porEstado[c.estado] ?? 0) + 1 })
    const estadosCitas = Object.entries(porEstado).map(([estado, cantidad]) => ({ estado, cantidad }))

    // Por mes
    const porMes = {}
    citas.forEach(c => {
      const key = new Date(c.fecha).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      porMes[key] = porMes[key] ?? { mes: key, total: 0, completadas: 0, canceladas: 0 }
      porMes[key].total++
      if (c.estado === 'COMPLETADA') porMes[key].completadas++
      if (c.estado === 'CANCELADA')  porMes[key].canceladas++
    })
    const citasPorMes = Object.values(porMes)

    // Por día de la semana
    const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const porDia = [0, 0, 0, 0, 0, 0, 0]
    citas.forEach(c => { porDia[new Date(c.fecha).getDay()]++ })
    const citasPorDia = DIAS.map((dia, i) => ({ dia, cantidad: porDia[i] }))

    // Motivos de cancelación
    const motivos = {}
    citas.filter(c => c.estado === 'CANCELADA' && c.motivo_cancelacion).forEach(c => {
      motivos[c.motivo_cancelacion] = (motivos[c.motivo_cancelacion] ?? 0) + 1
    })
    const motivosCancelacion = Object.entries(motivos)
      .map(([motivo, cantidad]) => ({ motivo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)

    const tasaCompletacion = citas.length > 0
      ? ((porEstado.COMPLETADA / citas.length) * 100).toFixed(1)
      : 0

    setCitasData({
      total:     citas.length,
      porEstado: estadosCitas,
      citasPorMes,
      citasPorDia,
      motivosCancelacion,
      tasaCompletacion,
      completadas: porEstado.COMPLETADA,
      canceladas:  porEstado.CANCELADA,
    })
  }

  // ── GROOMERS ─────────────────────────────────────────────────
  const cargarGroomers = async () => {
    const { desde, hasta } = getRango(periodo)

    // Citas por groomer en el período
    const { data: citas } = await supabase
      .from('cita')
      .select('id_groomer, estado')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .not('id_groomer', 'is', null)

    // Nombres de groomers
    const { data: usuarios } = await supabase
      .from('usuario')
      .select('id, nombre')
      .eq('rol', 'GROOMER')

    // Calificaciones
    const { data: calificaciones } = await supabase
      .from('calificacion')
      .select('id_groomer, estrellas')
      .gte('created_at', desde)
      .lte('created_at', hasta)

    const nombreMap = {}
    ;(usuarios ?? []).forEach(u => { nombreMap[u.id] = u.nombre })

    // Agrupar citas por groomer
    const groomerStats = {}
    ;(citas ?? []).forEach(c => {
      if (!c.id_groomer) return
      groomerStats[c.id_groomer] = groomerStats[c.id_groomer] ?? {
        id: c.id_groomer,
        nombre: nombreMap[c.id_groomer] ?? 'Sin nombre',
        total: 0, completadas: 0, canceladas: 0,
        estrellas: [], promedioEstrellas: 0,
      }
      groomerStats[c.id_groomer].total++
      if (c.estado === 'COMPLETADA') groomerStats[c.id_groomer].completadas++
      if (c.estado === 'CANCELADA')  groomerStats[c.id_groomer].canceladas++
    })

    // Agregar calificaciones
    ;(calificaciones ?? []).forEach(cal => {
      if (groomerStats[cal.id_groomer]) {
        groomerStats[cal.id_groomer].estrellas.push(cal.estrellas)
      }
    })

    const ranking = Object.values(groomerStats).map(g => ({
      ...g,
      promedioEstrellas: g.estrellas.length > 0
        ? parseFloat((g.estrellas.reduce((s, e) => s + e, 0) / g.estrellas.length).toFixed(1))
        : null,
      tasaCompletacion: g.total > 0
        ? parseFloat(((g.completadas / g.total) * 100).toFixed(1))
        : 0,
    })).sort((a, b) => b.completadas - a.completadas)

    setGroomersData({ ranking })
  }

  return { ventasData, citasData, groomersData, loading, recargar: cargarTodo }
}