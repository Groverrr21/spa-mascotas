import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// ── Helpers WhatsApp ──────────────────────────────────────────
export function generarMsgRecordatorio(cita, nombreMascota) {
  const fecha = new Date(cita.fecha).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
  const hora = new Date(cita.fecha).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit'
  })
  const servicios = (cita.cita_servicio ?? [])
    .map(cs => cs.servicio?.nombre).filter(Boolean).join(', ')
  return [
    `Hola! Te recordamos tu cita en Spa Mascotas`,
    ``,
    `Fecha: ${fecha}`,
    `Hora: ${hora}`,
    `Mascota: ${nombreMascota ?? cita.mascota?.nombre ?? ''}`,
    servicios ? `Servicios: ${servicios}` : '',
    ``,
    `Te esperamos. Avísanos si necesitas cancelar o cambiar la cita.`,
    ``,
    `Spa Mascotas`,
  ].filter(l => l !== null).join('\n')
}

export function generarMsgListoRecoger(cita, nombreMascota) {
  return [
    `Hola! Tu mascota esta lista para ser recogida`,
    ``,
    `${nombreMascota ?? cita.mascota?.nombre ?? 'Tu mascota'} ya termino su sesion en Spa Mascotas.`,
    ``,
    `Puedes pasar a recogerla cuando gustes.`,
    `Te esperamos!`,
    ``,
    `Spa Mascotas`,
  ].join('\n')
}

