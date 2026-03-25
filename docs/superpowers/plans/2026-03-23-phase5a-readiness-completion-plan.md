# Phase 5A — Readiness Engine Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the 4 remaining pieces of the Readiness Engine: auto-verifications, template admin, inline approve/reject on strategic dashboard, and visual semaphore indicators.

**Architecture:** All DB schema is already in place (event_activities, template_items with tipo_verifica/verifica_automatica fields, magazzini). The work is 100% frontend: new store actions, new admin page, and UI enhancements to existing components. Pattern references: Asana portfolio RAG dots, Monday.com inline approval, Linear grey-state.

**Tech Stack:** React 19, Zustand 5, Supabase 2, TailwindCSS v4, lucide-react, date-fns (it locale)

**Existing files (read before any modification):**
- `src/hooks/useActivities.js` — 204 lines, 11 actions, 3 scoped state views
- `src/hooks/useEvents.js` — 153 lines, approveEvent/rejectEvent/advanceEventState
- `src/pages/dashboard/DashboardStrategica.jsx` — 200 lines, 3 widgets
- `src/components/eventi/EventPreparazioneTab.jsx` — 185 lines, convergence dashboard
- `src/components/eventi/ActivityCard.jsx` — 142 lines, per-activity rendering
- `src/pages/admin/AdminSottoAttivita.jsx` — 104 lines (pattern to follow for admin CRUD)
- `src/components/ui/AdminTable.jsx` — 100 lines, reusable admin table
- `src/lib/constants.js` — all enums
- `src/lib/icons.js` — centralized icon registry

---

## Task 1: Auto-Verification Engine (useActivities store)

**Files:**
- Modify: `src/hooks/useActivities.js`
- Modify: `src/lib/constants.js`

Adds a `runAutoVerifications(eventId)` action that evaluates 6 automatic checks against live data and marks matching activities as `completata`.

- [ ] **Step 1: Add VERIFICATION_FUNCTIONS constant**

In `src/lib/constants.js`, add after `CATEGORIA_ATTIVITA_COLORE`:

```js
export const VERIFICATION_FUNCTIONS = {
  lista_materiale_compilata: 'Lista materiale compilata',
  materiale_tutto_confermato: 'Materiale tutto confermato',
  indirizzo_spedizione_specificato: 'Indirizzo spedizione specificato',
  titolo_orario_definitivi: 'Titolo e orario definitivi',
  materiale_tutto_preparato: 'Materiale tutto preparato',
  materiale_tutto_spedito: 'Materiale tutto spedito',
}
```

- [ ] **Step 2: Add auto-verification icon to icons.js**

In `src/lib/icons.js`, add `ShieldCheck` to the lucide-react import and add to `ATTIVITA_STATO_ICONS`:

```js
// In lucide-react import, add: ShieldCheck
// Add to ATTIVITA_STATO_ICONS:
auto_verificata: ShieldCheck,
```

- [ ] **Step 3: Add runAutoVerifications action to useActivities store**

In `src/hooks/useActivities.js`, add this action after `addCustomActivity`:

