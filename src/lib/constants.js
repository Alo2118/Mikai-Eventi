// Enum values match database enums exactly.
// Labels are user-facing Italian text (spec section 10.2).

export const RUOLI = {
  admin: 'Amministratore',
  direzione: 'Direzione',
  ufficio: 'Ufficio',
  area_manager: 'Area Manager',
  commerciale: 'Commerciale',
}

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

export const STATO_EVENTO = {
  proposto: 'In attesa di approvazione',
  confermato: 'Approvato',
  in_preparazione: 'In preparazione',
  pronto: 'Tutto pronto',
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
  lista_materiale_compilata: 'Lista materiale compilata',
  materiale_tutto_confermato: 'Materiale tutto confermato',
  indirizzo_spedizione_specificato: 'Indirizzo spedizione specificato',
  titolo_orario_definitivi: 'Titolo e orario definitivi',
  materiale_tutto_preparato: 'Materiale tutto preparato',
  materiale_tutto_spedito: 'Materiale tutto spedito',
}

export const STATO_MATERIALE_RICHIESTA = {
  richiesto: 'Richiesto',
  approvato: 'Approvato',
  rifiutato: 'Rifiutato',
}

export const STATO_DOCUMENTO = {
  bozza: 'Bozza',
  in_revisione: 'In revisione',
  approvato: 'Approvato',
  definitivo: 'Definitivo',
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
  fornitore: 'Fornitore',
  tecnico: 'Tecnico',
  istituzionale: 'Istituzionale',
  altro: 'Altro',
}

// Tipologia per import in blocco — labels familiari, mapping a tipo_contatto + ruolo_medico
export const TIPOLOGIA_IMPORT = {
  medico:          { label: 'Medico',          tipo_contatto: 'medico',        ruolo_medico: 'medico' },
  specializzando:  { label: 'Specializzando',  tipo_contatto: 'medico',        ruolo_medico: 'specializzando' },
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
}

export const STATO_PRENOTAZIONE_COLORE = {
  da_prenotare: 'yellow',
  prenotato: 'blue',
  confermato: 'green',
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

export const STATO_MOVIMENTO = {
  uscita: 'Uscita',
  rientro: 'Rientro',
  trasferimento: 'Trasferimento',
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

export const TIPO_BRAND = {
  produttore: 'Produttore',
  distributore: 'Distributore',
  fornitore: 'Fornitore',
}

// Material list row statuses — keyed by DB enum values (richiesto/approvato/rifiutato)
// UI shows friendlier labels for the commerciale
export const STATO_MATERIALE_LISTA = {
  richiesto: 'In attesa di conferma',
  approvato: 'Confermato',
  rifiutato: 'Non disponibile',
  in_preparazione: 'In preparazione',
}

export const STATO_MATERIALE_LISTA_COLORE = {
  richiesto: 'gray',
  approvato: 'green',
  rifiutato: 'red',
  in_preparazione: 'mikai',
}

// Product types for catalog filtering
export const TIPO_PRODOTTO = {
  demo_kit: 'Demo Kit',
  strumentario: 'Strumentario',
  montaggio: 'Montaggio',
  pezzo_sfuso: 'Pezzo sfuso',
  gadget: 'Gadget',
}

// Role permission presets (assigned at user creation)
export const ROLE_PERMISSION_PRESETS = {
  commerciale: ['richiedi_materiale'],
  area_manager: ['richiedi_materiale', 'approva_eventi', 'gestione_contatti', 'gestione_staff_evento'],
  direzione: ['approva_eventi', 'approva_materiale', 'gestione_costi', 'compliance', 'gestione_contatti', 'gestione_staff_evento', 'approva_preventivi'],
  ufficio: ['approva_materiale', 'gestione_magazzino', 'gestione_spedizioni', 'gestione_gadget', 'gestione_sedi', 'gestione_costi', 'gestione_contatti', 'gestione_staff_evento', 'gestione_logistica', 'approva_preventivi'],
  admin: ['gestione_utenti', 'gestione_catalogo', 'approva_eventi', 'approva_materiale', 'gestione_costi', 'compliance', 'gestione_magazzino', 'gestione_spedizioni', 'gestione_gadget', 'gestione_sedi', 'gestione_contatti', 'gestione_staff_evento', 'gestione_logistica', 'approva_preventivi', 'richiedi_materiale', 'gestione_marketing', 'gestione_organizzazione'],
}

// ═══════════════════════════════════════════
// Shared input/form styling constants
// Each is a full, independent string literal — no concatenation.
// Tailwind v4 static analysis requires complete class tokens visible in source.
// ═══════════════════════════════════════════
export const INPUT_STYLE = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'
export const INPUT_ERROR_STYLE = 'w-full px-4 py-3 text-base border border-red-400 rounded-lg min-h-[48px] focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none bg-red-50'
export const SELECT_STYLE = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none bg-white'
export const TEXTAREA_STYLE = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[80px] resize-none focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'
