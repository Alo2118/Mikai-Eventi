// Shared mapping from Postgres error codes raised by the stock RPCs
// (adjust_product_stock / adjust_product_stock_location) to human Italian
// messages. Used by both useMaterials.js and useAdmin.js so the wording
// stays in one place — never duplicate this logic in a store.
export function friendlyStockError(error) {
  if (error?.code === '23514') {
    // check_violation — concurrent confirmation already dropped stock below zero.
    return 'Stock insufficiente: qualcun altro ha appena confermato questo materiale. Ricarica e riprova.'
  }
  if (error?.code === '23505') {
    // unique_violation — two concurrent inserts on the same new stock location.
    return 'Operazione in conflitto con un\'altra in corso. Ricarica e riprova.'
  }
  return error?.message || 'Errore aggiornamento stock. Riprova.'
}