```js
runAutoVerifications: async (eventId) => {
  // 1. Fetch auto-verifiable activities for this event
  const { data: autoActivities } = await supabase
    .from('event_activities')
    .select('id, verifica_automatica, stato')
    .eq('event_id', eventId)
    .eq('tipo_verifica', 'automatica')
    .in('stato', ['da_fare', 'in_corso'])

  if (!autoActivities?.length) return { verified: 0 }

  // 2. Fetch event data for checks
  const { data: event } = await supabase
    .from('events')
    .select('titolo, data_inizio, data_fine, indirizzo_spedizione')
    .eq('id', eventId)
    .single()

  // 3. Fetch material data for checks
  const { data: materials } = await supabase
    .from('event_materials')
    .select('id, stato')
    .eq('event_id', eventId)

  const { data: movements } = await supabase
    .from('material_movements')
    .select('id, material_id, tipo')
    .in('material_id', (materials || []).map(m => m.id))

  // 4. Evaluate each verification function
  const checks = {
    lista_materiale_compilata: () => (materials || []).length > 0,
    materiale_tutto_confermato: () =>
      (materials || []).length > 0 &&
      (materials || []).every(m => m.stato !== 'richiesto'),
    indirizzo_spedizione_specificato: () =>
      !!event?.indirizzo_spedizione?.trim(),
    titolo_orario_definitivi: () =>
      !!event?.titolo?.trim() && !!event?.data_inizio && !!event?.data_fine,
    materiale_tutto_preparato: () =>
      (materials || []).length > 0 &&
      (materials || []).every(m => !['richiesto', 'approvato'].includes(m.stato)),
    materiale_tutto_spedito: () => {
      if (!materials?.length) return false
      const materialIds = new Set(materials.map(m => m.id))
      const shipped = new Set(
        (movements || []).filter(m => m.tipo === 'uscita').map(m => m.material_id)
      )
      return [...materialIds].every(id => shipped.has(id))
    },
  }

  // 5. Auto-complete activities whose checks pass
  let verified = 0
  for (const activity of autoActivities) {
    const checkFn = checks[activity.verifica_automatica]
    if (checkFn && checkFn()) {
      await supabase
        .from('event_activities')
        .update({
          stato: 'completata',
          completata_il: new Date().toISOString(),
          note: 'Verificata automaticamente',
        })
        .eq('id', activity.id)
      verified++
    }
  }

  // 6. Refresh activities list
  if (verified > 0) await get().fetchEventActivities(eventId)
  return { verified }
},
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useActivities.js src/lib/constants.js src/lib/icons.js
git commit -m "feat: add auto-verification engine — 6 automatic checks for event activities"
```

---

## Task 2: Wire Auto-Verifications in EventPreparazioneTab

**Files:**
- Modify: `src/components/eventi/EventPreparazioneTab.jsx`
- Modify: `src/components/eventi/ActivityCard.jsx`
- Modify: `src/lib/constants.js`

Calls `runAutoVerifications` on tab mount and after manual completions. Shows auto-verified badge on activities.

- [ ] **Step 1: Add auto-verification display states to constants**

In `src/lib/constants.js`, extend `STATO_ATTIVITA` and `STATO_ATTIVITA_COLORE`:

```js
// Add to STATO_ATTIVITA:
in_ritardo: 'In ritardo',
bloccata: 'Bloccata',

// Add to STATO_ATTIVITA_COLORE:
in_ritardo: 'red',
bloccata: 'gray',
```

- [ ] **Step 2: Add auto-verification indicator to ActivityCard**

In `src/components/eventi/ActivityCard.jsx`, after the `StatoBadge` in the header row (line 82), add an auto-verification badge:

```jsx
{activity.tipo_verifica === 'automatica' && (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-mikai-600 bg-mikai-50">
    <Icon icon={ATTIVITA_STATO_ICONS.auto_verificata} size={12} />
    Automatica
  </span>
)}
```

Import `ATTIVITA_STATO_ICONS` is already present. Ensure `auto_verificata` icon was added in Task 1.

- [ ] **Step 3: Call runAutoVerifications on EventPreparazioneTab mount**

In `src/components/eventi/EventPreparazioneTab.jsx`:

1. Add `runAutoVerifications` to the store selectors at top:
```jsx
const runAutoVerifications = useActivitiesStore(s => s.runAutoVerifications)
```

2. Modify the useEffect to run auto-verifications after fetching:
```jsx
useEffect(() => {
  fetchEventActivities(event.id).then(() => {
    runAutoVerifications(event.id)
  })
}, [event.id])
```

