import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function useCalendario() {
  const [citas, setCitas]     = useState([])
  const [groomers, setGroomers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDatos = async () => {
    setLoading(true)
    try {
      // Traer groomers con su nombre
      const { data: groomersData } = await supabase
        .from('groomer')
        .select('id, especialidad, usuario:usuario!groomer_id_fkey(id, nombre)')

      // Traer citas con toda la info
      const { data: citasData, error } = await supabase
        .from('cita')
        .select(`
          id, fecha, estado,
          id_groomer,
          mascota ( id, nombre, raza, tamanio ),
          cita_servicio (
            servicio ( id, nombre, duracion, precio )
          )
        `)
        .order('fecha')

      if (error) throw error

      setGroomers(groomersData ?? [])
      setCitas(citasData ?? [])
    } catch (e) {
      console.error(e)
      toast.error('Error al cargar el calendario')
    }
    setLoading(false)
  }

  const cambiarEstado = async (id, estado) => {
    const { error } = await supabase
      .from('cita').update({ estado }).eq('id', id)
    if (error) { toast.error('Error al actualizar'); return }
    toast.success(`Cita ${estado.toLowerCase()}`)
    fetchDatos()
  }

  const asignarGroomer = async (citaId, groomerId) => {
    const { error } = await supabase
      .from('cita').update({ id_groomer: groomerId }).eq('id', citaId)
    if (error) { toast.error('Error al asignar groomer'); return }
    toast.success('Groomer asignado')
    fetchDatos()
  }

  useEffect(() => { fetchDatos() }, [])

  return { citas, groomers, loading, cambiarEstado, asignarGroomer, fetchDatos }
}