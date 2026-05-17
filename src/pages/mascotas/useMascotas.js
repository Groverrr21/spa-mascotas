import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function useMascotas(idCliente) {
  const [mascotas, setMascotas] = useState([])
  const [loading, setLoading]   = useState(true)

  // ── CARGAR mascotas ──────────────────────────
  const fetchMascotas = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('mascota')
      .select('*')
      .eq('id_cliente', idCliente)
      .order('nombre')

    if (error) toast.error('Error al cargar mascotas')
    else setMascotas(data ?? [])
    setLoading(false)
  }

  // ── CREAR mascota ────────────────────────────
  const crearMascota = async (datos) => {
    const { error } = await supabase
      .from('mascota')
      .insert({ ...datos, id_cliente: idCliente })

    if (error) { toast.error('Error al crear mascota'); return false }
    toast.success('¡Mascota registrada! 🐾')
    fetchMascotas()
    return true
  }

  // ── EDITAR mascota ───────────────────────────
  const editarMascota = async (id, datos) => {
    const { error } = await supabase
      .from('mascota')
      .update(datos)
      .eq('id', id)

    if (error) { toast.error('Error al actualizar'); return false }
    toast.success('Mascota actualizada')
    fetchMascotas()
    return true
  }

  // ── ELIMINAR mascota ─────────────────────────
  const eliminarMascota = async (id) => {
    const { error } = await supabase
      .from('mascota')
      .delete()
      .eq('id', id)

    if (error) { toast.error('Error al eliminar'); return false }
    toast.success('Mascota eliminada')
    fetchMascotas()
    return true
  }

  useEffect(() => {
    if (idCliente) fetchMascotas()
  }, [idCliente])

  return { mascotas, loading, crearMascota, editarMascota, eliminarMascota }
}