3. After `handleComplete` success toast, add:
```jsx
runAutoVerifications(event.id)
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/eventi/EventPreparazioneTab.jsx src/components/eventi/ActivityCard.jsx src/lib/constants.js
git commit -m "feat: wire auto-verifications in convergence dashboard — badge + auto-check on mount"
```

---

## Task 3: Dashboard Strategica — Inline Approve/Reject

**Files:**
- Modify: `src/pages/dashboard/DashboardStrategica.jsx`

Adds approve/reject buttons directly on each event card in the approval queue, with reject reason modal.

- [ ] **Step 1: Add imports for approval UI**

At top of `DashboardStrategica.jsx`, add:

```jsx
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { ACTION_ICONS } from '../../lib/icons'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../../components/ui/Toast'
import { INPUT_STYLE } from '../../lib/constants'
```

- [ ] **Step 2: Add approval state and handlers to DashboardStrategica**

Inside `DashboardStrategica` function, after existing state declarations:

```jsx
const approveEvent = useEventsStore(s => s.approveEvent)
const rejectEvent = useEventsStore(s => s.rejectEvent)
const permissions = useAuthStore(s => s.permissions)
const addToast = useToastStore(s => s.add)
const [rejectingId, setRejectingId] = useState(null)
const [rejectMotivo, setRejectMotivo] = useState('')
const [approving, setApproving] = useState(null)

const canApprove = permissions?.includes('approva_eventi')

async function handleApprove(eventId) {
  setApproving(eventId)
  const { error } = await approveEvent(eventId)
  setApproving(null)
  if (error) {
    addToast('Errore nell\'approvazione. Riprova.', 'error')
  } else {
    addToast('Evento approvato!', 'success')
  }
}

async function handleReject() {
  if (!rejectMotivo.trim()) return
  const { error } = await rejectEvent(rejectingId, rejectMotivo.trim())
  setRejectingId(null)
  setRejectMotivo('')
  if (error) {
    addToast('Errore nel rifiuto. Riprova.', 'error')
  } else {
    addToast('Evento rifiutato.', 'success')
  }
}
```

- [ ] **Step 3: Replace approval queue card with inline buttons**

Replace the approval queue `<Link>` block (lines 128–154) with:

```jsx
{proposti.map(event => (
  <div
    key={event.id}
    className="bg-white rounded-xl border-l-4 border-l-yellow-400 border border-gray-200 p-4"
  >
    <div className="flex items-start justify-between gap-3">
      <Link to={`/eventi/${event.id}`} className="flex-1 min-w-0 hover:underline">
        <p className="text-base font-semibold text-gray-900 truncate">{event.titolo}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {event.promotore ? `${event.promotore.nome} ${event.promotore.cognome}` : '—'}
          {event.data_inizio && ` · ${formatDate(event.data_inizio)}`}
        </p>
      </Link>
      <div className="shrink-0 text-right">
        {event.budget_previsto && (
          <p className="text-sm font-semibold text-gray-700">{budgetFormatted(event.budget_previsto)}</p>
        )}
      </div>
    </div>
    {canApprove && (
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        <Button
          variant="primary"
          size="sm"
          loading={approving === event.id}
          onClick={() => handleApprove(event.id)}
        >
          <Icon icon={ACTION_ICONS.approve} size={16} className="mr-1" />
          Approva
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => { setRejectingId(event.id); setRejectMotivo('') }}
        >
          <Icon icon={ACTION_ICONS.reject} size={16} className="mr-1" />
          Rifiuta
        </Button>
      </div>
    )}
  </div>
))}
```

- [ ] **Step 4: Add reject reason modal**

After the closing `</>` of the main content (before the closing `</div>` of the component), add:

