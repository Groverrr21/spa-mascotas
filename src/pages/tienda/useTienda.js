import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function useTienda() {
  const [productos, setProductos] = useState([])
  const [pedidos,   setPedidos]   = useState([])
  const [loading,   setLoading]   = useState(true)

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

  // ── Cargar pedidos del cliente ────────────────────────────────
  const fetchPedidos = async (idCliente) => {
    if (!idCliente) return
    try {
      const { data, error } = await supabase
        .from('pedido')
        .select(`
          id, total, canal, estado, notas, created_at,
          pedido_item (
            id, cantidad, precio_unitario,
            producto ( nombre )
          )
        `)
        .eq('id_cliente', idCliente)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setPedidos(data ?? [])
    } catch (e) {
      console.error(e)
    }
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
      // Borrado lógico: desactivar en vez de eliminar
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

  // ── Guardar pedido en BD ──────────────────────────────────────
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
        precio_unitario: item.precio,
      }))

      const { error: itemsError } = await supabase
        .from('pedido_item')
        .insert(itemsInsert)

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

      fetchProductos()
      fetchPedidos(idCliente)
      return pedidoData.id
    } catch (e) {
      console.error(e)
      toast.error('Error al registrar el pedido')
      return null
    }
  }

  useEffect(() => { fetchProductos() }, [])

  return {
    productos, pedidos, loading,
    fetchProductos, fetchPedidos,
    crearProducto, editarProducto, eliminarProducto,
    guardarPedido,
  }
}
