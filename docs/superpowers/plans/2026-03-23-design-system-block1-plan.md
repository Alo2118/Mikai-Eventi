# Design System Block 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 6 core UI components (Modal, FormField, StatusPill, ProgressIndicator, DataTable, ActionToolbar) + shared style constants, then migrate existing modals to use the new Modal.

**Architecture:** New components are additive — they don't break existing code. Each component is a focused file (<200 lines) with a clear API. Style constants centralized in `constants.js`. Modal uses `focus-trap-react` for accessibility. StatusPill uses portaled popover to avoid table cell clipping.

**Tech Stack:** React 19, TailwindCSS v4, focus-trap-react (new dependency), lucide-react via centralized Icon system.

**Spec:** `docs/superpowers/specs/2026-03-23-design-system-spec.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `package.json` | Add `focus-trap-react` |
| Modify | `src/lib/constants.js` | Add INPUT_STYLE, SELECT_STYLE, TEXTAREA_STYLE, INPUT_ERROR_STYLE |
| Create | `src/components/ui/FormField.jsx` | Label + input wrapper + error |
| Create | `src/components/ui/Modal.jsx` | Unified modal with focus trap, scroll lock, a11y |
| Modify | `src/components/ui/ConfirmDialog.jsx` | Migrate to use Modal internally |
| Modify | `src/components/eventi/LogisticaBulkModals.jsx` | Replace ModalShell with Modal |
| Modify | `src/components/contatti/BulkImportModal.jsx` | Replace custom overlay with Modal |
| Create | `src/components/ui/StatusPill.jsx` | Editable status pill with portaled popover |
| Create | `src/components/ui/ProgressIndicator.jsx` | Horizontal progress bar with label and count |
| Create | `src/components/ui/ActionToolbar.jsx` | Selection-based floating action bar |

---

## Task 1: Install focus-trap-react + Style Constants

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `src/lib/constants.js`

- [ ] **Step 1: Install focus-trap-react**

Run: `npm install focus-trap-react`

- [ ] **Step 2: Add style constants to constants.js**

Read `src/lib/constants.js`. Add at the END of the file (before the closing, after `ROLE_PERMISSION_PRESETS`):

```js
// ═══════════════════════════════════════════
// Shared input/form styling constants
// Each is a full, independent string literal — no concatenation.
// Tailwind v4 static analysis requires complete class tokens visible in source.
// ═══════════════════════════════════════════
export const INPUT_STYLE = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'
export const INPUT_ERROR_STYLE = 'w-full px-4 py-3 text-base border border-red-400 rounded-lg min-h-[48px] focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none bg-red-50'
export const SELECT_STYLE = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none bg-white'
export const TEXTAREA_STYLE = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[80px] resize-none focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/constants.js
git commit -m "feat: install focus-trap-react and add shared INPUT/SELECT/TEXTAREA style constants"
```

---

## Task 2: FormField Component

**Files:**
- Create: `src/components/ui/FormField.jsx`

- [ ] **Step 1: Create FormField**

A layout wrapper for form inputs. Renders label + children + optional error message. Does NOT inject styles — children apply `INPUT_STYLE` themselves.

```jsx
export function FormField({ label, required, error, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-sm text-red-600 mt-1" role="alert">{error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/FormField.jsx
git commit -m "feat: add FormField — label + error wrapper for form inputs"
```

---

## Task 3: Modal Component

**Files:**
- Create: `src/components/ui/Modal.jsx`

- [ ] **Step 1: Create Modal**

Unified modal with focus trap, scroll lock, accessibility, header/footer slots.

```jsx
import { useEffect, useRef } from 'react'
import FocusTrap from 'focus-trap-react'
import { Icon } from './Icon'
import { ACTION_ICONS } from '../../lib/icons'

const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-6xl',
}

export function Modal({ open, onClose, size = 'md', title, subtitle, footer, children }) {
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 8)}`).current

  // Scroll lock
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [open])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 bg-black/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={onClose}
      >
        <div
          className={`bg-white rounded-xl shadow-xl w-full ${SIZE_MAP[size] || SIZE_MAP.md} max-h-[90vh] overflow-hidden flex flex-col`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
              <div>
                <h2 id={titleId} className="text-lg font-semibold text-gray-900">{title}</h2>
                {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 min-h-[48px] min-w-[48px] flex items-center justify-center"
                aria-label="Chiudi"
              >
                <Icon icon={ACTION_ICONS.close} size={20} />
              </button>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-5 py-4 border-t border-gray-200 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </FocusTrap>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Modal.jsx
git commit -m "feat: add Modal — unified accessible modal with focus trap, scroll lock, header/footer"
```

