import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// ── Tipos de notificación ─────────────────────────────────────
export const TIPOS_NOTI = {
  CITA_CONFIRMADA:   { icono: '✅', color: '#2e7d32', titulo: 'Cita confirmada'       },
  CITA_COMPLETADA:   { icono: '🏆', color: '#1565c0', titulo: 'Cita completada'       },
  CITA_CANCELADA:    { icono: '❌', color: '#c62828', titulo: 'Cita cancelada'         },
  RECORDATORIO_CITA: { icono: '⏰', color: '#e65100', titulo: 'Recordatorio de cita'  },
  LISTO_RECOGER:     { icono: '🐾', color: '#6a1b9a', titulo: 'Mascota lista'          },
  PEDIDO_CONFIRMADO: { icono: '📦', color: '#1565c0', titulo: 'Pedido confirmado'      },
  PEDIDO_ENTREGADO:  { icono: '🎉', color: '#2e7d32', titulo: 'Pedido entregado'       },
  PEDIDO_CANCELADO:  { icono: '🚫', color: '#c62828', titulo: 'Pedido cancelado'       },
  SISTEMA:           { icono: '🔔', color: '#6c63ff', titulo: 'Notificación'           },
}

export function useNotificaciones(perfil) {
  const [notificaciones, setNotificaciones] = useState([])
  const [loading, setLoading] = useState(false)

  const noLeidas = notificaciones.filter(n => !n.leida).length

  // ── Cargar notificaciones del usuario ─────────────────────────
  const fetchNotificaciones = useCallback(async () => {
    if (!perfil?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notificacion')
        .select('*')
        .eq('id_usuario', perfil.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setNotificaciones(data ?? [])
    } catch (e) {
      console.error('Error cargando notificaciones:', e)
    }
    setLoading(false)
  }, [perfil?.id])

  // ── Marcar una como leída ─────────────────────────────────────
  const marcarLeida = async (id) => {
    await supabase.from('notificacion').update({ leida: true }).eq('id', id)
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }

  // ── Marcar todas como leídas ──────────────────────────────────
  const marcarTodasLeidas = async () => {
    if (!perfil?.id) return
    await supabase
      .from('notificacion')
      .update({ leida: true })
      .eq('id_usuario', perfil.id)
      .eq('leida', false)
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
  }

  // ── Crear notificación ────────────────────────────────────────
  const crearNotificacion = async ({ idUsuario, tipo, titulo, mensaje, idCita = null, idPedido = null }) => {
    try {
      const { error } = await supabase.from('notificacion').insert({
        id_usuario: idUsuario,
        tipo,
        titulo:     titulo ?? TIPOS_NOTI[tipo]?.titulo ?? 'Notificación',
        mensaje,
        id_cita:    idCita,
        id_pedido:  idPedido,
        leida:      false,
      })
      if (error) throw error
      // Refrescar si es para el usuario actual
      if (idUsuario === perfil?.id) fetchNotificaciones()
    } catch (e) {
      console.error('Error creando notificación:', e)
    }
  }

  // ── Suscripción en tiempo real ────────────────────────────────
  useEffect(() => {
    if (!perfil?.id) return
    fetchNotificaciones()

    const channel = supabase
      .channel(`notificaciones_${perfil.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notificacion',
          filter: `id_usuario=eq.${perfil.id}`,
        },
        (payload) => {
          setNotificaciones(prev => [payload.new, ...prev])
          // Toast de nueva notificación
          const cfg = TIPOS_NOTI[payload.new.tipo] ?? TIPOS_NOTI.SISTEMA
          toast(`${cfg.icono} ${payload.new.titulo}`, {
            duration: 4000,
            style: { background: '#1a1a2e', color: '#fff', fontWeight: 600 },
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [perfil?.id, fetchNotificaciones])

  return {
    notificaciones, noLeidas, loading,
    fetchNotificaciones, marcarLeida,
    marcarTodasLeidas, crearNotificacion,
  }
}
