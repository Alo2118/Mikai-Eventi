# Phase 5C — Documents & Export — Implementation Plan

**Date:** 2026-03-24
**Spec:** `docs/superpowers/specs/2026-03-24-phase5c-documents-export-design.md`
**Status:** Ready for execution

---

## Prerequisites

Before starting, install new dependencies:

```bash
npm install exceljs jspdf@^2.5.2 jspdf-autotable@^3.8.4
```

> **Note:** `exceljs` is MIT licensed, unlike `xlsx` which has a restrictive license.

---

## Task 1: Database Migrations (3 files)

### What
Create three SQL migration files for the `tipo_documento` enum, `event_documents` table, and `packing_list_items` table. The enum must be in a separate migration because PostgreSQL's `ADD VALUE` isn't visible within the same transaction that references it.

### Files to create
- `supabase/migrations/20260324200000_event_documents_enum.sql`
- `supabase/migrations/20260324200001_event_documents_table.sql`
- `supabase/migrations/20260324200002_packing_list_items.sql`

### Code changes

**Migration 1 — Enum:**
```sql
DO $$ BEGIN
  CREATE TYPE tipo_documento AS ENUM (
    'contratto', 'preventivo_firmato', 'programma',
    'presentazione', 'foto', 'autorizzazione', 'altro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

**Migration 2 — event_documents table:**
- Table with columns: `id`, `event_id` (FK → events CASCADE), `nome`, `tipo_documento`, `file_path`, `file_size`, `mime_type`, `uploaded_by` (FK → auth.users), `note`, `created_at`
- Indexes on `event_id` and `uploaded_by`
- RLS: SELECT for all authenticated, INSERT where `auth.uid() = uploaded_by`, DELETE where uploader OR admin/direzione role

**Migration 3 — packing_list_items table:**
- Table with columns: `id`, `event_id` (FK → events CASCADE), `event_material_id` (FK → event_materials CASCADE, nullable), `descrizione`, `quantita`, `imballato`, `imballato_da` (FK → auth.users), `imballato_at`, `note`, `ordine`, `created_at`
- Index on `event_id`
- RLS: full CRUD for all authenticated users

Full SQL is specified in the design spec's "Database Migrations" section — use it verbatim.

### Dependencies
None — this is the first task.

### Verification
```bash
source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"
source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase migration list -p "$SUPABASE_DB_PASSWORD"
```
Confirm all three migrations show as "applied" with no errors.

---

## Task 2: Create Supabase Storage Bucket

### What
Create the `event-documents` private storage bucket and configure RLS policies for file access.

### Files to create
- `supabase/migrations/20260324200003_storage_bucket_policies.sql`

### Code changes
The bucket itself must be created via Supabase Dashboard (Storage → Create bucket → name: `event-documents`, public: false, max file size: 10485760, allowed MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `image/jpeg`, `image/png`).

The storage RLS policies can go in a migration:
```sql
-- Read: authenticated users
CREATE POLICY "event_docs_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'event-documents');

-- Upload: authenticated users
CREATE POLICY "event_docs_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-documents');

-- Delete: authenticated users can delete event documents
-- Ownership is enforced at the application level via the event_documents table
-- (uploaded_by check in the store). Storage policies only ensure authenticated access.
CREATE POLICY "Authenticated users can delete event documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-documents');
```

### Dependencies
Task 1 (migrations applied first).

### Verification
1. Open Supabase Dashboard → Storage → confirm `event-documents` bucket exists
2. Push storage policies migration and confirm no errors
3. Test: upload a small file via Supabase Dashboard's Storage UI to confirm policies work

---

## Task 3: Constants & Icons

### What
Add document-related constants to `constants.js` and new icons/icon map to `icons.js`.

### Files to modify
- `src/lib/constants.js`
- `src/lib/icons.js`

### Code changes

**constants.js** — append:
```js
export const TIPO_DOCUMENTO = {
  contratto: 'Contratto',
  preventivo_firmato: 'Preventivo firmato',
  programma: 'Programma',
  presentazione: 'Presentazione',
  foto: 'Foto',
  autorizzazione: 'Autorizzazione',
  altro: 'Altro',
}

export const TIPO_DOCUMENTO_COLORE = {
  contratto: 'blue',
  preventivo_firmato: 'green',
  programma: 'purple',
  presentazione: 'yellow',
  foto: 'emerald',
  autorizzazione: 'red',
  altro: 'gray',
}

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024

