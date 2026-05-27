import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function useInventario() {
  const [insumos,      setInsumos]      = useState([])
  const [movimientos,  setMovimientos]  = useState([])
  const [consumo7dias, setConsumo7dias] = useState({}) // { id_insumo: total_consumido }
  const [loading,      setLoading]      = useState(true)
  const [loadingMov,   setLoadingMov]   = useState(false)

  // ── Cargar insumos ────────────────────────────────────────────
  const fetchInsumos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('insumo')
        .select('*')
        .order('categoria')
        .order('nombre')

      if (error) throw error
      setInsumos(data ?? [])
    } catch (e) {
      console.error(e)
      toast.error('Error al cargar inventario')
    }
    setLoading(false)
  }

  // ── Cargar movimientos recientes ──────────────────────────────
  const fetchMovimientos = async () => {
    setLoadingMov(true)
    try {
      const { data, error } = await supabase
        .from('movimiento_insumo')
        .select(`
          id, tipo, cantidad, observacion, fecha,
          insumo   ( nombre, unidad ),
          responsable:usuario!movimiento_insumo_id_responsable_fkey ( nombre )
        `)
        .order('fecha', { ascending: false })
        .limit(60)

      if (error) throw error
      setMovimientos(data ?? [])
    } catch (e) {
      console.error(e)
    }
    setLoadingMov(false)
  }

  // ── Calcular consumo de los últimos 7 días ────────────────────
  const fetchConsumo7dias = async () => {
    try {
      const hace7dias = new Date()
      hace7dias.setDate(hace7dias.getDate() - 7)

      const { data, error } = await supabase
        .from('movimiento_insumo')
        .select('id_insumo, tipo, cantidad')
        .in('tipo', ['SALIDA', 'MERMA'])          // solo consumo real
        .gte('fecha', hace7dias.toISOString())

      if (error) throw error

      // Sumar consumo por insumo
      const mapa = {}
      ;(data ?? []).forEach(mov => {
        mapa[mov.id_insumo] = (mapa[mov.id_insumo] ?? 0) + parseFloat(mov.cantidad)
      })
      setConsumo7dias(mapa)
    } catch (e) {
      console.error('Error calculando consumo:', e)
    }
  }

  // ── CRUD insumos ──────────────────────────────────────────────
  const crearInsumo = async (datos) => {
    try {
      const { error } = await supabase.from('insumo').insert(datos)
      if (error) throw error
      toast.success('✅ Insumo creado')
      fetchInsumos()
      return true
    } catch (e) {
      toast.error('Error al crear insumo')
      return false
    }
  }

  const editarInsumo = async (id, datos) => {
    try {
      const { error } = await supabase.from('insumo').update(datos).eq('id', id)
      if (error) throw error
      toast.success('Insumo actualizado')
      fetchInsumos()
      return true
    } catch (e) {
      toast.error('Error al actualizar')
      return false
    }
  }

  const eliminarInsumo = async (id, nombre) => {
    try {
      const { error } = await supabase.from('insumo').delete().eq('id', id)
      if (error) throw error
      toast.success(`"${nombre}" eliminado`)
      fetchInsumos()
      return true
    } catch (e) {
      toast.error('Error al eliminar')
      return false
    }
  }

  // ── Registrar movimiento ──────────────────────────────────────
  const registrarMovimiento = async ({ id_insumo, id_responsable, id_cita, tipo, cantidad, observacion }) => {
    try {
      const insumo = insumos.find(i => i.id === id_insumo)
      if (!insumo) throw new Error('Insumo no encontrado')

      const cant = parseFloat(cantidad)
      let nuevoStock = parseFloat(insumo.stock)

      if (tipo === 'ENTRADA' || tipo === 'DEVOLUCION') {
        nuevoStock += cant
      } else {
        if (cant > nuevoStock) throw new Error('Stock insuficiente')
        nuevoStock -= cant
      }

      const { error: movError } = await supabase
        .from('movimiento_insumo')
        .insert({
          id_insumo,
          id_responsable: id_responsable ?? null,
          id_cita:        id_cita        ?? null,
          tipo,
          cantidad:       cant,
          observacion:    observacion    ?? null,
        })
      if (movError) throw movError

      const { error: stockError } = await supabase
        .from('insumo')
        .update({ stock: nuevoStock })
        .eq('id', id_insumo)
      if (stockError) throw stockError

      const etiqueta = {
        ENTRADA:    '📦 Entrada registrada',
        SALIDA:     '📤 Salida registrada',
        MERMA:      '⚠️ Merma registrada',
        DEVOLUCION: '↩️ Devolución registrada',
      }
      toast.success(etiqueta[tipo] ?? 'Movimiento registrado')
      await fetchInsumos()
      await fetchMovimientos()
      await fetchConsumo7dias()
      return true

    } catch (e) {
      toast.error(
        e.message === 'Stock insuficiente'
          ? '❌ Stock insuficiente para esta operación'
          : 'Error al registrar movimiento'
      )
      return false
    }
  }

  useEffect(() => {
    fetchInsumos()
    fetchMovimientos()
    fetchConsumo7dias()
  }, [])

  // ── Alertas de bajo stock ─────────────────────────────────────
  const alertasBajoStock = insumos.filter(
    i => i.activo && parseFloat(i.stock) <= parseFloat(i.stock_minimo)
  )

  // ── Alertas de consumo elevado ────────────────────────────────
  // Un insumo tiene consumo elevado si al ritmo actual de los últimos 7 días
  // se agotará en menos de 7 días
  const alertasConsumoElevado = insumos
    .filter(i => i.activo)
    .map(i => {
      const totalConsumido7d = consumo7dias[i.id] ?? 0
      if (totalConsumido7d === 0) return null           // sin consumo reciente

      const consumoDiario  = totalConsumido7d / 7       // promedio diario
      const stockActual    = parseFloat(i.stock)
      const diasRestantes  = consumoDiario > 0
        ? stockActual / consumoDiario
        : Infinity

      if (diasRestantes >= 7) return null               // suficiente para 7+ días

      return {
        ...i,
        totalConsumido7d: parseFloat(totalConsumido7d.toFixed(2)),
        consumoDiario:    parseFloat(consumoDiario.toFixed(2)),
        diasRestantes:    parseFloat(diasRestantes.toFixed(1)),
        nivel: diasRestantes <= 1 ? 'CRITICO'   // se acaba en menos de 1 día
             : diasRestantes <= 3 ? 'ALTO'       // se acaba en 1-3 días
             : 'MODERADO',                       // se acaba en 3-7 días
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.diasRestantes - b.diasRestantes) // más urgentes primero

  // ── Valor total del inventario ────────────────────────────────
  const valorTotal = insumos.reduce(
    (sum, i) => sum + parseFloat(i.stock) * parseFloat(i.precio_unitario), 0
  )

  return {
    insumos, movimientos, loading, loadingMov,
    alertasBajoStock, alertasConsumoElevado, valorTotal,
    crearInsumo, editarInsumo, eliminarInsumo,
    registrarMovimiento,
  }
}
