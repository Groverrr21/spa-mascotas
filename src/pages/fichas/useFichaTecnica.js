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
          foto_antes, foto_despues, tiempo_servicio,
          recomendaciones, checklist, insumos_usados,
          id_cita, id_groomer,
          cita (
            id, fecha, estado,
            mascota ( nombre, raza, tamanio, especie ),
            cita_servicio ( servicio ( nombre ) )
          ),
          groomer:usuario!ficha_tecnica_id_groomer_fkey ( nombre )
        `)
        .order('created_at', { ascending: false })

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

  const buscarFichaPorCita = async (idCita) => {
    const { data } = await supabase
      .from('ficha_tecnica')
      .select('*')
      .eq('id_cita', idCita)
      .maybeSingle()
    return data
  }

  // ── Registrar movimientos de insumos automáticamente ─────────
  const registrarMovimientosAuto = async (idCita, idGroomer, insumosUsados) => {
    if (!insumosUsados || insumosUsados.length === 0) return

    let errores = 0
    for (const item of insumosUsados) {
      if (!item.id_insumo || parseFloat(item.cantidad) <= 0) continue
      try {
        // 1. Insertar movimiento vinculado a la cita
        const { error: movError } = await supabase
          .from('movimiento_insumo')
          .insert({
            id_insumo:      item.id_insumo,
            id_responsable: idGroomer ?? null,
            id_cita:        idCita,
            tipo:           'SALIDA',
            cantidad:       parseFloat(item.cantidad),
            observacion:    'Registro automático al cerrar ficha técnica',
          })
        if (movError) throw movError

        // 2. Descontar del stock
        const { data: insumoData } = await supabase
          .from('insumo')
          .select('stock')
          .eq('id', item.id_insumo)
          .single()

        if (insumoData) {
          const nuevoStock = Math.max(0, parseFloat(insumoData.stock) - parseFloat(item.cantidad))
          await supabase
            .from('insumo')
            .update({ stock: nuevoStock })
            .eq('id', item.id_insumo)
        }
      } catch (e) {
        console.error(`Error registrando movimiento para insumo ${item.nombre}:`, e)
        errores++
      }
    }

    if (errores === 0) {
      toast.success(`📦 ${insumosUsados.length} insumo${insumosUsados.length > 1 ? 's' : ''} descontado${insumosUsados.length > 1 ? 's' : ''} del inventario`)
    } else {
      toast.error(`⚠️ ${errores} insumo(s) no se pudieron descontar del inventario`)
    }
  }

  // ── Guardar / actualizar ficha ────────────────────────────────
  const guardarFicha = async (datos, idFichaExistente = null) => {
    try {
      const estabaCompletada = idFichaExistente
        ? (await supabase.from('ficha_tecnica').select('completada').eq('id', idFichaExistente).single()).data?.completada
        : false

      let error
      if (idFichaExistente) {
        const { error: e } = await supabase
          .from('ficha_tecnica')
          .update({ ...datos, updated_at: new Date().toISOString() })
          .eq('id', idFichaExistente)
        error = e
      } else {
        const { error: e } = await supabase
          .from('ficha_tecnica')
          .insert(datos)
        error = e
      }
      if (error) throw error

      // ── Auto-descuento de inventario al COMPLETAR (solo una vez) ──
      if (datos.completada && !estabaCompletada) {
        const insumosUsados = datos.insumos_usados ?? []
        if (insumosUsados.length > 0) {
          await registrarMovimientosAuto(datos.id_cita, datos.id_groomer, insumosUsados)
        }
      }

      toast.success(datos.completada ? '✅ Ficha completada — inventario actualizado' : '💾 Borrador guardado')
      fetchFichas()
      return true
    } catch (e) {
      console.error(e)
      toast.error('Error al guardar la ficha')
      return false
    }
  }

  // ── Subir foto ────────────────────────────────────────────────
  const subirFoto = async (archivo, tipo) => {
    try {
      const ext    = archivo.name.split('.').pop()
      const nombre = `${tipo}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('fichas').upload(nombre, archivo)
      if (error) throw error
      const { data } = supabase.storage.from('fichas').getPublicUrl(nombre)
      return data.publicUrl
    } catch (e) {
      console.warn('No se pudo subir la foto:', e.message)
      toast.error('No se pudo subir la foto. Verifica el bucket "fichas" en Storage.')
      return null
    }
  }

  useEffect(() => {
    if (perfil) fetchFichas()
  }, [perfil?.id])

  return { fichas, loading, guardarFicha, buscarFichaPorCita, subirFoto, fetchFichas }
}
