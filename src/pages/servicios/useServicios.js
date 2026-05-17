import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function useServicios() {
  const [servicios, setServicios] = useState([])
  const [loading, setLoading]     = useState(true)

  const fetchServicios = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('servicio')
      .select('*')
      .order('nombre')

    if (error) toast.error('Error al cargar servicios')
    else setServicios(data ?? [])
    setLoading(false)
  }

  const crearServicio = async (datos) => {
    const { error } = await supabase
      .from('servicio')
      .insert(datos)

    if (error) { toast.error('Error al crear servicio'); return false }
    toast.success('¡Servicio creado!')
    fetchServicios()
    return true
  }

  const editarServicio = async (id, datos) => {
    const { error } = await supabase
      .from('servicio')
      .update(datos)
      .eq('id', id)

    if (error) { toast.error('Error al actualizar'); return false }
    toast.success('Servicio actualizado')
    fetchServicios()
    return true
  }

  const eliminarServicio = async (id) => {
    const { error } = await supabase
      .from('servicio')
      .delete()
      .eq('id', id)

    if (error) { toast.error('Error al eliminar'); return false }
    toast.success('Servicio eliminado')
    fetchServicios()
    return true
  }

  useEffect(() => { fetchServicios() }, [])

  return { servicios, loading, crearServicio, editarServicio, eliminarServicio }
}