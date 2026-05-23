import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function useFichaTecnica(perfil) {
  const [fichas,  setFichas]  = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFichas = async () => {
    if (!perfil) return
    setLoading(true)
    try {
      let query = supabase
        .from('ficha_tecnica')
        .select(`
          id, completada, created_at, updated_at,
          condicion_pelaje, condicion_piel, comportamiento,
          foto_antes, foto_despues, tiempo_servicio, recomendaciones,
          id_cita, id_groomer,
          cita (
            id, fecha, estado,
            mascota ( nombre, raza, tamanio, especie ),
            cita_servicio ( servicio ( nombre ) )
          ),
          groomer:usuario!ficha_tecnica_id_groomer_fkey ( nombre )
        `)
        .order('created_at', { ascending: false })

      // Groomer solo ve sus fichas
      if (perfil.rol === 'GROOMER') {
        query = query.eq('id_groomer', perfil.id)
      }

      const { data, error } = await query
      if (error) throw error
      setFichas(data ?? [])
    } catch (e) {
      console.error(e)
      toast.error('Error al cargar fichas')
    }
    setLoading(false)
  }

  // Buscar ficha existente para una cita específica
  const buscarFichaPorCita = async (idCita) => {
    const { data } = await supabase
      .from('ficha_tecnica')
      .select('*')
      .eq('id_cita', idCita)
      .maybeSingle()
    return data
  }

  // Crear o actualizar ficha
  const guardarFicha = async (datos, idFichaExistente = null) => {
    try {
      let error
      if (idFichaExistente) {
        // Actualizar
        const { error: e } = await supabase
          .from('ficha_tecnica')
          .update({ ...datos, updated_at: new Date().toISOString() })
          .eq('id', idFichaExistente)
        error = e
      } else {
        // Crear nueva
        const { error: e } = await supabase
          .from('ficha_tecnica')
          .insert(datos)
        error = e
      }

      if (error) throw error
      toast.success(datos.completada ? '✅ Ficha completada y guardada' : '💾 Ficha guardada')
      fetchFichas()
      return true
    } catch (e) {
      console.error(e)
      toast.error('Error al guardar la ficha')
      return false
    }
  }

  // Subir foto al bucket 'fichas'
  const subirFoto = async (archivo, tipo) => {
    try {
      const ext    = archivo.name.split('.').pop()
      const nombre = `${tipo}_${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('fichas')
        .upload(nombre, archivo)

      if (error) throw error

      const { data } = supabase.storage.from('fichas').getPublicUrl(nombre)
      return data.publicUrl
    } catch (e) {
      console.warn('No se pudo subir la foto:', e.message)
      toast.error('No se pudo subir la foto. Verifica que el bucket "fichas" existe en Storage.')
      return null
    }
  }

  useEffect(() => {
    if (perfil) fetchFichas()
  }, [perfil?.id])

  return { fichas, loading, guardarFicha, buscarFichaPorCita, subirFoto, fetchFichas }
}