---

## Task 4: Migrate Existing Modals to Modal

**Files:**
- Modify: `src/components/ui/ConfirmDialog.jsx`
- Modify: `src/components/eventi/LogisticaBulkModals.jsx`
- Modify: `src/components/contatti/BulkImportModal.jsx`

- [ ] **Step 1: Migrate ConfirmDialog**

Read `src/components/ui/ConfirmDialog.jsx`. Rewrite to wrap Modal internally. External prop API stays identical — no call sites change.

```jsx
import { Modal } from './Modal'

export function ConfirmDialog({ open, title, message, confirmLabel = 'Conferma', cancelLabel = 'Annulla', onConfirm, onCancel, danger = false }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      title={title}
      footer={
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 min-h-[48px] text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2.5 min-h-[48px] text-base font-medium text-white rounded-lg ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-mikai-400 hover:bg-mikai-500'}`}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-base text-gray-600">{message}</div>
    </Modal>
  )
}
```

- [ ] **Step 2: Migrate LogisticaBulkModals**

Read `src/components/eventi/LogisticaBulkModals.jsx`. Remove the internal `ModalShell` function and replace all usages with `<Modal>`:

- Add import: `import { Modal } from '../ui/Modal'`
- Replace all `<ModalShell title="..." subtitle="..." onClose={...}>` with `<Modal open={true} onClose={onClose} size="md" title="..." subtitle="...">`
- For TrasportoModal, use `size="lg"` (more fields)
- Remove the `ModalShell` function entirely

- [ ] **Step 3: Migrate BulkImportModal**

Read `src/components/contatti/BulkImportModal.jsx`. Replace the custom overlay/container with `<Modal>`:

- Add import: `import { Modal } from '../ui/Modal'`
- Replace the outer `<div className="fixed inset-0 bg-black/40 z-50 ...">` wrapper with `<Modal open={open} onClose={handleClose} size="full" title={...} subtitle={...}>`
- The inner content becomes the Modal's children
- Remove the manual header/close button (Modal provides them)

- [ ] **Step 4: Verify build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ConfirmDialog.jsx src/components/eventi/LogisticaBulkModals.jsx src/components/contatti/BulkImportModal.jsx
git commit -m "refactor: migrate ConfirmDialog, LogisticaBulkModals, BulkImportModal to use unified Modal"
```

---

## Task 5: StatusPill Component

**Files:**
- Create: `src/components/ui/StatusPill.jsx`

- [ ] **Step 1: Create StatusPill**

Editable status pill with portaled popover. Delegates to StatusBadge when not editable.

The component needs:
- When `editable={false}`: render `<StatusBadge>` directly
- When `editable={true}`: render a clickable pill that opens a portaled popover
- Popover uses `createPortal` to `document.body`
- Position computed from `getBoundingClientRect` of the pill
- Close on click outside or Escape
- Each option in the popover is min-h-[48px]

