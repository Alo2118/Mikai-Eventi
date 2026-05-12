// Enum values match database enums exactly.
// Labels are user-facing Italian text (spec section 10.2).

export const RUOLI = {
  admin: 'Amministratore',
  direzione: 'Direzione',
  ufficio: 'Ufficio',
  area_manager: 'Area Manager',
  commerciale: 'Commerciale',
}

// Ruoli che possono fare da Area Manager di un evento (anche un commerciale può coordinare la zona)
export const AREA_MANAGER_ROLES = ['area_manager', 'direzione', 'admin', 'commerciale']

export const TIPO_EVENTO = {
  workshop: 'Workshop',
  corso: 'Corso',
  congresso: 'Congresso',
  convegno: 'Convegno',
  cadaver_lab: 'Cadaver Lab',
  live_surgery: 'Live Surgery',
}

export const MODALITA_EVENTO = {
  interno: 'Evento organizzato da noi',
  esterno: 'Partecipiamo a evento di altri',
  contributo: 'Solo contributo economico',
}

export const MODALITA_EVENTO_SHORT = {
  interno: 'Nostro',
  esterno: 'Esterno',
  contributo: 'Contributo',
}

export const MODALITA_COLORE = {
  interno: 'mikai',
  esterno: 'gray',
  contributo: 'yellow',
}

export const STATO_EVENTO = {
  proposto: 'In attesa di approvazione',
  confermato: 'Approvato',
  in_preparazione: 'In preparazione',
  pronto: 'Pronto',
  in_corso: 'In corso',
  concluso: 'Concluso',
  cancellato: 'Annullato',
  rifiutato: 'Rifiutato',
}

export const STATO_EVENTO_COLORE = {
  proposto: 'yellow',
  confermato: 'blue',
  in_preparazione: 'mikai',
  pronto: 'green',
  in_corso: 'emerald',
  concluso: 'gray',
  cancellato: 'red',
  rifiutato: 'red',
}

export const STATO_ATTIVITA = {
  da_fare: 'Da fare',
  in_corso: 'In corso',
  completata: 'Completata',
  disattivata: 'Disattivata',
  in_ritardo: 'In ritardo',
  bloccata: 'Bloccata',
}

export const STATO_ATTIVITA_COLORE = {
  da_fare: 'gray',
  in_corso: 'mikai',
  completata: 'green',
  disattivata: 'gray',
  in_ritardo: 'red',
  bloccata: 'gray',
}

export const CATEGORIA_ATTIVITA = {
  logistica: 'Logistica',
  marketing: 'Marketing',
  materiale: 'Materiale',
  organizzazione: 'Organizzazione',
  amministrazione: 'Amministrazione',
}

export const CATEGORIA_ATTIVITA_COLORE = {
  logistica: 'blue',
  marketing: 'purple',
  materiale: 'emerald',
  organizzazione: 'yellow',
  amministrazione: 'gray',
}

export const VERIFICATION_FUNCTIONS = {
  lista_materiale_compilata: {
    label: 'Lista materiale compilata',
    desc: 'Almeno un prodotto nella lista materiale evento',
  },
  materiale_tutto_confermato: {
    label: 'Materiale tutto confermato',
    desc: 'Tutti i prodotti in lista hanno stato "approvato"',
  },
  indirizzo_spedizione_specificato: {
    label: 'Indirizzo spedizione specificato',
    desc: 'Il campo indirizzo spedizione evento non è vuoto',
  },
  titolo_orario_definitivi: {
    label: 'Titolo e orario definitivi',
    desc: 'Titolo, data inizio e data fine sono tutti compilati',
  },
  materiale_tutto_preparato: {
    label: 'Materiale tutto preparato',
    desc: 'Nessun prodotto in stato "richiesto" o "approvato" (tutti almeno in_preparazione)',
  },
  materiale_tutto_spedito: {
    label: 'Materiale tutto spedito',
    desc: 'Ogni materiale fisico ha un movimento di uscita registrato',
  },
}

