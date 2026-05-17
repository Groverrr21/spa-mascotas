import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function useInventario() {
  const [insumos,      setInsumos]      = useState([])
  const [movimientos,  setMovimientos]  = useState([])
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

  // ── Crear insumo (admin) ──────────────────────────────────────
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

  // ── Editar insumo (admin) ─────────────────────────────────────
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

  // ── Eliminar insumo (admin) ───────────────────────────────────
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
  // tipo: ENTRADA | SALIDA | MERMA | DEVOLUCION
  const registrarMovimiento = async ({ id_insumo, id_responsable, id_cita, tipo, cantidad, observacion }) => {
    try {
      const insumo = insumos.find(i => i.id === id_insumo)
      if (!insumo) throw new Error('Insumo no encontrado')

      const cant = parseFloat(cantidad)

      // Calcular nuevo stock
      let nuevoStock = parseFloat(insumo.stock)
      if (tipo === 'ENTRADA' || tipo === 'DEVOLUCION') {
        nuevoStock += cant
      } else {
        // SALIDA, MERMA → descuentan
        if (cant > nuevoStock) throw new Error('Stock insuficiente')
        nuevoStock -= cant
      }

      // Insertar movimiento
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

      // Actualizar stock
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
  }, [])

  // Insumos activos con stock bajo o en cero
  const alertasBajoStock = insumos.filter(
    i => i.activo && parseFloat(i.stock) <= parseFloat(i.stock_minimo)
  )

  // Valor total del inventario
  const valorTotal = insumos.reduce(
    (sum, i) => sum + parseFloat(i.stock) * parseFloat(i.precio_unitario), 0
  )

  return {
    insumos, movimientos, loading, loadingMov,
    alertasBajoStock, valorTotal,
    crearInsumo, editarInsumo, eliminarInsumo,
    registrarMovimiento,
  }
}
