import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [perfil, setPerfil]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        cargarPerfil(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          cargarPerfil(session.user.id)
        } else {
          setPerfil(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // ── UNA SOLA función cargarPerfil ──────────────────
  async function cargarPerfil(userId) {
    try {
      const { data, error } = await supabase
        .from('usuario')
        .select('*')
        .eq('id', userId)
        .single() 

      // Debug temporal — ver qué llega
      console.log('Perfil:', data)
      console.log('Activo:', data?.activo, typeof data?.activo)

      if (error || !data) {
        // No existe el perfil → cerrar sesión
        await supabase.auth.signOut()
        setUser(null)
        setPerfil(null)

      } else if (data.activo === false || data.activo === 'false' || data.activo === 0) {
        // Usuario desactivado → cerrar sesión automáticamente
        await supabase.auth.signOut()
        setUser(null)
        setPerfil(null)
        toast.error('Tu cuenta ha sido desactivada. Contacta al administrador.')

      } else {
        // Todo correcto → cargar perfil
        setPerfil(data)
      }

    } catch (e) {
      console.error('Error al cargar perfil:', e)
      await supabase.auth.signOut()
      setUser(null)
      setPerfil(null)
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setPerfil(null)
  }

  return (
    <AuthContext.Provider value={{ user, perfil, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
