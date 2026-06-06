import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function useTienda(perfil) {
  const [productos,  setProductos]  = useState([])
  const [pedidos,    setPedidos]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [loadingPed, setLoadingPed] = useState(false)

  // ── Cargar productos activos ──────────────────────────────────
  const fetchProductos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('producto')
        .select('*')
        .eq('activo', true)
        .order('categoria')
        .order('nombre')
      if (error) throw error
      setProductos(data ?? [])
    } catch (e) {
      console.error(e)
      toast.error('Error al cargar productos')
    }
    setLoading(false)
  }

  // ── Cargar historial de pedidos ───────────────────────────────
  // Admin ve todos; cliente solo los suyos
  const fetchPedidos = async () => {
    if (!perfil) return
    setLoadingPed(true)
    try {
      let query = supabase
        .from('pedido')
        .select(`
          id, total, canal, estado, notas, created_at,
          cliente:usuario!pedido_id_cliente_fkey ( id, nombre, email ),
          pedido_item (
            id, cantidad, precio_unitario,
            producto ( id, nombre, categoria )
          )
        `)
        .order('created_at', { ascending: false })

      if (perfil.rol === 'CLIENTE') {
        query = query.eq('id_cliente', perfil.id)
      }

      const { data, error } = await query
      if (error) throw error
      setPedidos(data ?? [])
    } catch (e) {
      console.error(e)
      toast.error('Error al cargar historial')
    }
    setLoadingPed(false)
  }

  // ── CRUD productos (admin) ────────────────────────────────────
  const crearProducto = async (datos) => {
    try {
      const { error } = await supabase.from('producto').insert(datos)
      if (error) throw error
      toast.success('✅ Producto creado')
      fetchProductos()
      return true
    } catch (e) {
      toast.error('Error al crear producto')
      return false
    }
  }

  const editarProducto = async (id, datos) => {
    try {
      const { error } = await supabase.from('producto').update(datos).eq('id', id)
      if (error) throw error
      toast.success('Producto actualizado')
      fetchProductos()
      return true
    } catch (e) {
      toast.error('Error al actualizar')
      return false
    }
  }

  const eliminarProducto = async (id, nombre) => {
    try {
      const { error } = await supabase
        .from('producto').update({ activo: false }).eq('id', id)
      if (error) throw error
      toast.success(`"${nombre}" eliminado`)
      fetchProductos()
      return true
    } catch (e) {
      toast.error('Error al eliminar')
      return false
    }
  }

  // ── Cambiar estado de un pedido (admin) ───────────────────────
  const cambiarEstadoPedido = async (id, estado) => {
    try {
      const { error } = await supabase
        .from('pedido').update({ estado }).eq('id', id)
      if (error) throw error
      const labels = {
        CONFIRMADO: '✅ Pedido confirmado',
        ENTREGADO:  '📦 Pedido entregado',
        CANCELADO:  '❌ Pedido cancelado',
        PENDIENTE:  '⏳ Pedido pendiente',
      }
      toast.success(labels[estado] ?? 'Estado actualizado')
      fetchPedidos()
    } catch (e) {
      toast.error('Error al cambiar estado')
    }
  }

  // ── Guardar pedido + descontar stock + generar factura ────────
  const guardarPedido = async ({ idCliente, items, total, canal, notas }) => {
    try {
      // 1. Crear el pedido
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedido')
        .insert({ id_cliente: idCliente, total, canal, notas, estado: 'PENDIENTE' })
        .select()
        .single()
      if (pedidoError) throw pedidoError

      // 2. Insertar los items
      const itemsInsert = items.map(item => ({
        id_pedido:       pedidoData.id,
        id_producto:     item.id,
        cantidad:        item.cantidad,
        precio_unitario: parseFloat(item.precio),
      }))
      const { error: itemsError } = await supabase
        .from('pedido_item').insert(itemsInsert)
      if (itemsError) throw itemsError

      // 3. Descontar stock de cada producto
      for (const item of items) {
        const { data: prod } = await supabase
          .from('producto').select('stock').eq('id', item.id).single()
        if (prod) {
          const nuevoStock = Math.max(0, prod.stock - item.cantidad)
          await supabase.from('producto').update({ stock: nuevoStock }).eq('id', item.id)
        }
      }

      // 4. Generar factura automática (Opción B)
      const { error: facturaError } = await supabase
        .from('factura')
        .insert({
          id_pedido:     pedidoData.id,
          id_cita:       null,
          id_cajero:     null,
          total:         parseFloat(total),
          descuento:     0,
          tipo:          'TIENDA',
          metodo_pago:   canal === 'WHATSAPP' ? 'EFECTIVO' : 'TRANSFERENCIA',
          observaciones: `Pedido realizado por ${canal}`,
          fecha_emision: new Date().toISOString(),
        })
      if (facturaError) {
        console.warn('Factura no generada:', facturaError.message)
      } else {
        toast.success('🧾 Factura generada automáticamente')
      }

      await fetchProductos()
      await fetchPedidos()
      return pedidoData.id

    } catch (e) {
      console.error(e)
      toast.error('Error al registrar el pedido')
      return null
    }
  }

  useEffect(() => {
    fetchProductos()
  }, [])

  useEffect(() => {
    if (perfil) fetchPedidos()
  }, [perfil?.id])

  return {
    productos, pedidos, loading, loadingPed,
    fetchProductos, fetchPedidos,
    crearProducto, editarProducto, eliminarProducto,
    cambiarEstadoPedido, guardarPedido,
  }
}