export const STATO_MATERIALE_RICHIESTA = {
  richiesto: 'Richiesto',
  approvato: 'Approvato',
  rifiutato: 'Rifiutato',
}

export const STATO_MATERIALE_RICHIESTA_COLORE = {
  richiesto: 'yellow',
  approvato: 'green',
  rifiutato: 'red',
}

export const STATO_DOCUMENTO = {
  caricato: 'Caricato',
  da_approvare: 'Da approvare',
  approvato: 'Approvato',
  rifiutato: 'Rifiutato',
  in_revisione: 'In revisione',
}

export const STATO_DOCUMENTO_COLORE = {
  caricato: 'gray',
  da_approvare: 'yellow',
  approvato: 'green',
  rifiutato: 'red',
  in_revisione: 'blue',
}

export const STATO_ISCRIZIONE = {
  invitato: 'Invitato',
  confermato: 'Confermato',
  presente: 'Presente',
  assente: 'Assente',
}

export const STATO_ISCRIZIONE_COLORE = {
  invitato: 'yellow',
  confermato: 'blue',
  presente: 'green',
  assente: 'red',
}

// Tipo contatto
export const TIPO_CONTATTO = {
  medico: 'Medico',
  specializzando: 'Specializzando',
  infermiere: 'Infermiere',
  agente: 'Agente',
  fornitore: 'Fornitore',
  tecnico: 'Tecnico',
  istituzionale: 'Istituzionale',
  altro: 'Altro',
}

export const TIPO_CONTATTO_COLORE = {
  medico: 'blue',
  specializzando: 'mikai',
  infermiere: 'emerald',
  agente: 'yellow',
  fornitore: 'orange',
  tecnico: 'purple',
  istituzionale: 'gray',
  altro: 'gray',
}

// Tipologia per import in blocco — labels familiari, mapping a tipo_contatto + ruolo_medico
export const TIPOLOGIA_IMPORT = {
  medico:          { label: 'Medico',          tipo_contatto: 'medico',        ruolo_medico: 'medico' },
  specializzando:  { label: 'Specializzando',  tipo_contatto: 'specializzando', ruolo_medico: 'specializzando' },
  infermiere:      { label: 'Infermiere',       tipo_contatto: 'infermiere',    ruolo_medico: null },
  agente:          { label: 'Agente',           tipo_contatto: 'agente',        ruolo_medico: null },
  strumentista:    { label: 'Strumentista',     tipo_contatto: 'tecnico',       ruolo_medico: 'strumentista' },
  fornitore:       { label: 'Fornitore',        tipo_contatto: 'fornitore',     ruolo_medico: null },
  tecnico:         { label: 'Tecnico',          tipo_contatto: 'tecnico',       ruolo_medico: null },
  istituzionale:   { label: 'Istituzionale',    tipo_contatto: 'istituzionale', ruolo_medico: null },
  altro:           { label: 'Altro',            tipo_contatto: 'altro',         ruolo_medico: null },
}

// Stato prenotazione (hotel + trasporti)
export const STATO_PRENOTAZIONE = {
  da_prenotare: 'Da prenotare',
  prenotato: 'Prenotato',
  confermato: 'Confermato',
  non_necessario: 'Non necessario',
}

export const STATO_PRENOTAZIONE_COLORE = {
  da_prenotare: 'yellow',
  prenotato: 'blue',
  confermato: 'green',
  non_necessario: 'gray',
}

// Direzione trasporto
export const DIREZIONE_TRASPORTO = {
  andata: 'Andata',
  ritorno: 'Ritorno',
}

// Mezzo trasporto
export const MEZZO_TRASPORTO = {
  treno: 'Treno',
  volo: 'Volo',
  auto: 'Auto',
  navetta: 'Navetta',
  transfer: 'Transfer',
  indipendente: 'Indipendente',
}

// Tipi evento che usano i tavoli
export const TIPI_EVENTO_CON_TAVOLI = ['corso', 'cadaver_lab']

