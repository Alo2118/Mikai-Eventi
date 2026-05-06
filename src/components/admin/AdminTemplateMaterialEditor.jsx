import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FormField } from '../ui/FormField'
import { INPUT_STYLE } from '../../lib/constants'
import { MATERIAL_EMPTY_FORM } from '../../lib/admin-template-utils'

export function AdminTemplateMaterialEditor({
  open, editing, materialItemsCount, saving,
  onSave, onClose, searchProducts,
}) {
  const [form, setForm] = useState(MATERIAL_EMPTY_FORM)
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState([])

  useEffect(() => {
    if (!open) return
    setProductSearch(editing?.product ? `${editing.product.nome}${editing.product.brand?.nome ? ` — ${editing.product.brand.nome}` : ''}` : '')
    setProductResults([])
    setForm(editing?.id ? {
      product_id: editing.product_id || '',
      quantita: editing.quantita ?? 1,
      note: editing.note || '',
    } : { ...MATERIAL_EMPTY_FORM })
  }, [open, editing])

  const handleSearch = async (term) => {
    setProductSearch(term)
    if (term.length < 2) { setProductResults([]); return }
    const { data } = await searchProducts(term)
    setProductResults(data)
  }

  const handleSelectProduct = (p) => {
    setForm(f => ({ ...f, product_id: p.id }))
    setProductSearch(`${p.nome}${p.brand?.nome ? ` — ${p.brand.nome}` : ''}`)
    setProductResults([])
  }

  const handleSubmit = () => {
    if (!form.product_id) return
    onSave({
      product_id: form.product_id,
      quantita: parseInt(form.quantita) || 1,
      note: form.note.trim() || null,
      ordine: editing?.id ? editing.ordine : materialItemsCount,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing?.id ? 'Modifica materiale template' : 'Aggiungi materiale template'}
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!form.product_id}>
            {editing?.id ? 'Salva' : 'Aggiungi'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="Prodotto" required>
          <div className="relative">
            <input
              className={INPUT_STYLE}
              value={productSearch}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Cerca prodotto per nome..."
            />
            {productResults.length > 0 && (
              <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {productResults.map(p => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectProduct(p)}
                      className="w-full px-4 py-3 text-left hover:bg-mikai-50 min-h-[48px] text-base"
                    >
                      <span className="font-medium">{p.nome}</span>
                      {p.brand?.nome && <span className="text-gray-500 ml-2">— {p.brand.nome}</span>}
                      {p.codice && <span className="text-gray-400 ml-2 text-sm">{p.codice}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Quantità">
            <input
              type="number"
              min="1"
              className={INPUT_STYLE}
              value={form.quantita}
              onChange={e => setForm(f => ({ ...f, quantita: e.target.value }))}
            />
          </FormField>
        </div>

        <FormField label="Note">
          <input
            className={INPUT_STYLE}
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="es. Per ogni tavolo, con strumentario"
          />
        </FormField>
      </div>
    </Modal>
  )
}
