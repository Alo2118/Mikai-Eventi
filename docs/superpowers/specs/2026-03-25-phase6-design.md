# Phase 6 — CI/CD, PWA, Compliance — Design Spec

**Data:** 2026-03-25
**Stato:** Approvato

---

## Panoramica

Phase 6 chiude il ciclo di sviluppo di Eventi Mikai con tre macro-aree:

| Sub-fase | Scope | Priorità |
|----------|-------|----------|
| **6A: CI/CD** | GitHub Actions: build + deploy automatico su push a main | Alta — abilita tutto il resto |
| **6B: PWA** | Manifest, service worker, offline indicator | Media — UX per utenti sul campo |
| **6C: Compliance** | HCP tracking, Sunshine Act/ToV, audit trail completo | Media — requisito normativo futuro |

---

## 6A: CI/CD Pipeline

### Obiettivo
Automatizzare il deploy a GitHub Pages su ogni push a `main`. Eliminare il processo manuale.

### Workflow GitHub Actions

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

      - id: deployment
        uses: actions/deploy-pages@v4
```

### Decisioni
- **Deploy method:** GitHub Pages native (actions/deploy-pages) instead of gh-pages branch — simpler, no extra branch
- **Secrets:** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` come GitHub Secrets (repository settings)
- **Node version:** 20 LTS
- **No test step:** nessun test framework configurato (TODO futuro)
- **No PR preview:** solo deploy su push a main per ora
- **Concurrency:** cancella deploy precedenti in-progress