// Tab status dot colors
export const TAB_STATUS_COLOR = {
  complete:   'green',
  warning:    'yellow',
  incomplete: 'red',
}

// Stato preventivo
export const STATO_PREVENTIVO = {
  in_attesa: 'In attesa',
  approvato: 'Approvato',
  rifiutato: 'Rifiutato',
  in_revisione: 'In revisione',
}

export const STATO_PREVENTIVO_COLORE = {
  in_attesa: 'yellow',
  approvato: 'green',
  rifiutato: 'red',
  in_revisione: 'blue',
}

// Tipo partecipante
export const TIPO_PARTECIPANTE = {
  discente: 'Discente',
  relatore_esterno: 'Relatore esterno',
  ospite: 'Ospite',
  accompagnatore: 'Accompagnatore',
  agente: 'Agente',
}

// Ruolo evento (staff interno)
export const RUOLO_EVENTO = {
  formatore: 'Formatore',
  responsabile: 'Responsabile',
  staff: 'Staff',
  commerciale: 'Commerciale',
  relatore: 'Relatore',
  ospite: 'Ospite',
}

export const PERMESSI = {
  approva_eventi: 'Approvazione eventi',
  gestione_costi: 'Gestione costi',
  compliance: 'Compliance MedTech',
  gestione_utenti: 'Gestione utenti',
  richiedi_materiale: 'Richiesta materiale',
  approva_materiale: 'Approvazione materiale',
  gestione_magazzino: 'Gestione magazzino',
  gestione_spedizioni: 'Gestione spedizioni',
  gestione_gadget: 'Gestione gadget',
  gestione_sedi: 'Gestione sedi',
  gestione_catalogo: 'Gestione catalogo',
  gestione_marketing: 'Gestione marketing',
  gestione_organizzazione: 'Gestione organizzazione',
  gestione_contatti: 'Gestione contatti',
  gestione_staff_evento: 'Gestione staff evento',
  gestione_logistica: 'Gestione logistica',
  approva_preventivi: 'Approva preventivi',
}

// Label brevi per badge attività (permesso_responsabile → chip)
export const PERMESSO_SHORT_LABELS = {
  gestione_magazzino: 'Magazzino',
  gestione_spedizioni: 'Spedizioni',
  gestione_marketing: 'Marketing',
  gestione_organizzazione: 'Organizzazione',
  gestione_costi: 'Costi',
  gestione_logistica: 'Logistica',
  approva_preventivi: 'Preventivi',
  gestione_contatti: 'Contatti',
  gestione_staff_evento: 'Staff evento',
  gestione_gadget: 'Gadget',
  gestione_sedi: 'Sedi',
  gestione_catalogo: 'Catalogo',
  approva_eventi: 'Approvazione',
  approva_materiale: 'Materiale',
  gestione_utenti: 'Amministrazione',
  richiedi_materiale: 'Materiale',
  compliance: 'Compliance',
}

// Colori per badge permesso_responsabile
export const PERMESSO_BADGE_COLORE = {
  gestione_magazzino: 'purple',
  gestione_spedizioni: 'blue',
  gestione_marketing: 'mikai',
  gestione_organizzazione: 'emerald',
  gestione_costi: 'yellow',
  gestione_logistica: 'blue',
  approva_preventivi: 'yellow',
  gestione_contatti: 'gray',
  gestione_staff_evento: 'gray',
}

export const RUOLI_OPERATIVI = {
  segreteria_org: 'Segreteria organizzativa',
  marketing: 'Marketing',
  logistica_spedizioni: 'Logistica spedizioni',
  logistica_ordini: 'Logistica ordini',
  amministrazione: 'Amministrazione',
  formatore: 'Formatore',
}

export const TIPO_MATERIALE = {
  demo_kit: 'Kit demo',
  montaggio: 'Montaggio',
  strumentario: 'Strumentario',
  altro: 'Altro',
}