export function abrirWhatsApp(telefono, mensaje) {
  if (!telefono) return false
  const num = telefono.replace(/\D/g, '')
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`, '_blank')
  return true
}

// ── Hook principal ────────────────────────────────────────────
export function useCitas(perfil) {
  const [citas,   setCitas]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCitas = async () => {
    if (!perfil) return
    setLoading(true)
    try {
      let query = supabase
        .from('cita')
        .select(`
          id, fecha, estado, hora_estimada_recojo,
          motivo_cancelacion, acepto_politica, created_at,
          id_mascota, id_groomer,
          mascota ( id, nombre, raza, id_cliente ),
          cita_servicio (
            id,
            servicio ( id, nombre, precio, duracion )
          )
        `)
        .order('fecha', { ascending: false })

      if (perfil.rol === 'CLIENTE') {
        const { data: mascotas } = await supabase
          .from('mascota').select('id').eq('id_cliente', perfil.id)
        const ids = (mascotas ?? []).map(m => m.id)
        if (ids.length === 0) { setCitas([]); setLoading(false); return }
        query = query.in('id_mascota', ids)
      } else if (perfil.rol === 'GROOMER') {
        query = query.eq('id_groomer', perfil.id)
      }

      const { data: citasData, error } = await query
      if (error) throw error

      // Traer teléfonos de clientes
      const clienteIds = [...new Set(
        (citasData ?? []).map(c => c.mascota?.id_cliente).filter(Boolean)
      )]
      let clientesMap = {}
      if (clienteIds.length > 0) {
        const { data: clientes } = await supabase
          .from('usuario').select('id, nombre, telefono').in('id', clienteIds)
        clientes?.forEach(c => { clientesMap[c.id] = c })
      }

      // Traer groomers
      const groomerIds = [...new Set(
        (citasData ?? []).map(c => c.id_groomer).filter(Boolean)
      )]
      let groomersMap = {}
      if (groomerIds.length > 0) {
        const { data: gData } = await supabase
          .from('usuario').select('id, nombre, telefono').in('id', groomerIds)
        gData?.forEach(g => { groomersMap[g.id] = g })
      }

      setCitas((citasData ?? []).map(cita => ({
        ...cita,
        mascota: cita.mascota ? {
          ...cita.mascota,
          cliente: clientesMap[cita.mascota.id_cliente] ?? null,
        } : null,
        groomer: cita.id_groomer
          ? { id: cita.id_groomer, ...groomersMap[cita.id_groomer] }
          : null,
      })))

    } catch (error) {
      console.error('Error al cargar citas:', error)
      toast.error('Error al cargar citas')
    }
    setLoading(false)
  }

  // ── Crear notificación in-app ─────────────────────────────────
  const notificarCliente = async (cita, tipo, mensaje) => {
    try {
      const idCliente = cita.mascota?.cliente?.id ?? cita.mascota?.id_cliente
      if (!idCliente) return
      await supabase.from('notificacion').insert({
        id_usuario: idCliente, tipo,
        titulo: {
          CITA_CONFIRMADA: 'Tu cita fue confirmada',
          CITA_COMPLETADA: 'Sesion completada',
          CITA_CANCELADA:  'Tu cita fue cancelada',
          LISTO_RECOGER:   'Tu mascota esta lista',
        }[tipo] ?? 'Notificacion de cita',
        mensaje, id_cita: cita.id, leida: false,
      })
    } catch (e) {
      console.error('Error notificando cliente:', e)
    }
  }

  // ── Crear cita ────────────────────────────────────────────────
  const crearCita = async (datosCita, serviciosIds) => {
    try {
      const { data, error } = await supabase
        .from('cita').insert(datosCita).select().single()
      if (error) throw error
      if (serviciosIds.length > 0) {
        await supabase.from('cita_servicio').insert(
          serviciosIds.map(id_servicio => ({ id_cita: data.id, id_servicio }))
        )
      }
      toast.success('Cita agendada!')
      fetchCitas()
      return true
    } catch (error) {
      console.error(error)
      toast.error('Error al crear la cita')
      return false
    }
  }

  // ── Cambiar estado + notificación automática ──────────────────
  const cambiarEstado = async (id, estado) => {
    const { error } = await supabase.from('cita').update({ estado }).eq('id', id)
    if (error) { toast.error('Error al actualizar estado'); return }

    const citaActual = citas.find(c => c.id === id)
    const nombre     = citaActual?.mascota?.nombre ?? ''
    const telefono   = citaActual?.mascota?.cliente?.telefono ?? null

    if (estado === 'CONFIRMADA') {
      toast.success('Cita confirmada')
      await notificarCliente(citaActual, 'CITA_CONFIRMADA',
        `Tu cita para ${nombre} ha sido confirmada.`)
    }

    if (estado === 'COMPLETADA') {
      // ── NOTIFICACIÓN AUTOMÁTICA completa al marcar como COMPLETADA ──
      await notificarCliente(citaActual, 'LISTO_RECOGER',
        `${nombre} ya termino su sesion y esta lista para ser recogida.`)

      // WhatsApp automático si tiene teléfono
      if (telefono) {
        const msg = generarMsgListoRecoger(citaActual, nombre)
        abrirWhatsApp(telefono, msg)
        toast.success(
          `Cita completada - Notificando a ${citaActual.mascota?.cliente?.nombre ?? 'el cliente'} por WhatsApp`,
          { duration: 4000, icon: '🐾' }
        )
      } else {
        toast.success('Cita completada - Notificacion in-app enviada', { icon: '🐾' })
      }
    }

    if (estado === 'CANCELADA') {
      toast.success('Cita cancelada')
      await notificarCliente(citaActual, 'CITA_CANCELADA',
        `Tu cita para ${nombre} ha sido cancelada.`)
    }

    fetchCitas()
  }

  // ── Avisar "Listo para recoger" manual (botón secundario) ─────
  const avisarListoRecoger = async (cita) => {
    const nombre   = cita.mascota?.nombre ?? ''
    const telefono = cita.mascota?.cliente?.telefono ?? null

    await notificarCliente(cita, 'LISTO_RECOGER',
      `${nombre} ya termino su sesion y esta lista para ser recogida.`)

    const msg = generarMsgListoRecoger(cita, nombre)
    const ok  = abrirWhatsApp(telefono, msg)
    if (ok) toast.success('Notificacion enviada')
    else    toast.success('Notificacion in-app enviada')
  }

  // ── Recordatorio WhatsApp ─────────────────────────────────────
  const enviarRecordatorio = (cita) => {
    const telefono = cita.mascota?.cliente?.telefono ?? null
    const msg = generarMsgRecordatorio(cita, cita.mascota?.nombre ?? '')
    if (!abrirWhatsApp(telefono, msg))
      toast.error('El cliente no tiene telefono registrado')
  }

  // ── Cancelar cita ─────────────────────────────────────────────
  const cancelarCita = async (id, motivo) => {
    try {
      const { error } = await supabase.from('cita').update({
        estado: 'CANCELADA', motivo_cancelacion: motivo, acepto_politica: true,
      }).eq('id', id)
      if (error) throw error
      const citaActual = citas.find(c => c.id === id)
      if (citaActual) {
        await notificarCliente(citaActual, 'CITA_CANCELADA',
          `Tu cita para ${citaActual.mascota?.nombre ?? ''} fue cancelada. Motivo: ${motivo}`)
      }
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
    const { error } = await supabase.from('cita').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Cita eliminada')
    fetchCitas()
  }

  useEffect(() => {
    if (perfil) fetchCitas()
  }, [perfil?.id])

  return {
    citas, loading,
    crearCita, cambiarEstado, cancelarCita,
    eliminarCita, avisarListoRecoger, enviarRecordatorio,
  }
}