```jsx
<Modal
  open={!!rejectingId}
  onClose={() => setRejectingId(null)}
  title="Rifiuta evento"
  size="sm"
  footer={
    <div className="flex gap-3 justify-end">
      <Button variant="secondary" onClick={() => setRejectingId(null)}>Annulla</Button>
      <Button variant="danger" onClick={handleReject} disabled={!rejectMotivo.trim()}>
        Rifiuta evento
      </Button>
    </div>
  }
>
  <div className="space-y-3">
    <p className="text-sm text-gray-600">Indica il motivo del rifiuto:</p>
    <textarea
      className={INPUT_STYLE + ' min-h-[100px] resize-none'}
      value={rejectMotivo}
      onChange={e => setRejectMotivo(e.target.value)}
      placeholder="Motivo del rifiuto..."
    />
  </div>
</Modal>
```

- [ ] **Step 5: Add useState import for new state**

Verify `useState` is already imported (line 1). It is — no change needed.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/pages/dashboard/DashboardStrategica.jsx
git commit -m "feat: add inline approve/reject buttons on strategic dashboard approval queue"
```

---

## Task 4: Visual Semaphore Indicators (Traffic Light Dots)

**Files:**
- Modify: `src/pages/dashboard/DashboardStrategica.jsx` (SemaphoreIcon component)
- Modify: `src/components/eventi/EventPreparazioneTab.jsx` (TrafficLight component)

Replace text-based semaphores with visual traffic light circles (Monday.com RAG dot pattern).

- [ ] **Step 1: Replace SemaphoreIcon in DashboardStrategica**

Replace the `SemaphoreIcon` function (lines 34-57) with:

```jsx
function SemaphoreIcon({ status }) {
  const config = {
    red: { bg: 'bg-red-500', ring: 'ring-red-200', label: 'Ritardi' },
    yellow: { bg: 'bg-yellow-400', ring: 'ring-yellow-200', label: 'In corso' },
    green: { bg: 'bg-green-500', ring: 'ring-green-200', label: 'In ordine' },
    gray: { bg: 'bg-gray-300', ring: 'ring-gray-100', label: 'Nessun dato' },
  }
  const c = config[status] || config.gray
  return (
    <span className="inline-flex items-center gap-1.5" title={c.label}>
      <span className={`inline-block w-3 h-3 rounded-full ${c.bg} ring-2 ${c.ring}`} />
      <span className={`text-xs font-medium ${
        status === 'red' ? 'text-red-600' :
        status === 'green' ? 'text-green-600' :
        status === 'yellow' ? 'text-yellow-600' : 'text-gray-400'
      }`}>
        {c.label}
      </span>
    </span>
  )
}
```

- [ ] **Step 2: Replace TrafficLight in EventPreparazioneTab**

Replace the `TrafficLight` function (lines 14-37) with:

```jsx
function TrafficLight({ total, completed, overdue }) {
  let status = 'yellow'
  let label = 'In corso'
  if (overdue > 0) { status = 'red'; label = `${overdue} in ritardo` }
  else if (total > 0 && completed === total) { status = 'green'; label = 'Tutto completato' }

  const colors = {
    red: { bg: 'bg-red-500', ring: 'ring-red-200', text: 'text-red-600' },
    yellow: { bg: 'bg-yellow-400', ring: 'ring-yellow-200', text: 'text-yellow-600' },
    green: { bg: 'bg-green-500', ring: 'ring-green-200', text: 'text-green-600' },
  }
  const c = colors[status]
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-3.5 h-3.5 rounded-full ${c.bg} ring-2 ${c.ring}`} />
      <span className={`text-sm font-semibold ${c.text}`}>{label}</span>
    </div>
  )
}
```

- [ ] **Step 3: Add gray semaphore for events without activities**

In `DashboardStrategica.jsx`, change the semaphore rendering (line 185-187) to show gray if no semaphore data:

```jsx
<SemaphoreIcon status={semaphores[event.id] || 'gray'} />
```

Remove the conditional `{semaphores[event.id] && ...}` wrapper — always show the dot.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/pages/dashboard/DashboardStrategica.jsx src/components/eventi/EventPreparazioneTab.jsx
git commit -m "feat: add visual traffic light dots — RAG semaphore for event readiness"
```

---

## Task 5: Template Admin UI (AdminTemplate page)

**Files:**
- Create: `src/pages/admin/AdminTemplate.jsx`
- Modify: `src/hooks/useActivities.js` (add template CRUD actions)
- Modify: `src/App.jsx` (add route)
- Modify: `src/components/layout/Sidebar.jsx` (add nav item)

Full CRUD for event templates and their checklist items, following AdminSottoAttivita pattern.

- [ ] **Step 1: Add template CRUD actions to useActivities store**

In `src/hooks/useActivities.js`, add these actions after `runAutoVerifications`:

```js
// Template admin actions
fetchTemplates: async () => {
  const { data, error } = await supabase
    .from('event_templates')
    .select(`
      *,
      items:template_items(*)
    `)
    .order('tipo_evento')
  return { data: data || [], error }
},

fetchTemplateItems: async (templateId) => {
  const { data, error } = await supabase
    .from('template_items')
    .select('*')
    .eq('template_id', templateId)
    .eq('tipo', 'checklist')
    .order('ordine')
  return { data: data || [], error }
},

createTemplateItem: async (templateId, item) => {
  const { data, error } = await supabase
    .from('template_items')
    .insert({
      template_id: templateId,
      tipo: 'checklist',
      ...item,
    })
    .select()
    .single()
  return { data, error }
},

updateTemplateItem: async (id, updates) => {
  const { data, error } = await supabase
    .from('template_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
},

deleteTemplateItem: async (id) => {
  // First check if any activity depends on this template item
  const { data: deps } = await supabase
    .from('template_items')
    .select('id')
    .eq('dipende_da', id)
  if (deps?.length > 0) {
    return { data: null, error: { message: 'Altre attività dipendono da questa. Rimuovi prima le dipendenze.' } }
  }
  const { error } = await supabase
    .from('template_items')
    .delete()
    .eq('id', id)
  return { data: null, error }
},
```

- [ ] **Step 2: Create AdminTemplate page**

Create `src/pages/admin/AdminTemplate.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useActivitiesStore } from '../../hooks/useActivities'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { FormField } from '../../components/ui/FormField'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { useToastStore } from '../../components/ui/Toast'
import { ACTION_ICONS, CATEGORIA_ICONS } from '../../lib/icons'
import {
  TIPO_EVENTO, MODALITA_EVENTO,
  CATEGORIA_ATTIVITA, VERIFICATION_FUNCTIONS,
  INPUT_STYLE, SELECT_STYLE,
} from '../../lib/constants'

const PERMISSION_OPTIONS = {
  gestione_marketing: 'Marketing',
  gestione_spedizioni: 'Spedizioni',
  gestione_magazzino: 'Magazzino',
  gestione_organizzazione: 'Organizzazione',
  gestione_costi: 'Costi',
}

export function AdminTemplate() {
  const fetchTemplates = useActivitiesStore(s => s.fetchTemplates)
  const fetchTemplateItems = useActivitiesStore(s => s.fetchTemplateItems)
  const createTemplateItem = useActivitiesStore(s => s.createTemplateItem)
  const updateTemplateItem = useActivitiesStore(s => s.updateTemplateItem)
  const deleteTemplateItem = useActivitiesStore(s => s.deleteTemplateItem)
  const addToast = useToastStore(s => s.add)

  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [editing, setEditing] = useState(null) // null=closed, {}=new, {id,...}=edit
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    descrizione: '',
    categoria: 'organizzazione',
    permesso_responsabile: '',
    giorni_prima_evento: -7,
    obbligatorio: true,
    tipo_verifica: 'manuale',
    verifica_automatica: '',
    dipende_da: '',
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    const { data } = await fetchTemplates()
    setTemplates(data)
    setLoading(false)
  }

  async function loadItems(templateId) {
    setItemsLoading(true)
    const { data } = await fetchTemplateItems(templateId)
    setItems(data)
    setItemsLoading(false)
  }

  function handleSelectTemplate(t) {
    setSelectedTemplate(t)
    loadItems(t.id)
  }

  function openEdit(item) {
    setEditing(item || {})
    setForm(item?.id ? {
      descrizione: item.descrizione || '',
      categoria: item.categoria || 'organizzazione',
      permesso_responsabile: item.permesso_responsabile || '',
      giorni_prima_evento: item.giorni_prima_evento || -7,
      obbligatorio: item.obbligatorio ?? true,
      tipo_verifica: item.tipo_verifica || 'manuale',
      verifica_automatica: item.verifica_automatica || '',
      dipende_da: item.dipende_da || '',
    } : {
      descrizione: '',
      categoria: 'organizzazione',
      permesso_responsabile: '',
      giorni_prima_evento: -7,
      obbligatorio: true,
      tipo_verifica: 'manuale',
      verifica_automatica: '',
      dipende_da: '',
    })
  }

  async function handleSave() {
    if (!form.descrizione.trim()) return
    setSaving(true)

    const payload = {
      ...form,
      descrizione: form.descrizione.trim(),
      dipende_da: form.dipende_da || null,
      permesso_responsabile: form.permesso_responsabile || null,
      verifica_automatica: form.tipo_verifica === 'automatica' ? form.verifica_automatica : null,
    }

    const { error } = editing?.id
      ? await updateTemplateItem(editing.id, payload)
      : await createTemplateItem(selectedTemplate.id, payload)

    setSaving(false)
    if (error) {
      addToast(error.message || 'Errore nel salvataggio', 'error')
      return
    }
    addToast(editing?.id ? 'Attività aggiornata' : 'Attività creata', 'success')
    setEditing(null)
    loadItems(selectedTemplate.id)
  }

  async function handleDelete() {
    const { error } = await deleteTemplateItem(deleting.id)
    setDeleting(null)
    if (error) {
      addToast(error.message || 'Errore', 'error')
      return
    }
    addToast('Attività rimossa dal template', 'success')
    loadItems(selectedTemplate.id)
  }

  if (loading) return <LoadingSkeleton lines={6} />

  return (
    <div>
      <MobileHeader title="Template attività" subtitle="Gestisci i template checklist per evento" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Template attività' }]} />
      </div>
      <PageHeader title="Template attività" subtitle="Configura le checklist di preparazione per tipo evento" />

      <div className="px-4 md:px-8 pb-8 space-y-6">
        {/* Template selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => handleSelectTemplate(t)}
              className={`text-left p-4 rounded-xl border transition-all min-h-[48px] ${
                selectedTemplate?.id === t.id
                  ? 'border-mikai-400 bg-mikai-50 ring-2 ring-mikai-200'
                  : 'border-gray-200 bg-white hover:shadow-md'
              }`}
            >
              <p className="text-base font-semibold text-gray-900">
                {TIPO_EVENTO[t.tipo_evento] || t.tipo_evento}
              </p>
              <p className="text-sm text-gray-500">
                {MODALITA_EVENTO[t.modalita] || t.modalita}
                {' · '}{t.items?.filter(i => i.tipo === 'checklist').length || 0} attività
              </p>
            </button>
          ))}
        </div>

        {/* Items list */}
        {selectedTemplate && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Checklist: {TIPO_EVENTO[selectedTemplate.tipo_evento]} — {MODALITA_EVENTO[selectedTemplate.modalita]}
              </h2>
              <Button onClick={() => openEdit(null)}>
                <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
                Nuova attività
              </Button>
            </div>

            {itemsLoading ? (
              <LoadingSkeleton lines={4} />
            ) : items.length === 0 ? (
              <EmptyState title="Nessuna attività" description="Aggiungi la prima attività al template." />
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => openEdit(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon icon={CATEGORIA_ICONS[item.categoria]} size={16} className="text-gray-400 shrink-0" />
                          <p className="text-base font-medium text-gray-900">{item.descrizione}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                          <span>{CATEGORIA_ATTIVITA[item.categoria]}</span>
                          <span>·</span>
                          <span>{item.giorni_prima_evento}gg</span>
                          {item.obbligatorio && <span className="text-red-600 font-medium">Obbligatoria</span>}
                          {item.tipo_verifica === 'automatica' && (
                            <span className="text-mikai-600 font-medium">Auto</span>
                          )}
                          {item.dipende_da && (
                            <span className="text-gray-400">
                              Dipende da: {items.find(i => i.id === item.dipende_da)?.descrizione || '...'}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleting(item) }}
                        className="text-gray-400 hover:text-red-500 min-h-[48px] min-w-[48px] flex items-center justify-center"
                        aria-label="Elimina"
                      >
                        <Icon icon={ACTION_ICONS.close} size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Modifica attività template' : 'Nuova attività template'}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setEditing(null)}>Annulla</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.descrizione.trim()}>
              {editing?.id ? 'Salva' : 'Crea'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Descrizione" required>
            <input
              className={INPUT_STYLE}
              value={form.descrizione}
              onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
              placeholder="es. Preparare locandina evento"
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Categoria">
              <select
                className={SELECT_STYLE}
                value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              >
                {Object.entries(CATEGORIA_ATTIVITA).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Permesso responsabile">
              <select
                className={SELECT_STYLE}
                value={form.permesso_responsabile}
                onChange={e => setForm(f => ({ ...f, permesso_responsabile: e.target.value }))}
              >
                <option value="">Nessuno (chiunque)</option>
                {Object.entries(PERMISSION_OPTIONS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Giorni prima dell'evento">
              <input
                type="number"
                className={INPUT_STYLE}
                value={form.giorni_prima_evento}
                onChange={e => setForm(f => ({ ...f, giorni_prima_evento: parseInt(e.target.value) || -7 }))}
                max={0}
              />
            </FormField>

            <FormField label="Obbligatoria">
              <select
                className={SELECT_STYLE}
                value={form.obbligatorio ? 'si' : 'no'}
                onChange={e => setForm(f => ({ ...f, obbligatorio: e.target.value === 'si' }))}
              >
                <option value="si">Sì</option>
                <option value="no">No</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Tipo verifica">
              <select
                className={SELECT_STYLE}
                value={form.tipo_verifica}
                onChange={e => setForm(f => ({ ...f, tipo_verifica: e.target.value }))}
              >
                <option value="manuale">Manuale</option>
                <option value="automatica">Automatica</option>
              </select>
            </FormField>

            {form.tipo_verifica === 'automatica' && (
              <FormField label="Funzione di verifica">
                <select
                  className={SELECT_STYLE}
                  value={form.verifica_automatica}
                  onChange={e => setForm(f => ({ ...f, verifica_automatica: e.target.value }))}
                >
                  <option value="">Seleziona...</option>
                  {Object.entries(VERIFICATION_FUNCTIONS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </FormField>
            )}
          </div>

          <FormField label="Dipende da">
            <select
              className={SELECT_STYLE}
              value={form.dipende_da}
              onChange={e => setForm(f => ({ ...f, dipende_da: e.target.value }))}
            >
              <option value="">Nessuna dipendenza</option>
              {items
                .filter(i => i.id !== editing?.id)
                .map(i => (
                  <option key={i.id} value={i.id}>{i.descrizione}</option>
                ))}
            </select>
          </FormField>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleting}
        title="Elimina attività"
        message={`Eliminare "${deleting?.descrizione}" dal template? Le attività già create per eventi esistenti non saranno modificate.`}
        confirmLabel="Elimina"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
```

- [ ] **Step 3: Add route in App.jsx**

Add import at top:
```jsx
import { AdminTemplate } from './pages/admin/AdminTemplate'
```

Add route after AdminSottoAttivita route (line 73):
```jsx
<Route path="/admin/template" element={<AdminTemplate />} />
```

- [ ] **Step 4: Add nav item in Sidebar**

In `src/components/layout/Sidebar.jsx`, find the admin nav items section and add:

```jsx
{ to: '/admin/template', label: 'Template attività', icon: NAV_ICONS.checklist || NAV_ICONS.settings }
```

- [ ] **Step 5: Add checklist icon to icons.js if not present**

In `src/lib/icons.js`, check if `ClipboardCheck` is imported. If not, add it and map it:
```js
// In NAV_ICONS, add:
checklist: ClipboardCheck,
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/AdminTemplate.jsx src/hooks/useActivities.js src/App.jsx src/components/layout/Sidebar.jsx src/lib/icons.js
git commit -m "feat: add template admin page — CRUD for event checklist templates with dependencies"
```

---

## Task 6: KPI Summary Cards Row (Dashboard Strategica enhancement)

**Files:**
- Modify: `src/pages/dashboard/DashboardStrategica.jsx`

Adds a row of 4 KPI cards at the top (Cvent/Notion pattern): eventi attivi, in attesa, attività in ritardo, budget.

- [ ] **Step 1: Add KPI data computation**

In `DashboardStrategica`, after `const quarterBudget = ...` (line 90), add:

```jsx
const attivi = events.filter(e => ['confermato', 'in_preparazione', 'pronto', 'in_corso'].includes(e.stato)).length
const inAttesa = proposti.length
const overdueCount = Object.values(semaphores).filter(s => s === 'red').length
```

- [ ] **Step 2: Add KPI cards row before budget widget**

Replace the budget widget block (lines 108-112) with a 4-card row:

```jsx
{/* KPI Summary Cards */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <p className="text-sm text-gray-500">Eventi attivi</p>
    <p className="text-3xl font-bold text-gray-900">{attivi}</p>
  </div>
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <p className="text-sm text-gray-500">In attesa</p>
    <p className={`text-3xl font-bold ${inAttesa > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>{inAttesa}</p>
  </div>
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <p className="text-sm text-gray-500">Con ritardi</p>
    <p className={`text-3xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{overdueCount}</p>
  </div>
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <p className="text-sm text-gray-500">Budget trimestre</p>
    <p className="text-3xl font-bold text-mikai-400">{budgetFormatted(quarterBudget)}</p>
  </div>
</div>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboard/DashboardStrategica.jsx
git commit -m "feat: add KPI summary cards row to strategic dashboard — 4 metrics at a glance"
```

---

## Task Dependency Map

```
Task 1 (auto-verification engine)
  └──→ Task 2 (wire in UI) — depends on Task 1
Task 3 (inline approve/reject) — independent
Task 4 (visual semaphores) — independent
Task 5 (template admin) — depends on Task 1 (uses VERIFICATION_FUNCTIONS constant)
Task 6 (KPI cards) — depends on Task 3 (same file, must run after)
```

**Parallel execution plan:**
- **Agent A:** Task 1 → Task 2
- **Agent B:** Task 3 → Task 6
- **Agent C:** Task 4 (independent)
- **Agent D:** Task 5 (can start after Task 1 constants are committed)

---

## Final Verification

After all tasks complete:

- [ ] Run `npm run build` — must succeed with zero errors
- [ ] Manual check: open `http://localhost:5173/Eventi/dashboard` as direzione user
- [ ] Verify: KPI cards row visible at top
- [ ] Verify: approval queue has Approva/Rifiuta buttons
- [ ] Verify: traffic light dots visible on upcoming events
- [ ] Manual check: open event detail → Preparazione tab
- [ ] Verify: auto-verified activities show "Automatica" badge
- [ ] Manual check: `/admin/template` page loads and shows templates