export const POSIZIONE_MATERIALE = {
  in_magazzino: 'In magazzino',
  presso_evento: 'Presso evento',
  magazzino_agente: 'Presso agente',
  in_transito: 'In transito',
  manutenzione: 'In manutenzione',
}

export const POSIZIONE_MATERIALE_COLORE = {
  in_magazzino: 'green',
  presso_evento: 'blue',
  magazzino_agente: 'yellow',
  in_transito: 'mikai',
  manutenzione: 'red',
}

export const POSIZIONE_ORDER = ['in_magazzino', 'presso_evento', 'magazzino_agente', 'in_transito', 'manutenzione']

export const POSIZIONE_BG = {
  in_magazzino: 'bg-green-50 text-green-700',
  presso_evento: 'bg-blue-50 text-blue-700',
  magazzino_agente: 'bg-yellow-50 text-yellow-700',
  in_transito: 'bg-sky-50 text-sky-700',
  manutenzione: 'bg-red-50 text-red-700',
}

export const STATO_MOVIMENTO = {
  uscita: 'Uscita',
  rientro: 'Rientro',
  trasferimento: 'Trasferimento',
}

// Default motivi for stock adjustments (stock_adjustments.motivo)
export const STOCK_MOTIVO = {
  caricoLotto: 'Carico lotto',
  rettifica: 'Rettifica inventario',
}

export const MODALITA_MOVIMENTO = {
  spedizione: 'Spedizione',
  mano: 'Consegna a mano',
  gia_in_loco: 'Gi\u00E0 in loco',
  trasferimento_da_altro_evento: 'Trasferimento da altro evento',
}

export const STATO_RIENTRO = {
  integro: 'Integro',
  parziale: 'Parziale',
  danneggiato: 'Danneggiato',
}

export const STATO_RIENTRO_COLORE = {
  integro: 'green',
  parziale: 'yellow',
  danneggiato: 'red',
}

export const STATO_RIENTRO_COLORS = {
  integro: 'border-green-400 bg-green-50 text-green-800',
  parziale: 'border-yellow-400 bg-yellow-50 text-yellow-800',
  danneggiato: 'border-red-400 bg-red-50 text-red-800',
}

// Condition button styles (rientro stato) — used by MaterialCard quick rientro
export const RIENTRO_STATO_STYLE = {
  integro: 'border-green-600 bg-green-100 text-green-700',
  parziale: 'border-yellow-600 bg-yellow-100 text-yellow-700',
  danneggiato: 'border-red-600 bg-red-100 text-red-700',
}

export const TIPO_BRAND = {
  produttore: 'Produttore',
  distributore: 'Distributore',
  fornitore: 'Fornitore',
}

export const TIPO_BRAND_COLORE = {
  produttore: 'blue',
  distributore: 'purple',
  fornitore: 'orange',
}

// Material list row statuses — keyed by DB enum values (richiesto/approvato/rifiutato)
// UI shows friendlier labels for the commerciale
export const STATO_MATERIALE_LISTA = {
  richiesto: 'In attesa di conferma',
  approvato: 'Confermato',
  rifiutato: 'Non disponibile',
  in_preparazione: 'In preparazione',
  spedito: 'Spedito',
}

export const STATO_MATERIALE_LISTA_COLORE = {
  richiesto: 'gray',
  approvato: 'green',
  rifiutato: 'red',
  in_preparazione: 'mikai',
  spedito: 'emerald',
}

// Product types for catalog filtering
export const TIPO_PRODOTTO = {
  demo_kit: 'Demo Kit',
  strumentario: 'Strumentario',
  montaggio: 'Montaggio',
  pezzo_sfuso: 'Pezzo sfuso',
  gadget: 'Gadget',
  ossa: 'Ossa',
}

export const TIPO_PRODOTTO_COLORE = {
  demo_kit: 'blue',
  strumentario: 'emerald',
  montaggio: 'purple',
  pezzo_sfuso: 'yellow',
  gadget: 'orange',
  ossa: 'amber',
}