### Setup richiesto
1. Repository Settings → Pages → Source: "GitHub Actions"
2. Repository Settings → Secrets → aggiungere `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
3. Verificare che il base path in `vite.config.js` corrisponda al nome del repo

---

## 6B: PWA — Progressive Web App

### Obiettivo
Rendere l'app installabile su mobile e mostrare un avviso chiaro quando non c'è connessione. **Non** supportare funzionalità offline — l'app richiede la rete per funzionare.

### Strategia
- **Precache app shell** (HTML, CSS, JS) — l'app si apre velocemente, anche con rete lenta
- **Network-first per API** — nessun fallback offline per i dati
- **Offline indicator** — banner fisso quando la rete cade
- **Install prompt** — suggerisce installazione su dispositivi supportati

### Libreria: vite-plugin-pwa
Usa `vite-plugin-pwa` (wrapper attorno a Workbox) per generare service worker e manifest automaticamente.

```
npm install -D vite-plugin-pwa
```

### manifest.json (generato da vite-plugin-pwa)

```json
{
  "name": "Eventi Mikai",
  "short_name": "Eventi",
  "description": "Gestione eventi Mikai",
  "start_url": "/Mikai-Eventi/",
  "scope": "/Mikai-Eventi/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3296dc",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Icone PWA
- Generare da logo Mikai: 192x192, 512x512, 512x512 maskable
- Salvare in `public/icons/`
- Aggiungere `<link rel="apple-touch-icon">` in `index.html`

### Service Worker Config (vite-plugin-pwa)

```js
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
    navigateFallback: 'index.html',
    navigateFallbackDenylist: [/^\/api/],
    runtimeCaching: [] // no API caching — network only
  },
  manifest: { /* ... as above ... */ }
})
```

### OfflineIndicator Component

```
src/components/ui/OfflineIndicator.jsx
```

- Ascolta `online`/`offline` events su `window`
- Mostra banner fisso in alto: "Connessione assente — l'app richiede una connessione a internet per funzionare"
- Colore: `bg-red-500 text-white`
- Z-index alto (sopra tutto)
- Sparisce automaticamente quando torna la rete
- Animazione: slide-down entry, slide-up exit

```jsx
// Logica
const [online, setOnline] = useState(navigator.onLine)

useEffect(() => {
  const handleOnline = () => setOnline(true)
  const handleOffline = () => setOnline(false)
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}, [])

if (online) return null
return <div className="fixed top-0 inset-x-0 bg-red-500 text-white text-center py-3 z-50 ...">
  <Icon name="wifiOff" /> Connessione assente — l'app richiede internet per funzionare
</div>
```

### InstallPrompt Component

```
src/components/ui/InstallPrompt.jsx
```

- Intercetta `beforeinstallprompt` event
- Mostra banner bottom (sopra BottomBar su mobile): "Installa Eventi Mikai sul tuo dispositivo"
- Pulsanti: "Installa" (primary) + "Non ora" (ghost)
- "Non ora" nasconde per 7 giorni (localStorage)
- Solo su mobile (non mostrare su desktop)

### Integrazione in Layout

```jsx
// AppLayout.jsx
<OfflineIndicator />
<InstallPrompt />
{/* rest of layout */}
```

---

## 6C: Compliance — Sunshine Act / ToV

### Obiettivo
Tracciare interazioni con professionisti sanitari (HCP) e trasferimenti di valore (ToV) come richiesto dalla normativa MedTech. Fornire audit trail completo per tutte le azioni sensibili nell'app.

### Modello Dati

#### Nuove tabelle

```sql
-- Profilo HCP (estende contatto esistente)
CREATE TABLE hcp_professionisti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contatto_id UUID NOT NULL REFERENCES contatti(id) ON DELETE CASCADE,
  specializzazione TEXT,
  ordine_provinciale TEXT,
  codice_fiscale TEXT,
  categoria tipo_hcp NOT NULL, -- medico, infermiere, tecnico, fisioterapista, farmacista, altro
  struttura_appartenenza TEXT,
  consenso_privacy BOOLEAN DEFAULT false,
  data_consenso TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contatto_id)
);

-- Trasferimenti di valore
CREATE TABLE trasferimenti_valore (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hcp_id UUID NOT NULL REFERENCES hcp_professionisti(id) ON DELETE RESTRICT,
  evento_id UUID REFERENCES events(id) ON DELETE SET NULL,
  tipo tipo_tov NOT NULL, -- ospitalita, viaggio, compenso, regalo, sponsorizzazione, formazione, consulenza
  importo DECIMAL(10,2) NOT NULL CHECK (importo >= 0),
  valuta TEXT DEFAULT 'EUR',
  data_trasferimento DATE NOT NULL,
  descrizione TEXT NOT NULL,
  giustificazione TEXT NOT NULL, -- obbligatoria per ogni ToV
  stato stato_tov NOT NULL DEFAULT 'registrato', -- registrato, verificato, segnalato
  periodo_riferimento TEXT, -- es: "2026-S1", "2026-S2"
  created_by UUID NOT NULL REFERENCES auth.users(id),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Interazioni HCP (anche senza ToV)
CREATE TABLE interazioni_hcp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hcp_id UUID NOT NULL REFERENCES hcp_professionisti(id) ON DELETE CASCADE,
  evento_id UUID REFERENCES events(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tipo tipo_interazione_hcp NOT NULL, -- visita, telefonata, email, evento, cadaver_lab, congresso, workshop
  data_interazione DATE NOT NULL,
  note TEXT,
  materiale_presentato TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Nuovi enum types

```sql
CREATE TYPE tipo_hcp AS ENUM (
  'medico', 'infermiere', 'tecnico', 'fisioterapista', 'farmacista', 'altro'
);

CREATE TYPE tipo_tov AS ENUM (
  'ospitalita', 'viaggio', 'compenso', 'regalo', 'sponsorizzazione', 'formazione', 'consulenza'
);

CREATE TYPE stato_tov AS ENUM (
  'registrato', 'verificato', 'segnalato'
);

CREATE TYPE tipo_interazione_hcp AS ENUM (
  'visita', 'telefonata', 'email', 'evento', 'cadaver_lab', 'congresso', 'workshop'
);
```

#### RLS Policies

```sql
-- hcp_professionisti: solo utenti con permesso compliance possono vedere/modificare
-- trasferimenti_valore: compliance può tutto, created_by può vedere i propri
-- interazioni_hcp: compliance può tutto, user_id può vedere/creare le proprie
```

#### Indexes

```sql
CREATE INDEX idx_tov_hcp ON trasferimenti_valore(hcp_id);
CREATE INDEX idx_tov_evento ON trasferimenti_valore(evento_id);
CREATE INDEX idx_tov_periodo ON trasferimenti_valore(periodo_riferimento);
CREATE INDEX idx_tov_stato ON trasferimenti_valore(stato);
CREATE INDEX idx_interazioni_hcp ON interazioni_hcp(hcp_id);
CREATE INDEX idx_interazioni_evento ON interazioni_hcp(evento_id);
CREATE INDEX idx_hcp_contatto ON hcp_professionisti(contatto_id);
```

### Audit Trail Espanso

#### Nuovi trigger per azioni sensibili

Aggiungere trigger `activity_log` per:

| Azione | Entità | Quando |
|--------|--------|--------|
| Login/logout | user | Auth events (Edge Function) |
| Creazione ToV | trasferimento_valore | INSERT |
| Modifica ToV | trasferimento_valore | UPDATE |
| Verifica ToV | trasferimento_valore | UPDATE stato → verificato |
| Creazione interazione HCP | interazione_hcp | INSERT |
| Modifica contatto | contatti | UPDATE |
| Cancellazione contatto | contatti | DELETE |
| Modifica permessi utente | user_permissions | INSERT/DELETE |
| Approvazione/rifiuto preventivo | preventivi | UPDATE stato |
| Cambio stato materiale | material_requests | UPDATE stato |
| Upload/cancellazione documento | event_documents | INSERT/DELETE |
| Modifica profilo HCP | hcp_professionisti | INSERT/UPDATE/DELETE |

#### Estensione enum `audit_entita`

```sql
ALTER TYPE audit_entita ADD VALUE 'trasferimento_valore';
ALTER TYPE audit_entita ADD VALUE 'interazione_hcp';
ALTER TYPE audit_entita ADD VALUE 'hcp_professionista';
ALTER TYPE audit_entita ADD VALUE 'permesso';
ALTER TYPE audit_entita ADD VALUE 'contatto';
```

### UI Components

#### Pagine nuove

| Route | Componente | Descrizione |
|-------|-----------|-------------|
| `/compliance` | `ComplianceDashboard` | KPI: ToV totali per periodo, per tipo, per HCP. Top HCP per importo. |
| `/compliance/tov` | `TovList` | Lista trasferimenti con filtri (periodo, tipo, stato, HCP) + export Excel |
| `/compliance/tov/nuovo` | `TovForm` | Creazione nuovo ToV (wizard o form) |
| `/compliance/tov/:id` | `TovDetail` | Dettaglio ToV con storico modifiche |
| `/compliance/hcp` | `HcpList` | Lista HCP con ricerca + filtri categoria |
| `/compliance/hcp/:id` | `HcpDetail` | Profilo HCP + storico interazioni + ToV associati |
| `/admin/audit` | `AuditTrailPage` | Visualizzazione activity_log con filtri (entità, azione, utente, periodo) |

#### Tab evento: "Compliance"

Nuova tab in `EventiDetail` (9a tab):
- Lista HCP coinvolti nell'evento (da partecipanti con profilo HCP)
- ToV associati all'evento
- Pulsante "Registra trasferimento" → apre form ToV precompilato con evento_id
- Pulsante "Registra interazione" → apre form interazione

#### Navigazione

- Sidebar: nuova voce "Compliance" (visibile solo con permesso `compliance`)
- Sidebar: "Audit" sotto Admin (visibile solo admin)

### Zustand Stores

```
src/hooks/useCompliance.js  — ToV CRUD, HCP CRUD, interazioni, dashboard stats
src/hooks/useAuditLog.js    — Fetch activity_log con filtri e paginazione
```

### Constants & Icons

```js
// constants.js
TIPO_HCP = { medico, infermiere, tecnico, fisioterapista, farmacista, altro }
TIPO_TOV = { ospitalita, viaggio, compenso, regalo, sponsorizzazione, formazione, consulenza }
STATO_TOV = { registrato, verificato, segnalato }
TIPO_INTERAZIONE_HCP = { visita, telefonata, email, evento, cadaver_lab, congresso, workshop }

// icons.js
COMPLIANCE_ICONS = { hcp, tov, interazione, audit, verificato, segnalato, ... }
```

### Export

- ToV list → Excel (periodo, HCP, tipo, importo, stato)
- Report semestrale aggregato per HCP → Excel multi-sheet
- Audit trail → Excel con filtri applicati

---

## Riepilogo deliverables

### 6A: CI/CD
- [ ] `.github/workflows/deploy.yml`
- [ ] Documentazione setup secrets in CLAUDE.md
- [ ] Verifica deploy funzionante

### 6B: PWA
- [ ] `vite-plugin-pwa` configurato
- [ ] Icone PWA in `public/icons/`
- [ ] `OfflineIndicator` component
- [ ] `InstallPrompt` component
- [ ] Meta tags in `index.html` (apple-touch-icon, theme-color)
- [ ] Test installazione su mobile

### 6C: Compliance
- [ ] Migrazione DB: enum types + tabelle + RLS + indexes
- [ ] Migrazione DB: trigger audit espansi
- [ ] `useCompliance` store
- [ ] `useAuditLog` store
- [ ] ComplianceDashboard page
- [ ] TovList + TovForm + TovDetail pages
- [ ] HcpList + HcpDetail pages
- [ ] EventComplianceTab (9a tab evento)
- [ ] AuditTrailPage (admin)
- [ ] Constants + Icons
- [ ] Navigation updates (Sidebar, App.jsx routes)
- [ ] Excel export per ToV e audit
