import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function useFacturas() {
  const [facturas, setFacturas]             = useState([])
  const [citasSinFactura, setCitasSinFactura] = useState([])
  const [loading, setLoading]               = useState(true)

  const fetchFacturas = async () => {
    setLoading(true)
    try {
      // Traer facturas con info de la cita
      const { data, error } = await supabase
        .from('factura')
        .select(`
          id, total, fecha_emision, descuento, observaciones,
          id_cita, id_cajero,
          cita (
            id, fecha, estado,
            mascota ( nombre ),
            cita_servicio (
              servicio ( nombre, precio )
            )
          )
        `)
        .order('fecha_emision', { ascending: false })

      if (error) throw error

      // Traer nombre del cajero por separado
      const cajeroIds = [...new Set(
        (data ?? []).map(f => f.id_cajero).filter(Boolean)
      )]
      let cajerosMap = {}
      if (cajeroIds.length > 0) {
        const { data: cajeros } = await supabase
          .from('usuario')
          .select('id, nombre')
          .in('id', cajeroIds)
        cajeros?.forEach(c => { cajerosMap[c.id] = c.nombre })
      }

      const facturasFinal = (data ?? []).map(f => ({
        ...f,
        cajero: { nombre: cajerosMap[f.id_cajero] ?? 'Sin nombre' }
      }))

      setFacturas(facturasFinal)

    } catch (e) {
      console.error(e)
      toast.error('Error al cargar facturas')
    }
    setLoading(false)
  }

  // Traer citas COMPLETADAS que aún no tienen factura
  const fetchCitasSinFactura = async () => {
    try {
      // IDs de citas que ya tienen factura
      const { data: conFactura } = await supabase
        .from('factura')
        .select('id_cita')

      const idsConFactura = (conFactura ?? []).map(f => f.id_cita)

      // Citas completadas
      let query = supabase
        .from('cita')
        .select(`
          id, fecha,
          mascota ( nombre ),
          cita_servicio (
            servicio ( id, nombre, precio )
          )
        `)
        .eq('estado', 'COMPLETADA')
        .order('fecha', { ascending: false })

      if (idsConFactura.length > 0) {
        query = query.not('id', 'in', `(${idsConFactura.join(',')})`)
      }

      const { data, error } = await query
      if (error) throw error
      setCitasSinFactura(data ?? [])

    } catch (e) {
      console.error(e)
    }
  }

  const emitirFactura = async (datos) => {
    try {
      const { error } = await supabase
        .from('factura')
        .insert(datos)

      if (error) throw error
      toast.success('¡Factura emitida! 🧾')
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

  return {
    facturas, citasSinFactura,
    loading, emitirFactura
  }
}