// Role permission presets (assigned at user creation)
export const ROLE_PERMISSION_PRESETS = {
  commerciale: ['richiedi_materiale'],
  area_manager: ['richiedi_materiale', 'approva_eventi', 'gestione_contatti', 'gestione_staff_evento'],
  direzione: ['approva_eventi', 'approva_materiale', 'gestione_costi', 'compliance', 'gestione_contatti', 'gestione_staff_evento', 'approva_preventivi'],
  ufficio: ['approva_materiale', 'gestione_magazzino', 'gestione_spedizioni', 'gestione_gadget', 'gestione_sedi', 'gestione_costi', 'gestione_contatti', 'gestione_staff_evento', 'gestione_logistica', 'approva_preventivi'],
  admin: ['gestione_utenti', 'gestione_catalogo', 'approva_eventi', 'approva_materiale', 'gestione_costi', 'compliance', 'gestione_magazzino', 'gestione_spedizioni', 'gestione_gadget', 'gestione_sedi', 'gestione_contatti', 'gestione_staff_evento', 'gestione_logistica', 'approva_preventivi', 'richiedi_materiale', 'gestione_marketing', 'gestione_organizzazione'],
}

// Tipo notifica
export const TIPO_NOTIFICA = {
  approvazione_richiesta: 'Approvazione richiesta',
  approvazione_completata: 'Approvazione completata',
  attivita_scaduta: 'Attività scaduta',
  attivita_in_scadenza: 'Attività in scadenza',
  attivita_assegnata: 'Attività assegnata',
  attivita_non_assegnata: 'Attività non assegnata',
  conflitto_materiale: 'Conflitto materiale',
  rientro_scaduto: 'Rientro materiale scaduto',
  preventivo_stato: 'Stato preventivo cambiato',
  evento_stato_cambiato: 'Stato evento cambiato',
  escalation: 'Escalation',
  materiale_approvato: 'Materiale approvato',
  materiale_rifiutato: 'Materiale rifiutato',
  materiale_in_preparazione: 'Materiale in preparazione',
  materiale_spedito: 'Materiale spedito',
  materiale_rientrato: 'Materiale rientrato',
  staff_assegnato: 'Aggiunto a evento',
  staff_rimosso: 'Rimosso da evento',
}

export const TIPO_NOTIFICA_COLORE = {
  approvazione_richiesta: 'yellow',
  approvazione_completata: 'green',
  attivita_scaduta: 'red',
  attivita_in_scadenza: 'yellow',
  attivita_assegnata: 'blue',
  attivita_non_assegnata: 'red',
  conflitto_materiale: 'red',
  rientro_scaduto: 'red',
  preventivo_stato: 'blue',
  evento_stato_cambiato: 'mikai',
  escalation: 'red',
  materiale_approvato: 'green',
  materiale_rifiutato: 'red',
  materiale_in_preparazione: 'yellow',
  materiale_spedito: 'emerald',
  materiale_rientrato: 'blue',
  staff_assegnato: 'mikai',
  staff_rimosso: 'red',
}

// Tipo documento (allegati evento)
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

// ═══════════════════════════════════════════
// Compliance — HCP / ToV
// ═══════════════════════════════════════════

export const TIPO_HCP = {
  medico: 'Medico',
  infermiere: 'Infermiere',
  tecnico: 'Tecnico',
  fisioterapista: 'Fisioterapista',
  farmacista: 'Farmacista',
  altro: 'Altro',
}

export const TIPO_TOV = {
  ospitalita: 'Ospitalità',
  viaggio: 'Viaggio',
  compenso: 'Compenso',
  regalo: 'Regalo',
  sponsorizzazione: 'Sponsorizzazione',
  formazione: 'Formazione',
  consulenza: 'Consulenza',
}

