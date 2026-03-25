# Phase 5C — Documenti & Export — Design Spec

**Date:** 2026-03-24
**Status:** Draft
**Context:** The Documenti tab in EventiDetail currently shows a ComingSoon placeholder. Users need document storage per event, packing lists for warehouse staff, Excel/CSV exports from list pages, and a single-page event dossier PDF for printing/archiving. All generation is client-side (no server-side PDF rendering).

---

## Table of Contents

1. [Feature 1: Document Storage per Evento](#feature-1-document-storage-per-evento)
2. [Feature 2: Packing List (Lista Preparazione)](#feature-2-packing-list-lista-preparazione)
3. [Feature 3: Export Excel/CSV](#feature-3-export-excelcsv)
4. [Feature 4: Event Dossier PDF](#feature-4-event-dossier-pdf)
5. [New Dependencies](#new-dependencies)
6. [Database Migrations](#database-migrations)
7. [Icon Additions](#icon-additions)
8. [File Map](#file-map)
9. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Feature 1: Document Storage per Evento

### Purpose

Every event accumulates documents: signed contracts, approved quotes, event programs, presentations, photos, authorization forms. Currently these live in email chains and WhatsApp groups. This feature centralizes them per event with upload, preview, and download.

### Supabase Storage

**Bucket:** `event-documents`

Configuration:
- **Public:** No (private bucket, accessed via signed URLs)
- **Max file size:** 10 MB (enforced both client-side and via Supabase Storage policy)
- **Allowed MIME types:** `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `image/jpeg`, `image/png`
- **Path structure:** `{event_id}/{uuid}_{original_filename}`

The `{uuid}` prefix prevents filename collisions when multiple users upload files with the same name. The original filename is preserved in the `event_documents` table for display.

**Storage RLS policies:**
- **SELECT:** Authenticated users (same as event RLS — if you can see the event, you can see its documents)
- **INSERT:** Authenticated users
- **DELETE:** Authenticated users (ownership enforced via `event_documents` table, not storage policies — see Storage RLS section below)

### Database Schema

```sql
-- New enum
CREATE TYPE tipo_documento AS ENUM (
  'contratto',
  'preventivo_firmato',
  'programma',
  'presentazione',
  'foto',
  'autorizzazione',
  'altro'
);

-- New table
CREATE TABLE event_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,                              -- Original filename
  tipo_documento tipo_documento NOT NULL DEFAULT 'altro',
  file_path TEXT NOT NULL,                         -- Storage path: {event_id}/{uuid}_{filename}
  file_size BIGINT NOT NULL,                       -- Bytes
  mime_type TEXT NOT NULL,                          -- e.g. 'application/pdf'
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  note TEXT,                                       -- Optional description
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_event_documents_event_id ON event_documents(event_id);
CREATE INDEX idx_event_documents_uploaded_by ON event_documents(uploaded_by);

-- RLS
ALTER TABLE event_documents ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read documents for events they can access
CREATE POLICY "event_documents_select" ON event_documents
  FOR SELECT TO authenticated USING (true);

-- Everyone authenticated can insert
CREATE POLICY "event_documents_insert" ON event_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

-- Delete: only uploader or admin
CREATE POLICY "event_documents_delete" ON event_documents
  FOR DELETE TO authenticated USING (
    auth.uid() = uploaded_by
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.ruolo IN ('admin', 'direzione')
    )
  );
```

### Constants Addition (`src/lib/constants.js`)

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

// Max upload size in bytes (10 MB)
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024

// Allowed file extensions for upload validation
export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.jpg', '.jpeg', '.png']

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
]
```

### Icons Addition (`src/lib/icons.js`)

```js
// Add to imports:
import { FileText, FileImage, FileSpreadsheet, File, Upload, Download, Trash2, Eye, Paperclip } from 'lucide-react'

// New category:
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
}
```

Note: Some of these icons (`FileText`, `Download`, `Upload`, `Trash2`, `Eye`) may already exist in the icon registry under other categories. Check before adding duplicates — reuse existing entries where possible and only add the `DOCUMENTO_ICONS` map pointing to them.

### Zustand Store: `src/hooks/useDocuments.js`

```js
export const useDocumentsStore = create((set, get) => ({
  documents: [],
  loading: false,
  error: null,

  fetchEventDocuments: async (eventId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('event_documents')
      .select('*, uploader:users!event_documents_uploaded_by_fkey(id, nome, cognome)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    set({ documents: data || [], loading: false, error: error?.message })
    return { data, error }
  },

  uploadDocument: async (eventId, file, tipoDocumento, note, userId) => {
    // 1. Validate file size + type (client-side)
    // 2. Generate storage path: `${eventId}/${crypto.randomUUID()}_${file.name}`
    // 3. Upload to Supabase Storage bucket 'event-documents'
    // 4. Insert row into event_documents table
    // 5. Re-fetch documents list
    // Returns { data, error }
  },

  deleteDocument: async (id, filePath) => {
    // 1. Delete from Supabase Storage
    // 2. Delete from event_documents table
    // 3. Remove from local state
    // Returns { error }
  },

  getSignedUrl: async (filePath) => {
    // Generate a 1-hour signed URL for download/preview
    // Returns { data: { signedUrl }, error }
  },
}))
```

**Store action details:**

#### `uploadDocument(eventId, file, tipoDocumento, note, userId)`

```
1. if (file.size > MAX_UPLOAD_SIZE) return { error: 'Il file supera il limite di 10 MB' }
2. if (!ALLOWED_MIME_TYPES.includes(file.type)) return { error: 'Tipo di file non supportato' }
3. const path = `${eventId}/${crypto.randomUUID()}_${file.name}`
4. const { error: uploadError } = await supabase.storage.from('event-documents').upload(path, file)
5. if (uploadError) return { error: uploadError.message }
6. const { data, error } = await supabase.from('event_documents').insert({
     event_id: eventId,
     nome: file.name,
     tipo_documento: tipoDocumento,
     file_path: path,
     file_size: file.size,
     mime_type: file.type,
     uploaded_by: userId,
     note: note || null,
   }).select('*, uploader:users!event_documents_uploaded_by_fkey(id, nome, cognome)').single()
7. if (!error) set(s => ({ documents: [data, ...s.documents] }))
8. return { data, error: error?.message }
```

#### `deleteDocument(id, filePath)`

```
1. await supabase.storage.from('event-documents').remove([filePath])
2. const { error } = await supabase.from('event_documents').delete().eq('id', id)
3. if (!error) set(s => ({ documents: s.documents.filter(d => d.id !== id) }))
4. return { error }
```

#### `getSignedUrl(filePath)`

```
1. const { data, error } = await supabase.storage.from('event-documents').createSignedUrl(filePath, 3600)
2. return { data, error }
```

### Component: `EventDocumentiTab`

**File:** `src/components/eventi/EventDocumentiTab.jsx`

**Props:** `{ event }`

**Layout:**

```
+----------------------------------------------------------------------+
|  Documenti                                          [+ Carica file]  |
+----------------------------------------------------------------------+
|                                                                       |
|  +--[ Drop Zone ]-----------------------------------------------+    |
|  |                                                               |    |
|  |  [Upload icon]                                                |    |
|  |  Trascina i file qui oppure [clicca per selezionare]         |    |
|  |  PDF, DOCX, XLSX, JPG, PNG — max 10 MB                      |    |
|  |                                                               |    |
|  +---------------------------------------------------------------+    |
|                                                                       |
|  Filtro: [Tutti] [Contratti] [Preventivi] [Programmi] [Foto] [...]   |
|                                                                       |
|  +--[ Document Card ]--------------------------------------------+   |
|  |  [FileText]  Contratto_Congresso_2026.pdf                     |   |
|  |              Contratto · 2.3 MB · Caricato da Mario Rossi     |   |
|  |              24 mar 2026                                      |   |
|  |                                     [Anteprima] [Scarica] [X] |   |
|  +----------------------------------------------------------------+  |
|                                                                       |
|  +--[ Document Card ]--------------------------------------------+   |
|  |  [FileImage]  Foto_sala.jpg                                   |   |
|  |               Foto · 1.1 MB · Caricato da Federica Bianchi    |   |
|  |               23 mar 2026                                     |   |
|  |                                     [Anteprima] [Scarica] [X] |   |
|  +----------------------------------------------------------------+  |
|                                                                       |
+----------------------------------------------------------------------+
```

**Behavior:**

1. **Drop Zone:** Visible at top of tab. Supports drag & drop (`onDragOver`, `onDragEnter`, `onDrop`) and click-to-browse (`<input type="file" multiple>`).
2. **Upload flow:**
   - User drops files or selects via picker
   - For each file: validate size + type
   - Show upload modal with:
     - File name (read-only)
     - Tipo documento dropdown (auto-detect: `.pdf` defaults to `altro`, `.jpg`/`.png` to `foto`)
     - Note (optional textarea)
     - Upload button (shows progress spinner)
   - On success: toast "File caricato", file appears in list
   - On error: toast with error message
   - Multiple files: upload sequentially, show progress "Caricamento 2 di 5..."
3. **Filter chips:** `ChipFilter` component with `TIPO_DOCUMENTO` values. Filters the local list (no server call).
4. **Document card:**
   - File type icon from `DOCUMENTO_ICONS` map
   - Filename (truncated with `...` if > 40 chars), tipo badge (`StatusPill`), file size (formatted: KB/MB), uploader name, date (`formatDate`)
   - Actions: Anteprima (eye icon), Scarica (download icon), Elimina (trash icon, with `ConfirmDialog`)
5. **Preview:**
   - PDFs: open in new tab via signed URL (`window.open(signedUrl, '_blank')`)
   - Images (JPG/PNG): open in `Modal` with `<img>` tag, sized to fit viewport
   - DOCX/XLSX: no preview, only download (show toast "Anteprima non disponibile per questo formato, scaricamento in corso...")
6. **Download:** Generate signed URL, open in new tab or trigger download via `<a download>` trick:
   ```js
   const a = document.createElement('a')
   a.href = signedUrl
   a.download = document.nome
   a.click()
   ```
7. **Delete:** `ConfirmDialog` with "Eliminare {filename}? L'azione non puo essere annullata." Delete button only visible to uploader (compare `uploaded_by` with `auth.uid()`) or admin/direzione role.
8. **Empty state:** `EmptyState` with title "Nessun documento" and description "Carica contratti, programmi, foto e altri documenti dell'evento."

**Accessibility:**
- Drop zone: `role="button"`, `tabIndex={0}`, `onKeyDown` triggers file picker on Enter/Space
- File input: visually hidden but accessible (`sr-only`)
- Delete button: `aria-label="Elimina {filename}"`
- Preview button: `aria-label="Anteprima {filename}"`

### Upload Modal Component

**File:** Part of `EventDocumentiTab.jsx` (internal component, < 80 lines)

```
+--[ Modal: Carica documento ]-------------------+
|                                                  |
|  File: Contratto_Congresso_2026.pdf (2.3 MB)   |
|                                                  |
|  Tipo documento:                                 |
|  [  Contratto                          v ]      |
|                                                  |
|  Note (opzionale):                               |
|  [ _________________________________________ ]  |
|                                                  |
|  [Annulla]                     [Carica file]    |
+--------------------------------------------------+
```

When uploading multiple files, show a list of files with individual tipo selectors:

```
+--[ Modal: Carica 3 documenti ]------------------+
|                                                   |
|  1. Contratto.pdf (2.3 MB)  [Contratto     v]   |
|  2. Foto_sala.jpg (1.1 MB)  [Foto          v]   |
|  3. Programma.docx (0.5 MB) [Programma     v]   |
|                                                   |
|  [Annulla]                     [Carica tutti]    |
+---------------------------------------------------+
```

### File Size Formatting Utility

Add to a new file `src/lib/format-utils.js` (NOT `date-utils.js` — that file is for date formatting only, per single-responsibility):

```js
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
```

### MIME Type Auto-Detection for Tipo Documento

```js
function guessDocumentType(mimeType, filename) {
  if (mimeType === 'image/jpeg' || mimeType === 'image/png') return 'foto'
  if (filename.toLowerCase().includes('contratto')) return 'contratto'
  if (filename.toLowerCase().includes('preventivo')) return 'preventivo_firmato'
  if (filename.toLowerCase().includes('programma')) return 'programma'
  if (filename.toLowerCase().includes('autorizzazione')) return 'autorizzazione'
  return 'altro'
}
```

---

## Feature 2: Packing List (Lista Preparazione)

### Purpose

Warehouse staff (Ivan, primarily) need a printable checklist of materials to physically pack for each event. This is currently done via email/WhatsApp. The packing list aggregates from the event's confirmed material list and adds checkbox tracking.

### Data Source

The packing list is derived from existing data — no new database tables needed for the core list. It pulls from:

- `event_materials` WHERE `event_id = X` AND `stato IN ('approvato', 'in_preparazione')` — the confirmed material list. **Important:** This filtered query must be a dedicated store action (e.g., `fetchApprovedEventMaterials` in `usePackingListStore`), not a client-side filter on the full material list, to avoid fetching unnecessary data and to ensure correctness.
- `events` — event details (title, dates, venue, shipping address)
- `products` — product details (name, brand, type)
- `kit_contents` — contents of demo kits (for expanded view)

### New Database Table: `packing_list_items`

For manual items and packed-status tracking:

```sql
CREATE TABLE packing_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_material_id UUID REFERENCES event_materials(id) ON DELETE CASCADE,  -- NULL for manual items
  descrizione TEXT NOT NULL,                      -- Auto-filled from product name, or manual entry
  quantita INTEGER NOT NULL DEFAULT 1,
  imballato BOOLEAN NOT NULL DEFAULT false,       -- Packed checkbox
  imballato_da UUID REFERENCES auth.users(id),
  imballato_at TIMESTAMPTZ,
  note TEXT,
  ordine INTEGER NOT NULL DEFAULT 0,              -- Sort order
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_packing_list_event_id ON packing_list_items(event_id);

ALTER TABLE packing_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packing_list_select" ON packing_list_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "packing_list_insert" ON packing_list_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "packing_list_update" ON packing_list_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "packing_list_delete" ON packing_list_items
  FOR DELETE TO authenticated USING (true);
```

### Zustand Store: `src/hooks/usePackingList.js`

```js
export const usePackingListStore = create((set, get) => ({
  items: [],
  loading: false,

  generatePackingList: async (eventId) => {
    // 1. Fetch event_materials with stato in (approvato, in_preparazione)
    // 2. Fetch existing packing_list_items for this event
    // 3. For each event_material not already in packing list:
    //    - Insert a packing_list_item with event_material_id, descrizione from product name
    //    - For demo_kit type: also insert sub-items from kit_contents
    // 4. Return merged list
  },

  fetchPackingList: async (eventId) => {
    // Fetch packing_list_items with joins to event_materials + products
  },

  togglePacked: async (id, packed, userId) => {
    // Update imballato, imballato_da, imballato_at
  },

  addManualItem: async (eventId, descrizione, quantita, note) => {
    // Insert with event_material_id = null
  },

  removeItem: async (id) => {
    // Delete (only manual items — items linked to event_materials show a warning)
  },

  reorderItems: async (items) => {
    // Batch update ordine field
  },
}))
```

### Component: `EventPackingList`

**File:** `src/components/eventi/EventPackingList.jsx`

**Entry point:** Accessible from:
1. The Preparazione tab — a "Lista preparazione" button
2. The Documenti tab — a "Genera lista preparazione" action
3. EventiDetail action menu (top-right) — "Stampa lista preparazione"

**Layout:**

```
+----------------------------------------------------------------------+
|  Lista Preparazione — SICM Workshop Milano                           |
|  17-19 mar 2026                                                       |
|  Spedizione: Hotel Marriott, Via Roma 12, Milano                      |
+----------------------------------------------------------------------+
|                                                                       |
|  [Genera da lista materiale]              [+ Aggiungi voce manuale]  |
|                                                                       |
|  MATERIALE CONFERMATO (12 di 15 imballati)                           |
|  ─────────────────────────────────────────────                       |
|  [x] Kit Trauma Superiore (Stryker)         x2                      |
|      Contenuto: Placca LCP 3.5, Viti 3.5x20, Viti 3.5x24...        |
|  [x] Kit Polso Volare (Zimmer)              x1                      |
|      Contenuto: Placca Volare, Viti bloccate 2.4, Punte...          |
|  [ ] Strumentario Spalla (DePuy)            x1                      |
|  [ ] Montaggio Anca Standard                x3                      |
|                                                                       |
|  VOCI MANUALI                                                        |
|  ─────────────────────────────────────────────                       |
|  [ ] Brochure prodotto nuova linea          x50                      |
|  [ ] Cavetto HDMI 3m                        x2     [Elimina]        |
|                                                                       |
|  ─────────────────────────────────────────────                       |
|  Totale: 14 di 17 imballati                                          |
|                                                                       |
|  [Stampa lista]                                                       |
+----------------------------------------------------------------------+
```

**Behavior:**

1. **Generate from material list:** Button triggers `generatePackingList()`. Shows a confirmation if items already exist ("Rigenerare la lista? Le voci manuali verranno mantenute.").
2. **Checkbox per item:** Click toggles `imballato`. Records who packed it and when. Checked items show a subtle strikethrough + green check.
3. **Kit expansion:** For `demo_kit` products, show expandable contents below the item name (from `kit_contents` table). Each kit piece is informational only — the checkbox is on the kit level, not individual pieces.
4. **Manual items:** "Aggiungi voce manuale" opens an inline form: descrizione (required), quantita (default 1), note (optional).
5. **Progress bar:** `ProgressIndicator` component showing `{packed}/{total} imballati` with percentage.
6. **Grouping:** Items grouped by:
   - "Materiale confermato" (linked to event_materials)
   - "Voci manuali" (event_material_id is null)
   Within each group, sorted by `ordine`.

### Print Layout

**CSS `@media print` rules** (add to `src/index.css`):

```css
@media print {
  /* Hide app shell */
  nav, .sidebar, .bottom-bar, .mobile-header, .breadcrumb { display: none !important; }

  /* Hide interactive elements */
  button:not(.print-visible), input[type="checkbox"], .no-print { display: none !important; }

  /* Show print-only checkbox indicators */
  .print-checkbox::before {
    content: '[ ]';
    font-family: monospace;
    margin-right: 8px;
  }
  .print-checkbox.checked::before {
    content: '[X]';
  }

  /* Full width, no padding */
  main { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }

  /* Page header with Mikai branding */
  .print-header { display: block !important; }

  /* Prevent page breaks inside items */
  .packing-item { break-inside: avoid; }
}
```

The "Stampa lista" button calls `window.print()`. The print stylesheet hides the app shell and shows a clean, printable version with:
- Mikai logo (embedded as base64 in print header to avoid CORS)
- Event title, dates, shipping address
- Checklist with square boxes (not browser checkboxes)
- Footer: "Generata il {date} da Eventi Mikai"

### PDF Export Alternative

For users who want a PDF file (not just browser print):

- Use `window.print()` as primary — Chrome/Edge "Save as PDF" handles this well
- No dedicated PDF library needed for packing list (unlike the Dossier — see Feature 4)
- The print stylesheet ensures the output is clean

---

## Feature 3: Export Excel/CSV

### Purpose

Every list page should allow exporting visible data to Excel. This enables back-office staff to share data with external parties, build reports in Excel, or archive snapshots.

### Library

**Excel generation library:** Client-side Excel generation.

> **License note:** SheetJS (`xlsx`) Community Edition uses the Apache 2.0 license, but its newer versions have moved to a custom non-OSI license. Consider using `exceljs` (MIT license) as an alternative if license compliance is a concern. The API differs but functionality is equivalent for our use case.

Add to `package.json` (choose one):
```json
"exceljs": "^4.4.0"    // MIT license — preferred
// OR
"xlsx": "^0.18.5"      // Apache 2.0 (older versions) — check license of specific version
```

The code examples below use the SheetJS API. If using `exceljs`, adapt the `exportToExcel` utility accordingly (the column/data abstraction layer remains the same).

### Export Utility: `src/lib/export-utils.js`

```js
import * as XLSX from 'xlsx'
import { formatDayISO } from './date-utils'

/**
 * Generate and download an Excel file from tabular data.
 *
 * @param {Object} options
 * @param {string} options.filename - Base name (without extension)
 * @param {string} options.sheetName - Sheet tab name
 * @param {Array<{header: string, key: string, width?: number, format?: Function}>} options.columns
 * @param {Array<Object>} options.data - Array of row objects
 */
export function exportToExcel({ filename, sheetName, columns, data }) {
  const headers = columns.map(c => c.header)
  const rows = data.map(row =>
    columns.map(col => {
      const value = getNestedValue(row, col.key)
      return col.format ? col.format(value, row) : value ?? ''
    })
  )

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Set column widths
  ws['!cols'] = columns.map(col => ({ wch: col.width || 20 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Dati')

  const dateStr = formatDayISO(new Date())
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`)
}

/**
 * Access nested properties: 'promotore.nome' -> row.promotore.nome
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}
```

### Export Button Component: `ExportButton`

**File:** `src/components/ui/ExportButton.jsx`

```jsx
export function ExportButton({ onClick, loading, label = 'Esporta Excel' })
```

A secondary `Button` with a spreadsheet icon. Shows a spinner when generating.

Placed in `PageHeader` `actions` (plural) prop on each list page.

> **Note:** `ContattiList.jsx` currently passes `action` (singular) to `PageHeader`, which is incorrect — the correct prop name is `actions` (plural). As part of this work, rename the prop in `ContattiList.jsx` to `actions` to align with the `PageHeader` API.

### Per-Page Column Definitions

Each list page defines its own column config and passes filtered data to `exportToExcel`.

#### EventiList Export

```js
const EXPORT_COLUMNS_EVENTI = [
  { header: 'Titolo', key: 'titolo', width: 30 },
  { header: 'Tipo', key: 'tipo_evento', format: v => TIPO_EVENTO[v] || v, width: 15 },
  { header: 'Stato', key: 'stato', format: v => STATO_EVENTO[v] || v, width: 20 },
  { header: 'Data inizio', key: 'data_inizio', format: v => formatDate(v), width: 15 },
  { header: 'Data fine', key: 'data_fine', format: v => formatDate(v), width: 15 },
  { header: 'Luogo', key: 'luogo', width: 25 },
  { header: 'Promotore', key: 'promotore', format: (v) => v ? `${v.nome} ${v.cognome}` : '', width: 20 },
  { header: 'Area Manager', key: 'manager', format: (v) => v ? `${v.nome} ${v.cognome}` : '', width: 20 },
  { header: 'Budget previsto', key: 'budget_previsto', width: 15 },
  { header: 'Note', key: 'note', width: 30 },
]
```

#### ContattiList Export

```js
const EXPORT_COLUMNS_CONTATTI = [
  { header: 'Cognome', key: 'cognome', width: 20 },
  { header: 'Nome', key: 'nome', width: 20 },
  { header: 'Tipo', key: 'tipo_contatto', format: v => TIPO_CONTATTO[v] || v, width: 15 },
  { header: 'Azienda', key: 'azienda', width: 25 },
  { header: 'Email', key: 'email', width: 30 },
  { header: 'Telefono', key: 'telefono', width: 18 },
  { header: 'Citta', key: 'citta', width: 20 },
  { header: 'Zona', key: 'zona.nome', width: 15 },
  { header: 'Proprietario', key: 'proprietario', format: (v) => v ? `${v.nome} ${v.cognome}` : '', width: 20 },
]
```

#### MaterialeList Export

```js
const EXPORT_COLUMNS_MATERIALI = [
  { header: 'Nome', key: 'nome', width: 30 },
  { header: 'Codice inventario', key: 'codice_inventario', width: 18 },
  { header: 'Tipo', key: 'tipo', format: v => TIPO_MATERIALE[v] || v, width: 15 },
  { header: 'Posizione', key: 'posizione_attuale', format: v => POSIZIONE_MATERIALE[v] || v, width: 18 },
  { header: 'Prodotto', key: 'product.nome', width: 25 },
  { header: 'Brand', key: 'product.brand.nome', width: 20 },
]
```

#### CostiPage Export (Preventivi)

```js
const EXPORT_COLUMNS_PREVENTIVI = [
  { header: 'Evento', key: 'evento.titolo', width: 30 },
  { header: 'Fornitore', key: 'fornitore_ref', format: (v, row) => v ? `${v.nome} ${v.cognome}` : row.fornitore_nome || '', width: 25 },
  { header: 'Descrizione', key: 'descrizione', width: 30 },
  { header: 'Importo', key: 'importo', width: 12 },
  { header: 'Stato', key: 'stato', format: v => STATO_PREVENTIVO[v] || v, width: 15 },
  { header: 'Data', key: 'created_at', format: v => formatDate(v), width: 15 },
]
```

#### LogisticaPage Export (Hotels + Trasporti)

The export button is page-level (not per sub-tab) and always exports both sheets — Hotel and Trasporti — regardless of which sub-tab is currently active. This gives a complete logistics snapshot in one file.

Export as two sheets in the same Excel file:

```js
// Sheet 1: Hotel
const EXPORT_COLUMNS_HOTEL = [
  { header: 'Evento', key: 'evento.titolo', width: 25 },
  { header: 'Persona', key: '_personName', width: 20 },  // computed field
  { header: 'Hotel', key: 'nome_hotel', width: 25 },
  { header: 'Check-in', key: 'check_in', format: v => formatDate(v), width: 15 },
  { header: 'Check-out', key: 'check_out', format: v => formatDate(v), width: 15 },
  { header: 'Stato', key: 'stato', format: v => STATO_PRENOTAZIONE[v] || v, width: 15 },
  { header: 'Note', key: 'note', width: 25 },
]

// Sheet 2: Trasporti
const EXPORT_COLUMNS_TRASPORTI = [
  { header: 'Evento', key: 'evento.titolo', width: 25 },
  { header: 'Persona', key: '_personName', width: 20 },
  { header: 'Direzione', key: 'direzione', format: v => DIREZIONE_TRASPORTO[v] || v, width: 12 },
  { header: 'Mezzo', key: 'mezzo', format: v => MEZZO_TRASPORTO[v] || v, width: 12 },
  { header: 'Codice', key: 'codice', width: 18 },
  { header: 'Orario', key: 'orario', format: v => formatDateTime(v), width: 20 },
  { header: 'Stato', key: 'stato', format: v => STATO_PRENOTAZIONE[v] || v, width: 15 },
  { header: 'Note', key: 'note', width: 25 },
]
```

For multi-sheet export, extend `exportToExcel` to accept an array of sheet configs:

```js
export function exportToExcelMultiSheet({ filename, sheets }) {
  const wb = XLSX.utils.book_new()
  for (const { sheetName, columns, data } of sheets) {
    const headers = columns.map(c => c.header)
    const rows = data.map(row =>
      columns.map(col => {
        const value = getNestedValue(row, col.key)
        return col.format ? col.format(value, row) : value ?? ''
      })
    )
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = columns.map(col => ({ wch: col.width || 20 }))
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }
  const dateStr = formatDayISO(new Date())
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`)
}
```

### UX Flow

1. User is on any list page (e.g., EventiList)
2. Applies filters (search, stato, tipo, etc.)
3. Clicks "Esporta Excel" button in PageHeader
4. The export function receives the **already-filtered** data from the Zustand store (or local filtered state)
5. Excel file downloads immediately (< 1 second for typical data volumes)
6. Toast: "File esportato: eventi_2026-03-24.xlsx"

**Key rule:** Export what you see. The filtered data in the component is what gets exported — not a fresh server query. This ensures WYSIWYG behavior and respects RLS (users only export what they can see).

---

## Feature 4: Event Dossier PDF

### Purpose

A complete single-document summary of an event, suitable for:
- Printing and bringing to the event
- Archiving after the event is concluded
- Sharing with management for review
- Compliance documentation

### Library

**jsPDF + jspdf-autotable:** Client-side PDF generation with table support.

Add to `package.json`:
```json
"jspdf": "^2.5.2",
"jspdf-autotable": "^3.8.4"
```

### Entry Point

Accessible from EventiDetail via:
1. A button in the existing custom header markup (EventiDetail uses its own header with status flow, NOT `PageHeader` — so the dossier PDF button goes alongside the existing action buttons in that header area): "Genera dossier PDF"
2. Available only for events in states: `confermato`, `in_preparazione`, `pronto`, `in_corso`, `concluso` (not `proposto`, `cancellato`, `rifiutato` — those are incomplete)

### PDF Content Sections

The dossier is generated client-side by fetching all event data and composing the PDF. It contains:

```
+===================================================================+
|                                                                     |
|  [Mikai Logo]                                                       |
|                                                                     |
|  DOSSIER EVENTO                                                     |
|  SICM Workshop Avanzato — Chirurgia del Polso                      |
|  17-19 marzo 2026 · Milano                                         |
|                                                                     |
+===================================================================+
|                                                                     |
|  1. INFORMAZIONI GENERALI                                          |
|  ──────────────────────                                             |
|  Tipo:           Workshop                                           |
|  Modalita:       Evento organizzato da noi                          |
|  Stato:          In preparazione                                    |
|  Promotore:      Mario Rossi                                        |
|  Area Manager:   Laura Verdi                                        |
|  Luogo:          Hotel Marriott, Milano                             |
|  Sede fornitore: Clinica Universitaria                              |
|  Budget:         € 15.000                                           |
|  Certificato:    Si                                                  |
|  Note:           Workshop avanzato su tecniche mini-invasive...     |
|                                                                     |
|  2. STAFF (5 persone)                                               |
|  ──────────────────────                                             |
|  | Nome              | Ruolo         | Confermato |                 |
|  |-------------------|---------------|------------|                 |
|  | Mario Rossi       | Commerciale   | Si         |                 |
|  | Laura Verdi       | Responsabile  | Si         |                 |
|  | Federica Bianchi  | Staff         | Si         |                 |
|  | Ivan Neri         | Staff         | No         |                 |
|  | Nicola Musso      | Marketing     | Si         |                 |
|                                                                     |
|  3. PARTECIPANTI (12 persone)                                       |
|  ──────────────────────                                             |
|  | Nome              | Tipo          | Azienda    | Stato    |      |
|  |-------------------|---------------|------------|----------|      |
|  | Dr. Bianchi       | Relatore est. | Osp. Sacco | Conferm. |     |
|  | Dr. Rossi         | Discente      | ASL Roma   | Invitato |     |
|  | ...               |               |            |          |      |
|                                                                     |
|  4. PROGRAMMA                                                       |
|  ──────────────────────                                             |
|  | Orario      | Attivita             | Fornitore       | Conf. |  |
|  |-------------|----------------------|-----------------|-------|  |
|  | 09:00-10:30 | Sessione chirurgica  | -               | Si    |  |
|  | 10:30-11:00 | Coffee break         | Catering Milano | Si    |  |
|  | 11:00-13:00 | Sessione pratica     | -               | Si    |  |
|  | 13:00-14:00 | Pranzo               | Catering Milano | No    |  |
|                                                                     |
|  5. MATERIALE (8 prodotti)                                          |
|  ──────────────────────                                             |
|  | Prodotto                | Brand    | Qta | Stato       |         |
|  |-------------------------|----------|-----|-------------|         |
|  | Kit Trauma Superiore    | Stryker  | 2   | Confermato  |         |
|  | Kit Polso Volare        | Zimmer   | 1   | Confermato  |         |
|  | Strumentario Spalla     | DePuy    | 1   | In attesa   |         |
|                                                                     |
|  6. LOGISTICA                                                       |
|  ──────────────────────                                             |
|  Indirizzo spedizione: Hotel Marriott, Via Roma 12, 20100 Milano   |
|                                                                     |
|  Hotel:                                                              |
|  | Persona          | Hotel           | Check-in  | Stato    |      |
|  |------------------|-----------------|-----------|----------|      |
|  | Mario Rossi      | Marriott Milano | 16 mar    | Prenotato|     |
|  | ...              |                 |           |          |      |
|                                                                     |
|  Trasporti:                                                          |
|  | Persona          | Dir.  | Mezzo | Codice  | Orario          |  |
|  |------------------|-------|-------|---------|-----------------|  |
|  | Mario Rossi      | And.  | Treno | FR9728  | 16 mar ore 12:30|  |
|  | ...              |       |       |         |                 |  |
|                                                                     |
|  7. COSTI                                                            |
|  ──────────────────────                                             |
|  | Fornitore          | Descrizione      | Importo | Stato     |   |
|  |--------------------|------------------|---------|-----------|   |
|  | Catering Milano    | Servizio catering| € 2.500 | Approvato |  |
|  | Hotel Marriott     | 5 camere x 2 notti| € 3.000| In attesa|   |
|  |                    |                  |---------|           |   |
|  |                    |   Totale preventi| € 5.500 |           |   |
|  |                    |   Budget previsto| €15.000  |           |   |
|                                                                     |
|  8. STATO PREPARAZIONE                                              |
|  ──────────────────────                                             |
|  | Attivita                      | Stato     | Scadenza | Resp.  | |
|  |-------------------------------|-----------|----------|--------|  |
|  | Conferma sala                 | Completata| 1 mar    | Feder. |  |
|  | Invio inviti                  | In corso  | 3 mar    | Nicola |  |
|  | Prenota hotel staff           | Da fare   | 10 mar   | Feder. |  |
|                                                                     |
+===================================================================+
|  Generato il 24 mar 2026 · Eventi Mikai                            |
+===================================================================+
```

### Generator: `src/lib/generate-dossier.js`

```js
/**
 * Generate an event dossier PDF.
 *
 * @param {Object} params
 * @param {Object} params.event - Full event object
 * @param {Array} params.staff - Event staff with user joins
 * @param {Array} params.participants - Event participants with contact joins
 * @param {Array} params.subActivities - Sub-activities (programma)
 * @param {Array} params.materials - Event material list with product joins
 * @param {Array} params.hotels - Hotel bookings
 * @param {Array} params.trasporti - Transport bookings
 * @param {Array} params.preventivi - Cost quotes
 * @param {Array} params.activities - Readiness activities (preparazione)
 * @returns {jsPDF} The PDF document (caller triggers .save())
 */
export function generateEventDossier(params) { ... }
```

**Implementation approach:**

1. Create jsPDF instance with A4 format, portrait orientation
2. Add Mikai logo (embedded as base64 data URL — pre-converted from SVG/PNG)
3. For each section:
   - Add section title with blue underline (Mikai brand color `#3296dc`)
   - Add key-value pairs or tables using `jspdf-autotable`
   - Track Y position, add page break when needed
4. Footer on each page: "Generato il {date} — Eventi Mikai — Pagina {n} di {total}"
5. Return the PDF object

**Branding:**
- Header: Mikai logo (left) + "DOSSIER EVENTO" (right)
- Section titles: Mikai blue (`#3296dc`) with thin underline
- Table headers: Light blue background (`#e8f4fc`)
- Body text: Dark gray (`#374151`)
- Font: Helvetica (built into jsPDF, no external fonts needed)

### Data Fetching

The dossier button triggers a parallel fetch of all required data:

```js
async function handleGenerateDossier(eventId) {
  setGenerating(true)
  try {
    const [
      { data: staff },
      { data: participants },
      { data: subActivities },
      { data: materials },
      // hotels + trasporti from logistics store
      // preventivi from costs store
      // activities from events store (readiness)
    ] = await Promise.all([
      staffStore.fetchEventStaff(eventId),
      participantsStore.fetchEventParticipants(eventId),
      useSubActivitiesStore.fetchEventActivities(eventId),
      materialsStore.fetchEventMaterialList(eventId),
      logisticsStore.fetchEventLogistics(eventId),
      costsStore.fetchEventPreventivi(eventId),
    ])

    const doc = generateEventDossier({
      event,
      staff: staffStore.staff,
      participants: participantsStore.participants,
      subActivities: useSubActivitiesStore.activities,
      materials,
      hotels: logisticsStore.hotels,
      trasporti: logisticsStore.trasporti,
      preventivi: costsStore.preventivi,
      activities: [], // readiness activities if available
    })

    doc.save(`dossier_${event.titolo.replace(/\s+/g, '_')}_${formatDayISO(new Date())}.pdf`)
    addToast('Dossier PDF generato', 'success')
  } catch (err) {
    addToast('Errore nella generazione del dossier', 'error')
  } finally {
    setGenerating(false)
  }
}
```

### Permissions

Anyone who can view the event can generate the dossier. No additional permission needed — the data shown is the same as what's visible in the event tabs.

### Sections Conditional Inclusion

- **Staff:** Always included (even if empty — shows "Nessuno staff assegnato")
- **Partecipanti:** Always included
- **Programma:** Included if sub-activities exist for this event
- **Materiale:** Included if `modalita !== 'contributo'` (same as tab visibility rule)
- **Logistica:** Always included
- **Costi:** Included only if user has `gestione_costi` or `approva_preventivi` permission (same as tab visibility). If excluded, section is omitted entirely.
- **Preparazione:** Included if readiness activities exist

---

## New Dependencies

```json
{
  "exceljs": "^4.4.0",
  "jspdf": "^2.5.2",
  "jspdf-autotable": "^3.8.4"
}
```

> See [Feature 3 — Library](#library) for license note on `xlsx` vs `exceljs`.

**Bundle impact:** ~300 KB gzipped for all three libraries combined. Since these are only used when the user explicitly triggers an export/generate action, consider dynamic imports:

```js
// Lazy load xlsx only when needed
const exportToExcel = async (config) => {
  const XLSX = await import('xlsx')
  // ... use XLSX
}

// Lazy load jspdf only when generating dossier
const generateDossier = async (params) => {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')
  // ... use jsPDF
}
```

This keeps the main bundle untouched and loads the libraries on-demand.

---

## Database Migrations

### Migration 1: `20260324200000_event_documents_enum.sql`

```sql
-- Separate migration for enum (PostgreSQL ADD VALUE transaction rule)
DO $$ BEGIN
  CREATE TYPE tipo_documento AS ENUM (
    'contratto', 'preventivo_firmato', 'programma',
    'presentazione', 'foto', 'autorizzazione', 'altro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

### Migration 2: `20260324200001_event_documents_table.sql`

```sql
CREATE TABLE IF NOT EXISTS event_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo_documento tipo_documento NOT NULL DEFAULT 'altro',
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_documents_event_id ON event_documents(event_id);
CREATE INDEX IF NOT EXISTS idx_event_documents_uploaded_by ON event_documents(uploaded_by);

ALTER TABLE event_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_documents_select" ON event_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "event_documents_insert" ON event_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "event_documents_delete" ON event_documents
  FOR DELETE TO authenticated USING (
    auth.uid() = uploaded_by
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.ruolo IN ('admin', 'direzione')
    )
  );
```

### Migration 3: `20260324200002_packing_list_items.sql`

```sql
CREATE TABLE IF NOT EXISTS packing_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_material_id UUID REFERENCES event_materials(id) ON DELETE CASCADE,
  descrizione TEXT NOT NULL,
  quantita INTEGER NOT NULL DEFAULT 1,
  imballato BOOLEAN NOT NULL DEFAULT false,
  imballato_da UUID REFERENCES auth.users(id),
  imballato_at TIMESTAMPTZ,
  note TEXT,
  ordine INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packing_list_event_id ON packing_list_items(event_id);

ALTER TABLE packing_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packing_list_select" ON packing_list_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "packing_list_insert" ON packing_list_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "packing_list_update" ON packing_list_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "packing_list_delete" ON packing_list_items
  FOR DELETE TO authenticated USING (true);
```

### Supabase Storage Bucket

Must be created via Supabase dashboard or CLI (not a SQL migration):

```bash
# Via Supabase dashboard: Storage > Create bucket
# Name: event-documents
# Public: false
# File size limit: 10485760 (10 MB)
# Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, image/jpeg, image/png
```

Storage RLS policies (set in dashboard or via SQL on `storage.objects`):

```sql
-- Allow authenticated users to read files in event-documents bucket
CREATE POLICY "event_docs_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'event-documents');

-- Allow authenticated users to upload to event-documents
CREATE POLICY "event_docs_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-documents');

-- Allow deletion for authenticated users
-- Ownership enforced via event_documents table, not storage policies.
-- The storage path structure is {event_id}/{uuid}_{filename}, so foldername(name)[1]
-- is the event_id, NOT the user ID. The app-level code in useDocumentsStore.deleteDocument()
-- checks uploaded_by against auth.uid() before calling the storage delete API.
-- Admin/direzione bypass is also handled at the app level via role check.
CREATE POLICY "event_docs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-documents');
```

---

## Icon Additions

Add to `src/lib/icons.js`:

**New imports** (check for duplicates with existing imports first):
- `Upload` (if not already imported)
- `Download` (if not already imported)
- `FileText` (if not already imported)
- `FileImage` (may need adding)
- `FileSpreadsheet` (for Excel export button)
- `Paperclip` (for document attachment indicator)
- `Printer` (for print packing list)
- `FileDown` (for dossier PDF button)

**New icon map:**
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
  preview: Eye,
  attachment: Paperclip,
  spreadsheet: FileSpreadsheet,
  print: Printer,
  dossier: FileDown,
}
```

---

## File Map

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useDocuments.js` | Zustand store for document CRUD + storage |
| `src/hooks/usePackingList.js` | Zustand store for packing list |
| `src/components/eventi/EventDocumentiTab.jsx` | Documenti tab (replaces ComingSoon) |
| `src/components/eventi/EventPackingList.jsx` | Packing list component |
| `src/components/ui/ExportButton.jsx` | Reusable export button |
| `src/lib/export-utils.js` | Excel generation utility |
| `src/lib/generate-dossier.js` | PDF dossier generation |
| `supabase/migrations/20260324200000_event_documents_enum.sql` | Enum migration |
| `supabase/migrations/20260324200001_event_documents_table.sql` | Documents table migration |
| `supabase/migrations/20260324200002_packing_list_items.sql` | Packing list table migration |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/eventi/EventiDetail.jsx` | Replace ComingSoon with `<EventDocumentiTab>` |
| `src/pages/eventi/EventiList.jsx` | Add export button |
| `src/pages/contatti/ContattiList.jsx` | Add export button |
| `src/pages/materiale/MaterialeList.jsx` | Add export button |
| `src/pages/costi/CostiPage.jsx` | Add export button |
| `src/pages/logistica/LogisticaPage.jsx` | Add export button |
| `src/lib/constants.js` | Add `TIPO_DOCUMENTO`, `TIPO_DOCUMENTO_COLORE`, upload constants |
| `src/lib/icons.js` | Add `DOCUMENTO_ICONS` map + new icon imports |
| `src/lib/format-utils.js` | **New file** — `formatFileSize()` utility (not in `date-utils.js` — single-responsibility) |
| `src/index.css` | Add `@media print` styles |
| `src/components/eventi/EventPreparazioneTab.jsx` | Add "Lista preparazione" button |
| `package.json` | Add `xlsx`, `jspdf`, `jspdf-autotable` dependencies |

---

## Edge Cases & Error Handling

### Document Upload

| Scenario | Handling |
|----------|----------|
| File exceeds 10 MB | Client-side check before upload. Toast: "Il file {name} supera il limite di 10 MB" |
| Unsupported file type | Client-side MIME check. Toast: "Formato non supportato. Usa PDF, DOCX, XLSX, JPG o PNG" |
| Upload fails (network) | Toast: "Errore nel caricamento di {name}. Riprova." Storage partial upload is auto-cleaned by Supabase. |
| Storage bucket full | Toast: "Spazio di archiviazione esaurito. Contatta l'amministratore." (Supabase free tier: 1 GB) |
| Concurrent uploads | Upload sequentially (not in parallel) to avoid race conditions. Show progress: "Caricamento 2 di 5..." |
| Delete fails | Toast: "Non e stato possibile eliminare il documento." Keep in list. |
| Signed URL expired | Re-generate on each click. URLs are 1 hour. If user sits idle > 1 hour and clicks, a new URL is generated. |
| User drops a folder | Ignore directories. Only process `File` objects from the `DataTransfer`. |
| Filename with special chars | The UUID prefix in storage path handles uniqueness. Original name preserved in DB for display. |
| Duplicate filename | Allowed — each upload gets a unique UUID prefix in storage path. List shows both with dates to distinguish. |

### Packing List

| Scenario | Handling |
|----------|----------|
| No approved materials | Show `EmptyState`: "Nessun materiale confermato. Conferma i materiali nella tab Materiale prima di generare la lista." |
| Material approved after list generated | "Genera da lista materiale" button syncs: adds new items, preserves existing packed states and manual items. |
| Material removed after packing | Packing list item stays (foreign key SET NULL behavior would be ideal, but we use CASCADE — so the packing item is also deleted). Show a note in the UI that the list may be stale if materials changed. |
| Event material list changes | Show a "Sincronizza" button if `event_materials` count differs from linked `packing_list_items` count. |
| Print with no items | Disable the "Stampa lista" button. Show hint: "Aggiungi voci alla lista prima di stampare." |

### Excel Export

| Scenario | Handling |
|----------|----------|
| Empty list (after filters) | Toast: "Nessun dato da esportare." Don't generate empty file. |
| Very large dataset (1000+ rows) | SheetJS handles this fine. May take 1-2 seconds — show loading spinner on button. |
| Special characters in data | SheetJS handles Unicode natively. No escaping needed. |
| Nested null values (e.g., promotore is null) | `getNestedValue` returns undefined, format function returns `''`. |
| Browser blocks download | Some browsers block programmatic downloads. Use `XLSX.writeFile` which creates an `<a>` click — this is not blocked. |

### Dossier PDF

| Scenario | Handling |
|----------|----------|
| Very long event (many participants) | jsPDF auto-table handles page breaks. Footer repeats on each page. |
| Missing data sections | Each section checks for data. Empty sections show "Nessun {item}" text instead of empty table. |
| Event in wrong state | Button disabled for `proposto`, `cancellato`, `rifiutato`. Tooltip: "Disponibile solo per eventi confermati o successivi." |
| PDF generation fails | Try/catch wraps entire generation. Toast: "Errore nella generazione del dossier. Riprova." |
| Logo not available | The Mikai logo is embedded as base64 in the code. If missing, skip the logo and show text "Mikai" as fallback. |
| Costi section permissions | Check user permissions before including costi section. If no access, omit entirely (no blank section). |
| Non-Latin characters | Helvetica in jsPDF supports standard Western European characters. Italian accents (e, a, i, o, u with accents) work. If we need special symbols, consider adding a custom font. |

### General

| Scenario | Handling |
|----------|----------|
| Slow network | All upload/generate actions show loading state on the button (spinner + disabled). |
| Mobile usage | Upload drop zone works as click-to-browse on mobile (drag & drop doesn't work on touch). Excel/PDF download triggers native share sheet on mobile browsers. |
| Offline | These features require network (upload, fetch signed URLs, etc.). If offline, show standard error toast. No offline support until Phase 6 PWA. |
| Supabase Storage not configured | If bucket doesn't exist, upload will fail. Error: "Servizio documenti non disponibile. Contatta l'amministratore." |

---

## Implementation Order

Recommended sequence:

1. **Migrations + Storage bucket** — database and storage setup
2. **Constants + Icons** — add new enums and icon maps
3. **Feature 3: Export Excel** — smallest scope, immediately useful, establishes the `export-utils.js` pattern
4. **Feature 1: Document Storage** — the main deliverable (store, component, upload/download/preview)
5. **Feature 2: Packing List** — builds on existing material data
6. **Feature 4: Event Dossier PDF** — most complex, builds on all other data
7. **Print styles** — CSS @media print for packing list
8. **Integration** — wire export buttons into all list pages, dossier button into EventiDetail

Each feature is independently deployable and testable.
