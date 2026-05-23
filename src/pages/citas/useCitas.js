import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function useCitas(perfil) {
  const [citas, setCitas]     = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCitas = async () => {
    if (!perfil) return
    setLoading(true)

    try {
      let query = supabase
        .from('cita')
        .select(`
          id, fecha, estado, hora_estimada_recojo, motivo_cancelacion, created_at,
          id_mascota, id_groomer,
          mascota ( id, nombre, raza ),
          cita_servicio (
            id,
            servicio ( id, nombre, precio, duracion )
          )
        `)
        .order('fecha', { ascending: false })

      if (perfil.rol === 'CLIENTE') {
        const { data: mascotas } = await supabase
          .from('mascota')
          .select('id')
          .eq('id_cliente', perfil.id)

        const ids = (mascotas ?? []).map(m => m.id)
        if (ids.length === 0) { setCitas([]); setLoading(false); return }
        query = query.in('id_mascota', ids)

      } else if (perfil.rol === 'GROOMER') {
        query = query.eq('id_groomer', perfil.id)
      }

      const { data: citasData, error } = await query
      if (error) throw error

      // Traer nombres de groomers por separado
      const groomerIds = [...new Set(
        (citasData ?? []).map(c => c.id_groomer).filter(Boolean)
      )]

      let groomersMap = {}
      if (groomerIds.length > 0) {
        const { data: groomersData } = await supabase
          .from('usuario')
          .select('id, nombre')
          .in('id', groomerIds)
        groomersData?.forEach(g => { groomersMap[g.id] = g.nombre })
      }

      const citasCompletas = (citasData ?? []).map(cita => ({
        ...cita,
        groomer: cita.id_groomer
          ? { id: cita.id_groomer, nombre: groomersMap[cita.id_groomer] ?? 'Sin nombre' }
          : null
      }))

      setCitas(citasCompletas)

    } catch (error) {
      console.error('Error al cargar citas:', error)
      toast.error('Error al cargar citas')
    }

    setLoading(false)
  }

  const crearCita = async (datosCita, serviciosIds) => {
    try {
      const { data, error } = await supabase
        .from('cita')
        .insert(datosCita)
        .select()
        .single()

      if (error) throw error

      if (serviciosIds.length > 0) {
        const relaciones = serviciosIds.map(id_servicio => ({
          id_cita: data.id,
          id_servicio
        }))
        await supabase.from('cita_servicio').insert(relaciones)
      }

      toast.success('¡Cita agendada! 📅')
      fetchCitas()
      return true

    } catch (error) {
      console.error('Error al crear cita:', error)
      toast.error('Error al crear la cita')
      return false
    }
  }

  const cambiarEstado = async (id, estado) => {
    const { error } = await supabase
      .from('cita')
      .update({ estado })
      .eq('id', id)

    if (error) { toast.error('Error al actualizar estado'); return }
    toast.success(`Cita ${estado.toLowerCase()}`)
    fetchCitas()
  }

  // ── CANCELAR con motivo y política ───────────────────────────
  const cancelarCita = async (id, motivo) => {
    try {
      const { error } = await supabase
        .from('cita')
        .update({
          estado:             'CANCELADA',
          motivo_cancelacion: motivo,
          acepto_politica:    true,
        })
        .eq('id', id)

      if (error) throw error
      toast.success('Cita cancelada')
      fetchCitas()
      return true
    } catch (e) {
      console.error(e)
      toast.error('Error al cancelar la cita')
      return false
    }
  }

  const eliminarCita = async (id) => {
    const { error } = await supabase
      .from('cita')
      .delete()
      .eq('id', id)

    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Cita eliminada')
    fetchCitas()
  }

  useEffect(() => {
    if (perfil) fetchCitas()
  }, [perfil?.id])

  return { citas, loading, crearCita, cambiarEstado, cancelarCita, eliminarCita }
}