export const TIPO_TOV_COLORE = {
  ospitalita: 'blue',
  viaggio: 'emerald',
  compenso: 'yellow',
  regalo: 'purple',
  sponsorizzazione: 'mikai',
  formazione: 'green',
  consulenza: 'gray',
}

export const STATO_TOV = {
  registrato: 'Registrato',
  verificato: 'Verificato',
  segnalato: 'Segnalato',
}

export const STATO_TOV_COLORE = {
  registrato: 'yellow',
  verificato: 'green',
  segnalato: 'red',
}

export const TIPO_INTERAZIONE_HCP = {
  visita: 'Visita',
  telefonata: 'Telefonata',
  email: 'Email',
  evento: 'Evento',
  cadaver_lab: 'Cadaver Lab',
  congresso: 'Congresso',
  workshop: 'Workshop',
}

export const AUDIT_ENTITA = {
  event: 'Evento',
  material: 'Materiale',
  material_request: 'Richiesta materiale',
  document: 'Documento',
  cost: 'Costo',
  user: 'Utente',
  participant: 'Partecipante',
  task: 'Attività',
  staff: 'Staff',
  trasferimento_valore: 'Trasferimento valore',
  interazione_hcp: 'Interazione HCP',
  hcp_professionista: 'Professionista HCP',
  permesso: 'Permesso',
  contatto: 'Contatto',
}

export const AUDIT_AZIONE = {
  creato: 'Creato',
  modificato: 'Modificato',
  approvato: 'Approvato',
  rifiutato: 'Rifiutato',
  cancellato: 'Cancellato',
  stato_cambiato: 'Stato cambiato',
  eliminato: 'Eliminato',
  verificato: 'Verificato',
  segnalato: 'Segnalato',
}

export const AUDIT_AZIONE_COLORE = {
  creato: 'green',
  modificato: 'blue',
  approvato: 'green',
  rifiutato: 'red',
  cancellato: 'red',
  stato_cambiato: 'yellow',
  eliminato: 'red',
  verificato: 'green',
  segnalato: 'red',
}

// Hex colors for PDF riepilogo generation (jsPDF needs raw hex)
export const PDF_COLORS = {
  primary: '#3296dc',
  headerBg: '#e8f4fc',
  text: '#374151',
  section: '#1e3a5f',
  altRow: '#f9fafb',
  border: '#e5e7eb',
  muted: '#9ca3af',
  subtle: '#6b7280',
  white: '#ffffff',
}

// Hex colors for recharts (Tailwind classes don't work in SVG fills)
export const CHART_COLORS = {
  mikai: '#3296dc',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  blue: '#3b82f6',
  emerald: '#10b981',
  gray: '#9ca3af',
  purple: '#8b5cf6',
  amber: '#f59e0b',
  orange: '#f97316',
}

export const STATO_EVENTO_CHART_COLOR = {
  proposto: '#eab308',
  confermato: '#3b82f6',
  in_preparazione: '#3296dc',
  pronto: '#22c55e',
  in_corso: '#10b981',
  concluso: '#9ca3af',
  cancellato: '#ef4444',
  rifiutato: '#ef4444',
}

export const TIPO_EVENTO_CHART_COLOR = {
  workshop: '#3296dc',
  corso: '#3b82f6',
  congresso: '#8b5cf6',
  convegno: '#f59e0b',
  cadaver_lab: '#10b981',
  live_surgery: '#ef4444',
}

// Semantic color → Tailwind pill classes (used in calendar pills, badges)
export const PILL_COLORS = {
  yellow: 'bg-yellow-100 text-yellow-900',
  blue: 'bg-blue-100 text-blue-900',
  mikai: 'bg-mikai-100 text-mikai-800',
  green: 'bg-green-100 text-green-900',
  emerald: 'bg-emerald-100 text-emerald-900',
  gray: 'bg-gray-100 text-gray-700',
  red: 'bg-red-100 text-red-900',
}

// ═══════════════════════════════════════════
// Shared UI styling constants
// Each is a full, independent string literal — no concatenation.
// Tailwind v4 static analysis requires complete class tokens visible in source.
// ═══════════════════════════════════════════

