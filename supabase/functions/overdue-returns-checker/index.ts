import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const todayStr = new Date().toISOString().slice(0, 10)
    let notificationsCreated = 0

    // 1. Query overdue movements: outbound shipments with past return dates
    const { data: movements } = await supabase
      .from('material_movements')
      .select(
        '*, material:materials!material_movements_material_id_fkey(id, nome, posizione_attuale)'
      )
      .eq('tipo', 'uscita')
      .lt('data_rientro_prevista', todayStr)

    // Filter: only materials not yet back in warehouse
    const overdue = (movements || []).filter(
      (m: Record<string, unknown>) => {
        const material = m.material as { posizione_attuale: string } | null
        return material && material.posizione_attuale !== 'in_magazzino'
      }
    )

    // 2. Create notifications for each overdue return
    for (const movement of overdue) {
      const gruppo = `rientro_scaduto_${movement.id}_${todayStr}`
      const material = movement.material as { id: string; nome: string }

      // Dedup check
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('gruppo', gruppo)
      if (count && count > 0) continue

      const notificationBase = {
        tipo: 'rientro_scaduto' as const,
        titolo: `Rientro scaduto: ${material.nome}`,
        messaggio: `Rientro previsto il ${movement.data_rientro_prevista}. Il materiale non risulta ancora in magazzino.`,
        link: `/materiale/${material.id}`,
        link_label: 'Vai al materiale',
        entity_type: 'material',
        entity_id: material.id,
        gruppo,
      }

      // Notify responsabile_id from movement
      if (movement.responsabile_id) {
        await supabase.from('notifications').insert({
          ...notificationBase,
          user_id: movement.responsabile_id,
        })
        notificationsCreated++
      }

      // Notify all users with gestione_magazzino permission
      const { data: warehouseUsers } = await supabase
        .from('user_permissions')
        .select('user_id')
        .eq('permission', 'gestione_magazzino')

      for (const u of (warehouseUsers || [])) {
        // Skip if already notified as responsabile
        if (u.user_id === movement.responsabile_id) continue

        await supabase.from('notifications').insert({
          ...notificationBase,
          user_id: u.user_id,
        })
        notificationsCreated++
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        checked: overdue.length,
        notificationsCreated,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
