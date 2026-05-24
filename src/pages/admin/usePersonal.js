import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function usePersonal() {
  const [personal, setPersonal] = useState([])
  const [loading, setLoading]   = useState(true)

  const fetchPersonal = async () => {
    setLoading(true)
    try {
      // 1. Traer usuarios del staff
      const { data: usuarios, error } = await supabase
        .from('usuario')
        .select('id, nombre, email, rol, fecha_registro, activo')
        .in('rol', ['GROOMER', 'CAJERO', 'ADMINISTRADOR'])
        .order('rol')
        .order('nombre')

      if (error) throw error

      // 2. Traer turnos de groomer y cajero por separado
      const groomerIds = (usuarios ?? []).filter(u => u.rol === 'GROOMER').map(u => u.id)
      const cajeroIds  = (usuarios ?? []).filter(u => u.rol === 'CAJERO').map(u => u.id)

      const turnoMap = {}

      if (groomerIds.length > 0) {
        const { data } = await supabase
          .from('groomer')
          .select('id, turno')
          .in('id', groomerIds)
        data?.forEach(g => { turnoMap[g.id] = g.turno })
      }

      if (cajeroIds.length > 0) {
        const { data } = await supabase
          .from('cajero')
          .select('id, turno')
          .in('id', cajeroIds)
        data?.forEach(c => { turnoMap[c.id] = c.turno })
      }

      // 3. Combinar
      const personalConTurno = (usuarios ?? []).map(u => ({
        ...u,
        turno: turnoMap[u.id] ?? null,
      }))

      setPersonal(personalConTurno)
    } catch (e) {
      toast.error('Error al cargar personal')
      console.error(e)
    }
    setLoading(false)
  }

  // ── Crear personal ────────────────────────────────────────────
  const crearPersonal = async ({ nombre, email, password, rol, turno }) => {
    try {
      // 1. Guardar sesión del admin
      const { data: { session: sessionAdmin } } = await supabase.auth.getSession()

      // 2. Crear en Auth
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { nombre, rol } },
      })

      // 3. Restaurar sesión del admin
      if (sessionAdmin?.access_token) {
        await supabase.auth.setSession({
          access_token:  sessionAdmin.access_token,
          refresh_token: sessionAdmin.refresh_token,
        })
      }

      if (error) {
        if (error.message?.includes('already registered')) throw new Error('already registered')
        if (error.message?.includes('rate limit'))         throw new Error('rate limit')
        throw error
      }
      if (!data.user) throw new Error('No se pudo crear el usuario')

      // 4. Upsert en usuario
      const { error: upsertError } = await supabase
        .from('usuario')
        .upsert(
          { id: data.user.id, nombre, email, rol, activo: true, fecha_registro: new Date().toISOString() },
          { onConflict: 'id' }
        )
      if (upsertError) console.warn('upsert usuario:', upsertError.message)

      // 5. Asignar turno en la tabla del rol correspondiente
      if (rol === 'GROOMER' && turno) {
        const { error: tError } = await supabase
          .from('groomer')
          .upsert({ id: data.user.id, turno }, { onConflict: 'id' })
        if (tError) console.warn('upsert groomer turno:', tError.message)
      }
      if (rol === 'CAJERO' && turno) {
        const { error: tError } = await supabase
          .from('cajero')
          .upsert({ id: data.user.id, turno }, { onConflict: 'id' })
        if (tError) console.warn('upsert cajero turno:', tError.message)
      }

      toast.success(`✅ ${rol} "${nombre}" creado — Turno ${turno ?? 'sin asignar'}`)
      await fetchPersonal()
      return true

    } catch (e) {
      console.error('crearPersonal error:', e)
      if (e.message?.includes('already registered'))
        toast.error('⚠️ Ese email ya está registrado')
      else if (e.message?.includes('rate limit'))
        toast.error('⚠️ Límite de emails. Desactiva "Confirm email" en Supabase.')
      else
        toast.error(`Error al crear el personal: ${e.message}`)
      return false
    }
  }

  // ── Cambiar turno (groomer o cajero) ─────────────────────────
  const cambiarTurno = async (id, rol, nuevoTurno) => {
    try {
      const tabla = rol === 'GROOMER' ? 'groomer' : 'cajero'
      const { error } = await supabase
        .from(tabla)
        .update({ turno: nuevoTurno })
        .eq('id', id)

      if (error) throw error
      toast.success(`Turno actualizado: ${nuevoTurno === 'MAÑANA' ? '☀️ Mañana' : '🌙 Tarde'}`)
      fetchPersonal()
    } catch (e) {
      console.error(e)
      toast.error('Error al cambiar el turno')
    }
  }

  // ── Desactivar / Reactivar ────────────────────────────────────
  const desactivarPersonal = async (id, nombre) => {
    try {
      const { error } = await supabase
        .from('usuario').update({ activo: false }).eq('id', id)
      if (error) throw error
      toast.success(`${nombre} desactivado`)
      fetchPersonal()
    } catch (e) { toast.error('Error al desactivar') }
  }

  const reactivarPersonal = async (id, nombre) => {
    try {
      const { error } = await supabase
        .from('usuario').update({ activo: true }).eq('id', id)
      if (error) throw error
      toast.success(`${nombre} reactivado`)
      fetchPersonal()
    } catch (e) { toast.error('Error al reactivar') }
  }

  useEffect(() => { fetchPersonal() }, [])

  return {
    personal, loading,
    crearPersonal, cambiarTurno,
    desactivarPersonal, reactivarPersonal,
  }
}