// Card & container patterns (used across all detail tabs)
export const CARD_STYLE = 'bg-white rounded-xl border border-gray-200 p-4'
export const CARD_HOVER_STYLE = 'bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all'
export const CARD_ITEM_STYLE = 'rounded-xl border border-gray-200 p-4'
export const FORM_CONTAINER_STYLE = 'bg-gray-50 rounded-xl p-4'
export const SUMMARY_BAR_STYLE = 'bg-mikai-50 border border-mikai-200 rounded-xl px-4 py-3'
export const GROUP_HEADING_STYLE = 'bg-gray-100 px-4 py-2 rounded-lg font-medium text-sm text-gray-700'

// Input patterns
export const INPUT_STYLE = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none bg-white'
export const INPUT_ERROR_STYLE = 'w-full px-4 py-3 text-base border border-red-400 rounded-lg min-h-[48px] focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none bg-red-50'
export const SELECT_STYLE = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none bg-white'
export const TEXTAREA_STYLE = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[80px] resize-none focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none bg-white'

// ═══════════════════════════════════════════
// Centralized color maps — single source of truth
// Used by admin pages, badges, cards, charts, pickers
// ═══════════════════════════════════════════

// Available color names for pickers
export const COLORI_LIST = ['gray', 'blue', 'emerald', 'purple', 'yellow', 'orange', 'amber', 'red', 'green', 'mikai', 'pink', 'sky']

// Color → Tailwind class maps (one per shade/variant)
export const COLOR_BG_400 = { gray: 'bg-gray-400', blue: 'bg-blue-400', emerald: 'bg-emerald-400', purple: 'bg-purple-400', yellow: 'bg-yellow-400', orange: 'bg-orange-400', amber: 'bg-amber-400', red: 'bg-red-400', green: 'bg-green-400', mikai: 'bg-mikai-400', pink: 'bg-pink-400', sky: 'bg-sky-400' }
export const COLOR_BG_100 = { gray: 'bg-gray-100', blue: 'bg-blue-100', emerald: 'bg-emerald-100', purple: 'bg-purple-100', yellow: 'bg-yellow-100', orange: 'bg-orange-100', amber: 'bg-amber-100', red: 'bg-red-100', green: 'bg-green-100', mikai: 'bg-mikai-100', pink: 'bg-pink-100', sky: 'bg-sky-100' }
export const COLOR_BG_50 = { gray: 'bg-gray-50', blue: 'bg-blue-50', emerald: 'bg-emerald-50', purple: 'bg-purple-50', yellow: 'bg-yellow-50', orange: 'bg-orange-50', amber: 'bg-amber-50', red: 'bg-red-50', green: 'bg-green-50', mikai: 'bg-mikai-50', pink: 'bg-pink-50', sky: 'bg-sky-50' }
export const COLOR_TEXT_700 = { gray: 'text-gray-700', blue: 'text-blue-700', emerald: 'text-emerald-700', purple: 'text-purple-700', yellow: 'text-yellow-700', orange: 'text-orange-700', amber: 'text-amber-700', red: 'text-red-700', green: 'text-green-700', mikai: 'text-mikai-700', pink: 'text-pink-700', sky: 'text-sky-700' }
export const COLOR_TEXT_600 = { gray: 'text-gray-600', blue: 'text-blue-600', emerald: 'text-emerald-600', purple: 'text-purple-600', yellow: 'text-yellow-600', orange: 'text-orange-600', amber: 'text-amber-600', red: 'text-red-600', green: 'text-green-600', mikai: 'text-mikai-600', pink: 'text-pink-600', sky: 'text-sky-600' }
export const COLOR_BORDER_400 = { gray: 'border-gray-400', blue: 'border-blue-400', emerald: 'border-emerald-400', purple: 'border-purple-400', yellow: 'border-yellow-400', orange: 'border-orange-400', amber: 'border-amber-400', red: 'border-red-400', green: 'border-green-400', mikai: 'border-mikai-400', pink: 'border-pink-400', sky: 'border-sky-400' }
export const COLOR_BORDER_200 = { gray: 'border-gray-200', blue: 'border-blue-200', emerald: 'border-emerald-200', purple: 'border-purple-200', yellow: 'border-yellow-200', orange: 'border-orange-200', amber: 'border-amber-200', red: 'border-red-200', green: 'border-green-200', mikai: 'border-mikai-200', pink: 'border-pink-200', sky: 'border-sky-200' }

