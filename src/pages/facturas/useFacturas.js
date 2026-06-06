import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function useFacturas() {
  const [facturas,        setFacturas]        = useState([])
  const [citasSinFactura, setCitasSinFactura] = useState([])
  const [loading,         setLoading]         = useState(true)

  const fetchFacturas = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('factura')
        .select(`
          id, total, fecha_emision, descuento,
          observaciones, metodo_pago, tipo,
          id_cita, id_cajero, id_pedido,
          cita (
            id, fecha, estado,
            mascota ( nombre ),
            cita_servicio ( servicio ( nombre, precio ) )
          ),
          pedido (
            id, canal, estado, created_at,
            cliente:usuario!pedido_id_cliente_fkey ( nombre, email ),
            pedido_item (
              cantidad, precio_unitario,
              producto ( nombre, categoria )
            )
          )
        `)
        .order('fecha_emision', { ascending: false })

      if (error) throw error

      // Traer nombre del cajero
      const cajeroIds = [...new Set((data ?? []).map(f => f.id_cajero).filter(Boolean))]
      let cajerosMap = {}
      if (cajeroIds.length > 0) {
        const { data: cajeros } = await supabase
          .from('usuario').select('id, nombre').in('id', cajeroIds)
        cajeros?.forEach(c => { cajerosMap[c.id] = c.nombre })
      }

      setFacturas(
        (data ?? []).map(f => ({
          ...f,
          cajero: f.id_cajero ? { nombre: cajerosMap[f.id_cajero] ?? 'Sin nombre' } : null,
        }))
      )
    } catch (e) {
      console.error(e)
      toast.error('Error al cargar facturas')
    }
    setLoading(false)
  }

  const fetchCitasSinFactura = async () => {
    try {
      const { data: conFactura } = await supabase
        .from('factura').select('id_cita').not('id_cita', 'is', null)

      const idsConFactura = (conFactura ?? []).map(f => f.id_cita)

      let query = supabase
        .from('cita')
        .select(`
          id, fecha,
          mascota ( nombre, id_cliente ),
          cita_servicio ( servicio ( id, nombre, precio ) )
        `)
        .eq('estado', 'COMPLETADA')
        .order('fecha', { ascending: false })

      if (idsConFactura.length > 0)
        query = query.not('id', 'in', `(${idsConFactura.join(',')})`)

      const { data, error } = await query
      if (error) throw error
      setCitasSinFactura(data ?? [])
    } catch (e) {
      console.error(e)
    }
  }

  const emitirFactura = async (datos) => {
    try {
      const { error } = await supabase.from('factura').insert({
        ...datos,
        tipo:        'SERVICIO',
        metodo_pago: datos.metodo_pago ?? 'EFECTIVO',
      })
      if (error) throw error

      const metodoLabel = {
        EFECTIVO:      '💵 Efectivo',
        QR:            '📱 QR',
        TRANSFERENCIA: '🏦 Transferencia',
      }[datos.metodo_pago] ?? datos.metodo_pago

      toast.success(`¡Factura emitida! 🧾 — Cobrado por ${metodoLabel}`)
      fetchFacturas()
      fetchCitasSinFactura()
      return true
    } catch (e) {
      console.error(e)
      toast.error('Error al emitir factura')
      return false
    }
  }

  useEffect(() => {
    fetchFacturas()
    fetchCitasSinFactura()
  }, [])

  return { facturas, citasSinFactura, loading, emitirFactura }
}