export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.jpg', '.jpeg', '.png']

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
]
```

**icons.js** — add new imports: `Download`, `FileImage`, `FileSpreadsheet`, `File`, `Eye`, `Printer`, `FileDown`, `Trash2`. Check which already exist — `Upload`, `FileText`, `Paperclip` are already imported. Then add the new icon map:

```js
export const DOCUMENTO_ICONS = {
  contratto: FileText,
  preventivo_firmato: FileText,
  programma: FileText,
  presentazione: File,
  foto: FileImage,
  autorizzazione: FileText,
  altro: File,
  upload: Upload,
  download: Download,
  delete: Trash2,
  preview: Eye,
  attachment: Paperclip,
  spreadsheet: FileSpreadsheet,
  print: Printer,
  dossier: FileDown,
}
```

### Dependencies
None — can run in parallel with Task 1.

### Verification
```bash
npm run build
```
Confirm no import errors or unused import warnings. Grep icons.js to verify no duplicate Lucide imports.

---

## Task 4: `formatFileSize` Utility

### What
Create a new `src/lib/format-utils.js` file with a `formatFileSize(bytes)` function for displaying document sizes (e.g., "2.3 MB"). This goes in a separate file rather than `date-utils.js` because it is not date-related.

### Files to create
- `src/lib/format-utils.js`

### Code changes
New file with:
```js
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
```

### Dependencies
None.

### Verification
`npm run build` — no errors. Mentally verify: `formatFileSize(2415919)` → `"2.3 MB"`, `formatFileSize(512)` → `"512 B"`, `formatFileSize(10240)` → `"10 KB"`.

---

## Task 5: Install npm Dependencies

### What
Add `exceljs`, `jspdf`, and `jspdf-autotable` to `package.json` dependencies.

> **Note:** `exceljs` is MIT licensed, unlike `xlsx` which has a restrictive license.

### Files to modify
- `package.json`

### Code changes
```bash
npm install exceljs jspdf@^2.5.2 jspdf-autotable@^3.8.4
```

### Dependencies
None.

### Verification
```bash
npm run build
```
Confirm build completes. Check `package.json` has `exceljs`, `jspdf`, and `jspdf-autotable` listed.

---

## Task 6: Export Utility (`export-utils.js`)

### What
Create `src/lib/export-utils.js` with `exportToExcel()` and `exportToExcelMultiSheet()` functions. Use **dynamic import** of `exceljs` to avoid bloating the main bundle.

### Files to create
- `src/lib/export-utils.js`

### Code changes

Two exported functions:

**`exportToExcel({ filename, sheetName, columns, data })`** — single-sheet export:
1. Dynamic import: `const ExcelJS = (await import('exceljs')).default`
2. Create workbook and worksheet:
   ```js
   const workbook = new ExcelJS.Workbook()
   const sheet = workbook.addWorksheet(sheetName)
   sheet.columns = columns.map(c => ({ header: c.label, key: c.key, width: c.width || 20 }))
   ```
3. Map data rows using `columns[].key` (supporting nested access like `'promotore.nome'` via a `getNestedValue` helper) and optional `columns[].format` transformer (receives both cell value and full row: `format(value, row)`)
4. Add rows: `rows.forEach(row => sheet.addRow(row))`
5. Generate file:
   ```js
   const buffer = await workbook.xlsx.writeBuffer()
   const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
   const url = URL.createObjectURL(blob)
   const a = document.createElement('a')
   a.href = url
   a.download = `${filename}_${formatDayISO(new Date())}.xlsx`
   a.click()
   URL.revokeObjectURL(url)
   ```

**`exportToExcelMultiSheet({ filename, sheets })`** — multi-sheet export (for LogisticaPage):
1. Same dynamic import pattern
2. Create a single workbook
3. Iterate `sheets[]`, each with `{ sheetName, columns, data }` — add a worksheet per entry
4. Write buffer and trigger download

**`getNestedValue(obj, path)`** — internal helper:
- Split `path` by `.`, reduce into obj to access nested properties
- Returns `undefined` for missing paths

### Dependencies
Task 5 (npm install).

### Verification
```bash
npm run build
```
No build errors. Functional test: import and call `exportToExcel` with mock data in browser console — confirm `.xlsx` file downloads.

---

## Task 7: `ExportButton` Component

### What
Create a reusable `ExportButton` component — a secondary Button with a spreadsheet icon that shows a loading spinner while generating.

### Files to create
- `src/components/ui/ExportButton.jsx`

### Code changes
```jsx
export function ExportButton({ onClick, loading, label = 'Esporta Excel' })
```

- Renders `<Button variant="secondary" onClick={onClick} loading={loading}>`
- Contains `<Icon icon={DOCUMENTO_ICONS.spreadsheet} size={18} />` + label text
- When `loading` is true, button shows spinner and is disabled

### Dependencies
Task 3 (icons).

### Verification
`npm run build` — no errors. Visual: import in a page, render, confirm it displays correctly.

---

## Task 8: Export Integration — EventiList

### What
Add an "Esporta Excel" button to EventiList that exports the currently filtered events list.

### Files to modify
- `src/pages/eventi/EventiList.jsx`

### Code changes

1. Import `ExportButton` from `../../components/ui/ExportButton`
2. Import `exportToExcel` from `../../lib/export-utils`
3. Import `TIPO_EVENTO`, `STATO_EVENTO` from constants and `formatDate` from date-utils
4. Define `EXPORT_COLUMNS_EVENTI` constant (per spec: titolo, tipo, stato, data_inizio, data_fine, luogo, promotore, manager, budget, note — with format functions for enums and joins)
5. Add `handleExport` async function:
   - Set local `exporting` state to true
   - Check `events.length > 0`, otherwise toast "Nessun dato da esportare"
   - Call `exportToExcel({ filename: 'eventi', sheetName: 'Eventi', columns: EXPORT_COLUMNS_EVENTI, data: events })`
   - Toast "File esportato" on success, catch errors
   - Set `exporting` to false
6. Add `<ExportButton onClick={handleExport} loading={exporting} />` inside the PageHeader `actions` slot, alongside existing buttons

### Dependencies
Tasks 6, 7.

### Verification
`npm run build` — no errors. Manual test: navigate to EventiList, apply a filter, click export, confirm `.xlsx` downloads with correct filtered data.

---

## Task 9: Export Integration — ContattiList

### What
Add export button to ContattiList page.

### Files to modify
- `src/pages/contatti/ContattiList.jsx`

### Code changes

1. Import `ExportButton` and `exportToExcel`
2. Define `EXPORT_COLUMNS_CONTATTI` (per spec: cognome, nome, tipo_contatto, azienda, email, telefono, citta, zona.nome, proprietario)
3. Add `handleExport` with empty-check guard and toast feedback
4. **Important bug fix:** Change the existing `action=` prop on `PageHeader` to `actions=` (plural). The current code uses `action` (singular) which is silently dropped — this is a pre-existing bug where the action buttons were not rendering. The correct prop name is `actions`.
5. Add `<ExportButton>` inside the `actions` prop's `<div className="flex gap-2">`, alongside existing "Importa" and "Nuovo contatto" buttons

### Dependencies
Tasks 6, 7.

### Verification
`npm run build`. Manual test: export contacts with filters applied, confirm data matches visible list.

---

## Task 10: Export Integration — MaterialeList, CostiPage, LogisticaPage

### What
Add export buttons to the remaining three list pages.

### Files to modify
- `src/pages/materiale/MaterialeList.jsx`
- `src/pages/costi/CostiPage.jsx`
- `src/pages/logistica/LogisticaPage.jsx`

### Code changes

**MaterialeList:**
- Define `EXPORT_COLUMNS_MATERIALI` (nome, codice_inventario, tipo, posizione, product.nome, product.brand.nome)
- Add `ExportButton` in `PageHeader` (currently has no actions — add an `actions` or `action` prop)
- Handle: `exportToExcel({ filename: 'materiale', sheetName: 'Materiale', columns, data: materials })`

**CostiPage:**
- Define `EXPORT_COLUMNS_PREVENTIVI` (evento.titolo, fornitore_ref formatted, descrizione, importo, stato, created_at)
- The fornitore column must use a fallback: `{ key: 'fornitore_ref', label: 'Fornitore', format: (v, row) => v ? \`${v.nome} ${v.cognome}\` : row.fornitore_nome || '' }` — note that `format` receives both the cell value AND the full row for fallback logic
- Add `ExportButton` in `PageHeader`
- Handle: `exportToExcel({ filename: 'preventivi', sheetName: 'Preventivi', columns, data: preventivi })`

**LogisticaPage:**
- This is the multi-sheet case. The LogisticaPage itself is a tabbed container, so we need to:
  1. Import `exportToExcelMultiSheet` instead
  2. In the export handler, call the store's `fetchAllPendingHotels()` and `fetchAllPendingTrasporti()` to get cross-event data
  3. Compute `_personName` field for each record: `(r.user ? \`${r.user.nome} ${r.user.cognome}\` : r.contact ? \`${r.contact.nome} ${r.contact.cognome}\` : '')`
  4. Call `exportToExcelMultiSheet({ filename: 'logistica', sheets: [{ sheetName: 'Hotel', columns: EXPORT_COLUMNS_HOTEL, data: hotels }, { sheetName: 'Trasporti', columns: EXPORT_COLUMNS_TRASPORTI, data: trasporti }] })`
- Add `ExportButton` in `PageHeader` (visible regardless of active tab — exports both sheets)

### Dependencies
Tasks 6, 7.

### Verification
`npm run build`. Manual test each page: confirm correct Excel output with all expected columns and formatted enum values.

---

## Task 11: Documents Store (`useDocuments.js`)

### What
Create the Zustand store for document CRUD operations and Supabase Storage interactions.

### Files to create
- `src/hooks/useDocuments.js`

### Code changes

Store: `useDocumentsStore` with state `{ documents, loading, error }` and actions:

**`fetchEventDocuments(eventId)`**
- Query `event_documents` with join to `users!event_documents_uploaded_by_fkey(id, nome, cognome)` aliased as `uploader`
- Filter by `event_id`, order by `created_at desc`
- Set state

**`uploadDocument(eventId, file, tipoDocumento, note, userId)`**
1. Validate `file.size <= MAX_UPLOAD_SIZE`, return error if exceeded
2. Validate `ALLOWED_MIME_TYPES.includes(file.type)`, return error if invalid
3. Generate path: `` `${eventId}/${crypto.randomUUID()}_${file.name}` ``
4. Upload to storage: `supabase.storage.from('event-documents').upload(path, file)`
5. Insert into `event_documents` table with all metadata
6. Prepend to local `documents` state
7. Return `{ data, error }`

**`deleteDocument(id, filePath)`**
1. Remove from storage: `supabase.storage.from('event-documents').remove([filePath])`
2. Delete from `event_documents` table
3. Remove from local state
4. Return `{ error }`

**`getSignedUrl(filePath)`**
1. Call `supabase.storage.from('event-documents').createSignedUrl(filePath, 3600)`
2. Return `{ data, error }`

### Dependencies
Tasks 1, 2 (database + storage bucket must exist).

### Verification
`npm run build`. Test via browser: call store actions from console, verify upload creates a record and file is accessible via signed URL.

---

## Task 12: EventDocumentiTab Component

### What
Build the full Documenti tab UI that replaces the ComingSoon placeholder in EventiDetail. Includes drop zone, upload modal, document list with filter chips, preview/download/delete actions.

### Files to create
- `src/components/eventi/EventDocumentiTab.jsx`

### Files to modify
- `src/pages/eventi/EventiDetail.jsx` — replace ComingSoon with `<EventDocumentiTab event={event} />`

### Code changes

**EventDocumentiTab.jsx** — component props: `{ event }`

Key internal components/sections (can be inline if small, or extracted):

1. **Drop Zone** — `<div>` with `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop` handlers. Also wraps a hidden `<input type="file" multiple accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png">`. Accessible: `role="button"`, `tabIndex={0}`, Enter/Space opens file picker. Visual states: default, drag-over (blue border + blue background), uploading (spinner).

2. **Upload Modal** — internal component `UploadModal({ files, onClose, onUpload })`:
   - Shows file list with name, size, and a tipo_documento `<select>` per file
   - Auto-detect tipo from MIME/filename via `guessDocumentType()` helper
   - Note field (shared for single file, omitted for multi)
   - "Carica" / "Carica tutti" button
   - Sequential upload with progress: "Caricamento 2 di 5..."

3. **Filter Chips** — using `TIPO_DOCUMENTO` keys as filter options. Local state `filterTipo`. Filters `documents` array client-side.

4. **Document Cards** — map over filtered documents:
   - Icon from `DOCUMENTO_ICONS[doc.tipo_documento]`
   - Filename (truncate > 40 chars), `StatusPill` for tipo, formatted file size, uploader name, date
   - Action buttons: Anteprima (eye — for PDF opens new tab, for images opens modal, for others triggers download with toast), Scarica (download via signed URL + `<a download>` trick), Elimina (visible only to uploader or admin/direzione, triggers ConfirmDialog)

5. **Empty State** — when no documents exist

6. **Image Preview Modal** — for JPG/PNG preview in a centered Modal with `<img>` fitted to viewport

**EventiDetail.jsx changes:**
- Add import: `import { EventDocumentiTab } from '../../components/eventi/EventDocumentiTab'`
- Replace line 160: `{activeTab === 'documenti' && <ComingSoon ...>}` with `{activeTab === 'documenti' && <EventDocumentiTab event={event} />}`

### Dependencies
Tasks 3, 4, 11 (constants, icons, `formatFileSize` from `format-utils.js`, documents store).

### Verification
`npm run build`. Manual test:
1. Navigate to event detail → Documenti tab → see empty state
2. Drop a PDF → upload modal appears → select tipo → upload → file appears in list
3. Click preview on PDF → opens in new tab
4. Click download → file downloads
5. Click delete → confirm dialog → document removed
6. Upload a JPG → preview shows image modal
7. Filter by tipo → list filters correctly

---

## Task 13: Packing List Store (`usePackingList.js`)

### What
Create the Zustand store for packing list CRUD and generation logic.

### Files to create
- `src/hooks/usePackingList.js`

### Code changes

Store: `usePackingListStore` with state `{ items, loading }` and actions:

**`fetchPackingList(eventId)`**
- Query `packing_list_items` with join to `event_materials(*, product:products(id, nome, codice, brand:brands(id, nome)))`
- Filter by `event_id`, order by `ordine`, then `created_at`
- Set state

**`generatePackingList(eventId)`**
1. Fetch `event_materials` where `event_id = eventId` AND `stato IN ('approvato', 'in_preparazione')` with product joins
2. Fetch existing `packing_list_items` for this event
3. Find materials not yet in packing list (by `event_material_id`)
4. For each new material:
   - Insert packing_list_item with `event_material_id`, `descrizione` = product name + brand, `quantita` from event_materials `quantita_approvata` or `quantita`
5. Re-fetch full list
6. Return `{ added: newItems.length }`

**`togglePacked(id, packed, userId)`**
- Update `imballato = packed`, `imballato_da = packed ? userId : null`, `imballato_at = packed ? now() : null`
- Update local state

**`addManualItem(eventId, descrizione, quantita, note)`**
- Insert with `event_material_id = null`, `imballato = false`
- Append to local state

**`removeItem(id)`**
- Delete from table, remove from local state
- Note: only allow deletion of manual items (where `event_material_id IS NULL`). For linked items, show a warning toast

**`reorderItems(items)`**
- Batch update: for each item, update `ordine` field
- Optimistic update of local state

### Dependencies
Task 1 (packing_list_items table).

### Verification
`npm run build`. Test: generate packing list for an event with approved materials, confirm items created. Toggle packed, add manual item, verify persistence.

---

## Task 14: EventPackingList Component

### What
Build the packing list UI with checkboxes, progress indicator, manual item entry, grouping, and print support.

### Files to create
- `src/components/eventi/EventPackingList.jsx`

### Code changes

**Props:** `{ event }`

**Layout sections:**

1. **Header** — event title, dates, shipping address (`event.indirizzo_spedizione`)

2. **Action bar** — "Genera da lista materiale" button (triggers `generatePackingList`, with confirmation if items already exist), "+ Aggiungi voce manuale" button

3. **Progress indicator** — `ProgressIndicator` component showing `{packed}/{total} imballati` with percentage bar

4. **Grouped checklist:**
   - Group 1: "Materiale confermato" — items where `event_material_id IS NOT NULL`
   - Group 2: "Voci manuali" — items where `event_material_id IS NULL`
   - Each item: checkbox (toggle `imballato`), description, quantity badge, note
   - Checked items: subtle green background + strikethrough text
   - Manual items: show delete button (with ConfirmDialog)

5. **Kit expansion** — for items linked to `demo_kit` products, show expandable section listing kit_contents (informational only, no individual checkboxes)

6. **Print button** — "Stampa lista" button calling `window.print()`. Disabled when no items.

7. **Print-specific markup:**
   - Add CSS classes `print-checkbox`, `print-checkbox checked`, `packing-item`, `print-header` (for print stylesheet targeting)
   - Print header (hidden on screen): Mikai text + event info + date

8. **Manual item inline form** — appears on button click: text input for descrizione, number input for quantita (default 1), optional note textarea, save/cancel buttons

**Empty state** — when no items: "Nessun materiale confermato. Conferma i materiali nella tab Materiale prima di generare la lista."

**Sync indicator** — if count of `event_materials` in approved/in_preparazione state differs from linked packing items, show a yellow banner: "La lista materiale è cambiata. Premi 'Genera da lista materiale' per sincronizzare."

### Dependencies
Tasks 3, 13 (icons, constants, packing list store).

### Verification
`npm run build`. Manual test: open packing list for event with materials, generate, check items, add manual item, toggle packed states, print preview.

---

## Task 15: Print CSS Styles

### What
Add `@media print` styles to `src/index.css` for clean packing list printing.

### Files to modify
- `src/index.css`

### Code changes

Append to end of file:
```css
@media print {
  nav, .sidebar, .bottom-bar, .mobile-header, .breadcrumb { display: none !important; }
  button:not(.print-visible), input[type="checkbox"], .no-print { display: none !important; }
  .print-checkbox::before {
    content: '[ ]';
    font-family: monospace;
    margin-right: 8px;
  }
  .print-checkbox.checked::before {
    content: '[X]';
  }
  main { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
  .print-header { display: block !important; }
  .packing-item { break-inside: avoid; }
}
```

### Dependencies
None — can be done anytime.

### Verification
`npm run build`. Open packing list in browser, Ctrl+P (print preview): confirm app shell hidden, checkboxes replaced with `[ ]`/`[X]`, clean layout, items don't break across pages.

---

## Task 16: Wire Packing List into Event Tabs

### What
Add entry points to the packing list from Preparazione tab and Documenti tab. Also wire the packing list as a toggleable panel or sub-view within EventiDetail.

### Files to modify
- `src/components/eventi/EventPreparazioneTab.jsx` — add "Lista preparazione" button
- `src/components/eventi/EventDocumentiTab.jsx` — add "Genera lista preparazione" action
- `src/pages/eventi/EventiDetail.jsx` — handle showing packing list (could be a modal, a sub-tab, or a state toggle)

### Code changes

**Approach:** Use a local state in EventiDetail to toggle between normal tab content and the packing list view. When `showPackingList` is true, render `<EventPackingList event={event} />` instead of the active tab content. Add a back button to return.

Alternatively (simpler): render the packing list inline within the Preparazione tab as a collapsible section, and add a link/button in Documenti tab that switches the active tab to Preparazione.

**Chosen approach:** Add a local `showPackingList` state in EventiDetail. A "Lista preparazione" button in Preparazione tab and Documenti tab sets this state. When true, the main content area renders `<EventPackingList event={event} onBack={() => setShowPackingList(false)} />`.

**EventPreparazioneTab:**
- Add a "Lista preparazione" button (secondary variant) at the top of the tab, next to existing content
- On click: call `onShowPackingList()` prop

**EventDocumentiTab:**
- Add a "Genera lista preparazione" button in the header area
- On click: call `onShowPackingList()` prop

**EventiDetail:**
- Add state: `const [showPackingList, setShowPackingList] = useState(false)`
- Pass `onShowPackingList={() => setShowPackingList(true)}` to Preparazione and Documenti tabs
- When `showPackingList` is true, render packing list with back button instead of tabs content

### Dependencies
Tasks 12, 14.

### Verification
`npm run build`. Manual test: click "Lista preparazione" from Preparazione tab → see packing list. Click back → return to tab. Same from Documenti tab.

---

## Task 17: Dossier PDF Generator (`generate-dossier.js`)

### What
Create the PDF generation module that produces a branded, multi-section event dossier using jsPDF + jspdf-autotable.

### Files to create
- `src/lib/generate-dossier.js`

### Code changes

**Export:** `generateEventDossier(params)` — async function (uses dynamic imports)

**Parameters:**
```js
{
  event,          // Full event object
  staff,          // Array from useStaffStore
  participants,   // Array from useParticipantsStore
  subActivities,  // Array from useSubActivitiesStore
  materials,      // Array from useMaterialsStore.fetchEventMaterialList
  hotels,         // Array from useLogisticsStore
  trasporti,      // Array from useLogisticsStore
  preventivi,     // Array from useCostsStore
  activities,     // Array of readiness activities (if available)
  permissions,    // Array of user permissions (to decide costi inclusion)
}
```

**Implementation structure:**

1. Dynamic import: `const { jsPDF } = await import('jspdf'); await import('jspdf-autotable')`
2. Create doc: `new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })`
3. Define brand constants: `MIKAI_BLUE = '#3296dc'`, `TABLE_HEADER_BG = '#e8f4fc'`, `TEXT_COLOR = '#374151'`
4. **Cover section:** Mikai logo (base64), "DOSSIER EVENTO", event title, dates, location
5. **Section 1: Informazioni Generali** — key-value pairs (tipo, modalita, stato, promotore, manager, luogo, budget, certificato, note) — rendered as label:value rows
6. **Section 2: Staff** — autoTable with columns: Nome, Ruolo, Confermato. Data from `staff` mapped to rows. Empty: "Nessuno staff assegnato"
7. **Section 3: Partecipanti** — autoTable with: Nome, Tipo, Azienda, Stato. From `participants`. Empty: "Nessun partecipante"
8. **Section 4: Programma** — conditional (only if `subActivities.length > 0`). autoTable: Orario, Attivita, Fornitore, Confermato
9. **Section 5: Materiale** — conditional (only if `event.modalita !== 'contributo'`). autoTable: Prodotto, Brand, Quantita, Stato
10. **Section 6: Logistica** — shipping address, then two sub-tables: Hotel (persona, hotel, check-in, stato) and Trasporti (persona, direzione, mezzo, codice, orario)
11. **Section 7: Costi** — conditional (only if `permissions` includes `gestione_costi` or `approva_preventivi`). autoTable: Fornitore, Descrizione, Importo, Stato. Footer row with totals.
12. **Section 8: Stato Preparazione** — conditional (only if `activities.length > 0`). autoTable: Attivita, Stato, Scadenza, Responsabile

**Helper functions (internal):**
- `addSectionTitle(doc, title, y)` — draws blue text + underline, returns new Y
- `addKeyValue(doc, label, value, y)` — draws label:value pair
- `addAutoTable(doc, head, body, startY)` — wrapper around `doc.autoTable()` with Mikai styling
- `checkPageBreak(doc, neededHeight, currentY)` — adds page if needed, returns Y
- `addFooter(doc)` — "Generato il {date} — Eventi Mikai — Pagina {n} di {total}" on every page

**Person name helper:** `(row) => row.user ? \`${row.user.nome} ${row.user.cognome}\` : row.contact ? \`${row.contact.nome} ${row.contact.cognome}\` : ''`

**Mikai logo:** Embed as a small base64 PNG string constant. If not available at implementation time, use text fallback "MIKAI" in Mikai blue.

### Dependencies
Task 5 (npm install jspdf + jspdf-autotable).

### Verification
`npm run build`. Test: call `generateEventDossier()` with mock data, inspect generated PDF for correct sections, tables, branding, page breaks.

---

## Task 18: Dossier Button in EventiDetail

### What
Add a "Genera dossier PDF" button in the EventiDetail page header. When clicked, it fetches all event data in parallel and generates the PDF.

### Files to modify
- `src/pages/eventi/EventiDetail.jsx`

### Code changes

1. Import stores: `useStaffStore`, `useParticipantsStore`, `useSubActivitiesStore` (from `useSubActivities.js`, already available in scope via existing imports or add new ones), `useMaterialsStore`, `useLogisticsStore`, `useCostsStore`. Use Zustand selector pattern to get store references (e.g., `const subActivitiesStore = useSubActivitiesStore.getState()` inside the handler, or extract the action functions via selectors at the top of the component).
2. Import `generateEventDossier` from `../../lib/generate-dossier`
3. Import `formatDayISO` from date-utils
4. Add `DOSSIER_ELIGIBLE_STATES` constant: `['confermato', 'in_preparazione', 'pronto', 'in_corso', 'concluso']`
5. Add local state: `const [generating, setGenerating] = useState(false)`
6. Add `handleGenerateDossier` async function:
   ```
   setGenerating(true)
   try {
     const results = await Promise.all([
       staffStore.fetchEventStaff(event.id),
       participantsStore.fetchEventParticipants(event.id),
       useSubActivitiesStore.getState().fetchEventSubActivities(event.id),
       materialsStore.fetchEventMaterialList(event.id),
       logisticsStore.fetchEventLogistics(event.id),
       costsStore.fetchEventPreventivi(event.id),
     ])
     // Get data from stores (logistics populates store directly)
     const doc = await generateEventDossier({
       event,
       staff: staffStore.staff,
       participants: participantsStore.participants,
       subActivities: useSubActivitiesStore.getState().subActivities,
       materials: results[3].data,
       hotels: logisticsStore.hotels,
       trasporti: logisticsStore.trasporti,
       preventivi: costsStore.preventivi,
       activities: [],
       permissions,
     })
     doc.save(`dossier_${event.titolo.replace(/\s+/g, '_')}_${formatDayISO(new Date())}.pdf`)
     addToast('Dossier PDF generato', 'success')
   } catch (err) {
     addToast('Errore nella generazione del dossier', 'error')
   } finally {
     setGenerating(false)
   }
   ```
7. Add button in the desktop header area (after the title/subtitle):
   - **Note:** EventiDetail uses a custom header layout (not PageHeader), so the dossier PDF button should be placed in the existing header markup next to the status flow, not via PageHeader's `actions` prop.
   - Only visible when `DOSSIER_ELIGIBLE_STATES.includes(event.stato)`
   - `<Button variant="secondary" onClick={handleGenerateDossier} loading={generating}>`
   - Icon: `DOCUMENTO_ICONS.dossier`
   - Label: "Genera dossier"
   - When disabled (wrong state), show tooltip text below: "Disponibile solo per eventi confermati o successivi"

### Dependencies
Tasks 3, 17 (icons, generate-dossier module).

### Verification
`npm run build`. Manual test:
1. Open a confirmed event → see "Genera dossier" button
2. Click → spinner → PDF downloads
3. Open PDF → verify all sections present with correct data and Mikai branding
4. Open a proposed event → button not visible
5. Open a cancelled event → button not visible

---

## Task 19: Final Build Verification & Cleanup

### What
Run full build, check for errors, verify no dead imports, no unused dependencies, and all features work end-to-end.

### Files to modify
- Any files with build errors or dead code discovered during verification

### Code changes
Fix any issues found during verification:
- Remove unused imports
- Fix TypeScript/JSX warnings
- Ensure all new files follow project naming conventions
- Verify file sizes (components < 300 lines, functions < 50 lines)

### Dependencies
All previous tasks.

### Verification checklist:
1. `npm run build` — zero errors, zero warnings
2. `npm run preview` — app loads, navigate through all pages
3. **Documents:** Upload PDF, JPG, DOCX → preview/download/delete works
4. **Packing list:** Generate from materials → check items → add manual → print
5. **Excel export:** Test all 5 list pages — events, contacts, materials, costs, logistics
6. **Dossier PDF:** Generate for a confirmed event with all data populated
7. **Mobile:** Test document upload on mobile (click-to-browse, not drag)
8. **Edge cases:** Upload file > 10MB (rejected), upload unsupported type (rejected), export empty list (toast), generate dossier for proposed event (button hidden)

---

## Summary

| # | Task | Files | Est. Scope |
|---|------|-------|------------|
| 1 | DB Migrations (3 files) | 3 new SQL files | Small |
| 2 | Storage Bucket + Policies | 1 new SQL + dashboard | Small |
| 3 | Constants & Icons | 2 modified | Small |
| 4 | formatFileSize utility | 1 new (`format-utils.js`) | Tiny |
| 5 | npm install deps | package.json | Tiny |
| 6 | export-utils.js | 1 new | Medium |
| 7 | ExportButton component | 1 new | Small |
| 8 | Export — EventiList | 1 modified | Small |
| 9 | Export — ContattiList | 1 modified | Small |
| 10 | Export — Materiale, Costi, Logistica | 3 modified | Medium |
| 11 | useDocuments store | 1 new | Medium |
| 12 | EventDocumentiTab | 1 new + 1 modified | Large |
| 13 | usePackingList store | 1 new | Medium |
| 14 | EventPackingList component | 1 new | Large |
| 15 | Print CSS | 1 modified | Small |
| 16 | Wire packing list into tabs | 3 modified | Medium |
| 17 | generate-dossier.js | 1 new | Large |
| 18 | Dossier button in EventiDetail | 1 modified | Medium |
| 19 | Final verification & cleanup | Various | Small |

**New files:** 11 (3 migrations, 1 storage policy SQL, 4 JS stores/utils incl. `format-utils.js`, 3 components)
**Modified files:** ~12 (pages, constants, icons, index.css)
**Total tasks:** 19

### Dependency Graph

```
Task 1 (DB) ─────────────────────────────┐
Task 2 (Storage) ─── depends on 1 ───────┤
Task 3 (Constants/Icons) ────────────────┤
Task 4 (formatFileSize) ────────────────┤
Task 5 (npm install) ──────────────────┤
                                         │
Task 6 (export-utils) ── depends on 5 ──┤
Task 7 (ExportButton) ── depends on 3 ──┤
                                         │
Tasks 8-10 (Export pages) ── depend on 6,7
                                         │
Task 11 (useDocuments) ── depends on 1,2 ┤
Task 12 (DocumentiTab) ── depends on 3,4,11
                                         │
Task 13 (usePackingList) ── depends on 1 ┤
Task 14 (PackingList UI) ── depends on 3,13
Task 15 (Print CSS) ── no dependencies   │
Task 16 (Wire packing) ── depends on 12,14
                                         │
Task 17 (generate-dossier) ── depends on 5
Task 18 (Dossier button) ── depends on 3,17
                                         │
Task 19 (Verification) ── depends on all ┘
```

### Parallelizable groups
- **Group A (no deps):** Tasks 1, 3, 4, 5, 15 — can all run in parallel
- **Group B (after A):** Tasks 2, 6, 7, 11, 13, 17 — can run in parallel
- **Group C (after B):** Tasks 8, 9, 10, 12, 14, 18 — can run in parallel
- **Group D (after C):** Tasks 16, 19 — final wiring and verification
