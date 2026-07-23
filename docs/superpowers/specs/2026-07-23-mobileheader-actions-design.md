# MobileHeader compact actions slot — Design

## Goal
Eliminate the duplicate mobile header on pages that render both `MobileHeader` and
`PageHeader`, without losing the `PageHeader` actions on mobile. Achieved by giving
`MobileHeader` a compact **icon-only** actions slot and re-enabling `PageHeader.mobileHidden`
on the affected pages.

## Style decision (owner-approved)
Actions in `MobileHeader` render as **icon-only** buttons (48px) with `aria-label` + `title`.
The owner chose icon-only deliberately, aware that `title` tooltips do not fire on touch
(the visible-label alternative was declined). We still apply every objective correction the
design-review panel surfaced (below), since those are independent of the icon-only choice.

## Components

### `src/components/ui/IconButton.jsx` (new)
Thin wrapper over the existing `Button` (do NOT reinvent sizing/variants). Icon-only.
- Props: `icon` (icon registry entry), `label` (string → `aria-label` + `title`, required),
  `onClick` **or** `to` (mutually exclusive — render `<Link>` when `to`, `<button>` otherwise),
  `disabled?`, `loading?`, `variant?` (default `'ghost'`/secondary as fits the header).
- Renders `<Icon icon={icon} />` inside a 48×48 touch target. Uses `<Icon>`, never lucide.
- Lives in `ui/` (generic), consumed by `MobileHeader`.

### `src/components/layout/MobileHeader.jsx` (modify)
- New optional prop `actions`: an **array of descriptors** `{ icon, label, onClick?, to?, disabled?, loading? }`
  (NOT a free JSX node — array forces cross-page consistency).
- Render after the `flex-1` title block, as `<div className="flex items-center gap-2">` of
  `IconButton`s mapped from the descriptors. `gap-2` (8px), not `gap-1`, to reduce mis-tap
  between adjacent actions (esp. destructive ones).
- Backward-compatible: all 26 existing call sites omit `actions`.

## Per-page changes (JSX only — no store changes)
For each page: add `mobileHidden` to its `<PageHeader>` AND pass `actions={[...]}` to `<MobileHeader>`.
Handlers already exist locally; icons all exist in `icons.js`.

| Page | Actions (descriptor) | Icon (must match desktop) | Notes |
|------|----------------------|---------------------------|-------|
| AdminTipoEvento | Nuova tipologia → `handleNew` | `ACTION_ICONS.add` | 1 action |
| AdminTipoProdotto | Nuova tipologia → `handleNew` | `ACTION_ICONS.add` | 1 action |
| HcpDetail | Registra trasferimento → nav `/compliance/tov/nuovo?hcp_id=<id>` | `ACTION_ICONS.add` | `to` link |
| TovDetail | Verifica → `setShowVerify(true)`; Segnala → `setShowFlag(true)` | `COMPLIANCE_ICONS.verificato`, `COMPLIANCE_ICONS.segnalato` | only when `canVerify` |
| NotifichePage | Segna lette → `markAllAsRead`; Cancella lette → `setShowDeleteConfirm(true)`; Preferenze → toggle | `ACTION_ICONS.check`, `DOCUMENTO_ICONS.delete`, `NAV_ICONS.impostazioni` | "Segna" only if `unreadCount>0`; "Cancella" only if `readCount>0` |
| LogisticaPage | Esporta → local `handleExport` (`loading=exporting`) | `DOCUMENTO_ICONS.spreadsheet` | reuse existing handler, no dup |
| ReportMaterialePage | Esporta → `handleExport({columns,rows,filename,sheetName})` (`loading=exporting`) | `DOCUMENTO_ICONS.spreadsheet` | **fix preexisting export bug** (see below) |
| DashboardOperativa | Aggiorna → `loadData` | `ACTION_ICONS.refresh` | already `mobileHidden`; restores refresh on mobile |
| DashboardStrategica | Aggiorna → `loadData` | `ACTION_ICONS.refresh` | already `mobileHidden` |

### Preexisting bug to fix (found by ground-truth)
`ReportMaterialePage.jsx` passes the export config to `useExportHandler(...)` (which ignores
args) and wires `onClick={handleExport}` so the click passes a `MouseEvent` → `rows` undefined
→ "Nessun dato da esportare". Export is already broken today. Fix BOTH the desktop `ExportButton`
and the new mobile action to call `handleExport({ columns, rows, filename, sheetName })`.

## Out of scope (documented)
- `MaterialeAgenti`: its "action" is the `MagazzinoAlerts` accordion panel, not buttons — keeps
  current behavior (no `mobileHidden`).
- `EventiDetail`: worst mobile-actions gap ("Registra rientro" + "Riepilogo PDF" absent on mobile),
  but owner kept it out of this scope. Follow-up candidate.
- No overflow-menu pattern, no PageHeader desktop refactor, no padding-compounding fixes.
- `DashboardOperativa.jsx` (489 lines) / `DashboardStrategica.jsx` (376) already exceed the 300-line
  rule; do not worsen — this change only moves a few lines.

## Verification
Adversarial verifier + `npm run build`. Check: descriptor shape consistent across pages,
conditional actions replicated correctly, icons match desktop, export handlers not duplicated,
ReportMateriale export actually works, no MobileHeader call site broken, 48px targets, aria-labels present.