```jsx
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { StatusBadge } from './StatusBadge'

export function StatusPill({ stato, labels, colors, editable = false, onChange }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef(null)

  if (!editable) return <StatusBadge stato={stato} labels={labels} colors={colors} />

  const handleOpen = () => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left })
    setOpen(true)
  }

  const handleSelect = (newStato) => {
    onChange(newStato)
    setOpen(false)
  }

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handleClick = () => setOpen(false)
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const options = Object.entries(labels)

  return (
    <>
      <button
        ref={ref}
        onClick={(e) => { e.stopPropagation(); handleOpen() }}
        className="min-h-[48px] flex items-center cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <StatusBadge stato={stato} labels={labels} colors={colors} />
      </button>

      {open && createPortal(
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px]"
          style={{ top: pos.top, left: pos.left }}
          onClick={e => e.stopPropagation()}
          role="listbox"
        >
          {options.map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className={`w-full text-left px-4 min-h-[48px] flex items-center text-base hover:bg-gray-50 ${key === stato ? 'bg-mikai-50 font-medium' : ''}`}
              role="option"
              aria-selected={key === stato}
            >
              <StatusBadge stato={key} labels={labels} colors={colors} />
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/StatusPill.jsx
git commit -m "feat: add StatusPill — editable status indicator with portaled popover"
```

---

## Task 6: ProgressIndicator Component

**Files:**
- Create: `src/components/ui/ProgressIndicator.jsx`

- [ ] **Step 1: Create ProgressIndicator**

Horizontal progress bar with label and count. Clickable for filtering.

```jsx
export function ProgressIndicator({ label, current, total, color, onClick }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  const autoColor = pct === 100 ? 'green' : pct > 50 ? 'yellow' : 'red'
  const barColor = color || autoColor

  const colorClass = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    mikai: 'bg-mikai-400',
    gray: 'bg-gray-400',
  }[barColor] || 'bg-gray-400'

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={`w-full ${onClick ? 'cursor-pointer hover:opacity-80 min-h-[48px]' : ''} flex flex-col justify-center gap-1`}
      {...(onClick ? { 'aria-label': `${label}: ${current} di ${total}` } : {})}
    >
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}: {current}/{total}</span>
        <span className="text-gray-400">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Wrapper>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ProgressIndicator.jsx
git commit -m "feat: add ProgressIndicator — horizontal progress bar with label and count"
```

---

## Task 7: ActionToolbar Component

**Files:**
- Create: `src/components/ui/ActionToolbar.jsx`

- [ ] **Step 1: Create ActionToolbar**

Floating action bar that appears when items are selected. Gmail-style.

```jsx
import { Button } from './Button'

export function ActionToolbar({ count, actions = [], onClear }) {
  if (count === 0) return null

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 bg-mikai-50 border border-mikai-200 rounded-xl px-4 py-3 flex-wrap animate-in slide-in-from-top">
      <span className="text-sm font-medium text-mikai-700">
        {count} {count === 1 ? 'selezionato' : 'selezionati'}
      </span>
      <div className="flex gap-2 ml-auto flex-wrap">
        {actions.map((action, i) => (
          <Button key={i} variant="secondary" size="sm" onClick={action.onClick} disabled={action.disabled}>
            {action.label}
          </Button>
        ))}
        {onClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Deseleziona
          </Button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ActionToolbar.jsx
git commit -m "feat: add ActionToolbar — selection-based floating action bar"
```

---

## Task 8: Build Verification + Integration Smoke Test

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 2: Verify all imports resolve**

Check that all new components can be imported:
- `Modal` is used by `ConfirmDialog`, `LogisticaBulkModals`, `BulkImportModal`
- `StatusPill` is standalone (not yet wired to pages — that's Block 2)
- `ProgressIndicator` is standalone
- `ActionToolbar` is standalone
- `FormField` is standalone
- `INPUT_STYLE` etc. are exported from constants.js

- [ ] **Step 3: Test ConfirmDialog still works**

Start dev server (`npm run dev`). Navigate to any event detail. Try deleting a staff member from Persone tab — ConfirmDialog should open and function identically to before.

- [ ] **Step 4: Test LogisticaBulkModals still work**

Navigate to Logistica tab. Select people → click "Imposta hotel" → modal should open with the new Modal wrapper. Hotel form fields should work.

- [ ] **Step 5: Test BulkImportModal still works**

Navigate to Contatti or event Persone tab. Click "Importa" → modal should open. Grid should be functional.

- [ ] **Step 6: Final commit if any fixes needed**
