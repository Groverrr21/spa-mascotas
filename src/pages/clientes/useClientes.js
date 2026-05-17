import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function useClientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading]   = useState(true)

  const fetchClientes = async () => {
    setLoading(true)
    try {
      // Traer todos los usuarios con rol CLIENTE
      const { data: usuarios, error } = await supabase
        .from('usuario')
        .select('id, nombre, email, fecha_registro')
        .eq('rol', 'CLIENTE')
        .order('nombre')

      if (error) throw error

      // Para cada cliente traer sus mascotas y citas
      const clientesConDatos = await Promise.all(
        (usuarios ?? []).map(async (usuario) => {

          const { data: mascotas } = await supabase
            .from('mascota')
            .select('id, nombre, raza, tamanio')
            .eq('id_cliente', usuario.id)

          const { count: totalCitas } = await supabase
            .from('cita')
            .select('id', { count: 'exact', head: true })
            .in(
              'id_mascota',
              (mascotas ?? []).map(m => m.id)
            )

          return {
            ...usuario,
            mascotas:    mascotas    ?? [],
            totalCitas:  totalCitas  ?? 0,
          }
        })
      )

      setClientes(clientesConDatos)

    } catch (error) {
      console.error('Error al cargar clientes:', error)
      toast.error('Error al cargar clientes')
    }
    setLoading(false)
  }

  useEffect(() => { fetchClientes() }, [])

  return { clientes, loading, fetchClientes }
}