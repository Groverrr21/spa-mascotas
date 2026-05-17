import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function usePersonal() {
  const [personal, setPersonal] = useState([])
  const [loading, setLoading]   = useState(true)

  const fetchPersonal = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('usuario')
        .select('id, nombre, email, rol, fecha_registro, activo')
        .in('rol', ['GROOMER', 'CAJERO', 'ADMINISTRADOR'])
        .order('rol')
        .order('nombre')

      if (error) throw error
      setPersonal(data ?? [])
    } catch (e) {
      toast.error('Error al cargar personal')
      console.error(e)
    }
    setLoading(false)
  }

  const crearPersonal = async ({ nombre, email, password, rol }) => {
    try {
      // 1. Guardar sesión del admin ANTES del signUp
      const { data: { session: sessionAdmin } } = await supabase.auth.getSession()

      // 2. Crear usuario en Supabase Auth
      //    Con "Confirm email" desactivado en Supabase Dashboard,
      //    no se envía ningún email y no hay rate limit.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre, rol } },
      })

      // 3. Restaurar sesión del admin inmediatamente
      if (sessionAdmin?.access_token) {
        await supabase.auth.setSession({
          access_token:  sessionAdmin.access_token,
          refresh_token: sessionAdmin.refresh_token,
        })
      }

      if (error) {
        if (error.message?.includes('already registered'))
          throw new Error('already registered')
        if (error.message?.includes('rate limit'))
          throw new Error('rate limit')
        throw error
      }

      if (!data.user) throw new Error('No se pudo crear el usuario')

      // 4. Insertar / actualizar en tabla usuario con el rol correcto
      const { error: upsertError } = await supabase
        .from('usuario')
        .upsert(
          {
            id:             data.user.id,
            nombre,
            email,
            rol,
            activo:         true,
            fecha_registro: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )

      if (upsertError) {
        console.warn('upsert usuario:', upsertError.message)
      }

      toast.success(`✅ ${rol} "${nombre}" creado correctamente`)
      await fetchPersonal()
      return true

    } catch (e) {
      console.error('crearPersonal error:', e)

      if (e.message?.includes('already registered'))
        toast.error('⚠️ Ese email ya está registrado en el sistema')
      else if (e.message?.includes('rate limit'))
        toast.error('⚠️ Límite de emails alcanzado. Desactiva "Confirm email" en Supabase Dashboard → Authentication → Providers → Email')
      else
        toast.error(`Error al crear el personal: ${e.message}`)

      return false
    }
  }

  const desactivarPersonal = async (id, nombre) => {
    try {
      const { error } = await supabase
        .from('usuario')
        .update({ activo: false })
        .eq('id', id)

      if (error) throw error
      toast.success(`${nombre} desactivado`)
      fetchPersonal()
    } catch (e) {
      console.error(e)
      toast.error('Error al desactivar')
    }
  }

  const reactivarPersonal = async (id, nombre) => {
    try {
      const { error } = await supabase
        .from('usuario')
        .update({ activo: true })
        .eq('id', id)

      if (error) throw error
      toast.success(`${nombre} reactivado`)
      fetchPersonal()
    } catch (e) {
      console.error(e)
      toast.error('Error al reactivar')
    }
  }

  useEffect(() => { fetchPersonal() }, [])

  return { personal, loading, crearPersonal, desactivarPersonal, reactivarPersonal }
}