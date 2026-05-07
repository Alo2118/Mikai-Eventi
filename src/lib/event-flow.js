// Helpers for the event-type / material biforcation introduced by the
// 20260507112103_event_flow_branching migration.
//
// - eventType comes from the `event_types` row matching event.tipo_evento.
//   Default behavior (when eventType is missing) is "all phases active" so
//   legacy data keeps working.
// - effectiveRientroRichiesto resolves the per-item override against the
//   catalog default (products.serializzato).

export function richiedeSpedizione(eventType) {
  return eventType?.richiede_spedizione !== false
}

export function richiedeHotel(eventType) {
  return eventType?.richiede_hotel !== false
}

export function richiedeTrasporti(eventType) {
  return eventType?.richiede_trasporti !== false
}

export function effectiveRientroRichiesto(eventMaterialRow) {
  if (eventMaterialRow?.rientro_richiesto !== null && eventMaterialRow?.rientro_richiesto !== undefined) {
    return eventMaterialRow.rientro_richiesto === true
  }
  return !!eventMaterialRow?.product?.serializzato
}

export function usaTavoli(eventType) {
  return eventType?.usa_tavoli === true
}