// Badge/chip: bg-100 + text-700 combined (for StatusBadge, pills, chips)
export const COLOR_BADGE = { gray: 'bg-gray-100 text-gray-600', blue: 'bg-blue-100 text-blue-700', emerald: 'bg-emerald-100 text-emerald-700', purple: 'bg-purple-100 text-purple-700', yellow: 'bg-yellow-100 text-yellow-700', orange: 'bg-orange-100 text-orange-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-700', green: 'bg-green-100 text-green-700', mikai: 'bg-mikai-100 text-mikai-700', pink: 'bg-pink-100 text-pink-700', sky: 'bg-sky-100 text-sky-700' }

// Band/stripe: bg-300/400 for left-border color bands (e.g. activity cards)
export const COLOR_BAND = { gray: 'bg-gray-300', mikai: 'bg-mikai-400', green: 'bg-green-400', red: 'bg-red-400', blue: 'bg-blue-400', purple: 'bg-purple-400', emerald: 'bg-emerald-400', yellow: 'bg-yellow-400', orange: 'bg-orange-400', amber: 'bg-amber-400', pink: 'bg-pink-400', sky: 'bg-sky-400' }

// Iscrizione chip colors (badge + hover for clickable state chips)
export const ISCRIZIONE_CHIP_COLORS = {
  invitato: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  confermato: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  presente: 'bg-green-100 text-green-700 hover:bg-green-200',
  assente: 'bg-red-100 text-red-700 hover:bg-red-200',
}

// Icon color by status (for readiness indicators, semaphores)
export const COLOR_ICON_STATUS = { green: 'text-green-500', yellow: 'text-yellow-500', red: 'text-red-500', gray: 'text-gray-200' }

// Attivo/non attivo badge (for admin tables)
export const ATTIVO_BADGE = { true: 'bg-green-100 text-green-700', false: 'bg-gray-100 text-gray-500' }

// Confermato badge (for staff/sub-activities)
export const CONFERMATO_BADGE = { true: 'bg-green-100 text-green-700', false: 'bg-yellow-100 text-yellow-700' }
export const CONFERMATO_CHIP = { true: 'bg-green-100 text-green-700 hover:bg-green-200', false: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' }

// Base pill/badge class (no color, add COLOR_BADGE[color] for full style)
export const BADGE_BASE = 'px-2 py-0.5 rounded-full text-xs font-medium'

// Tavolo colori — visual identification for corso tables
export const TAVOLO_COLORI = {
  yellow: { label: 'Giallo', dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-800 border-yellow-300', ring: 'ring-yellow-400' },
  green: { label: 'Verde', dot: 'bg-green-500', badge: 'bg-green-100 text-green-800 border-green-300', ring: 'ring-green-500' },
  black: { label: 'Nero', dot: 'bg-gray-800', badge: 'bg-gray-800 text-white border-gray-900', ring: 'ring-gray-800' },
  blue: { label: 'Azzurro', dot: 'bg-sky-400', badge: 'bg-sky-100 text-sky-800 border-sky-300', ring: 'ring-sky-400' },
  red: { label: 'Rosso', dot: 'bg-red-500', badge: 'bg-red-100 text-red-800 border-red-300', ring: 'ring-red-500' },
}

export const TAVOLO_COLORI_LIST = ['yellow', 'green', 'black', 'blue', 'red']

