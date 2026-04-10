// Mappa centralizzata icone — unico punto di import da lucide-react.
// I componenti usano <Icon name="..." />, mai import diretti da lucide.

import {
  // Tipi evento
  Presentation,
  GraduationCap,
  Building2,
  MessageSquare,
  Bone,
  HeartPulse,
  Microscope,
  Bolt,
  BookOpen,
  Projector,

  // Modalità evento
  Building,
  Globe,
  HandCoins,

  // Stati evento
  Clock,
  CheckCircle,
  Hammer,
  ShieldCheck,
  Play,
  Flag,
  XCircle,

  // Navigazione
  LayoutDashboard,
  LayoutGrid,
  Calendar,
  CalendarDays,
  Package,
  Contact,
  Paperclip,
  Bell,
  Settings,
  Plus,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,

  // Azioni
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  Search,
  Filter,
  CirclePlus,
  Pencil,
  Upload,

  // Status/feedback
  Briefcase,
  AlertTriangle,
  Inbox,
  CircleDot,
  Circle,
  CheckCircle2,
  Info,

  // Materiale
  PackageOpen,
  Truck,
  RotateCcw,
  ArrowRightLeft,
  Wrench,
  Gift,
  Handshake,

  // Wizard steps
  ListChecks,
  MapPin,
  Users,
  FileText,

  // Toast
  CircleCheck,
  CircleX,
  TriangleAlert,

  // Admin
  Tag,
  Boxes,
  Map,
  Lock,
  FilterX,
  ExternalLink,

  // Attività
  Calculator,
  ClipboardList,
  ListTodo,
  Timer,

  // Catalogo
  ShoppingCart,
  SlidersHorizontal,
  ClipboardCheck,

  // DataTable + Material Position
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  ChevronDown,
  ChevronUp,
  Warehouse,

  // Phase 4 — persone e logistica
  Bed,
  Bus,
  Car,
  Clipboard,
  Euro,
  Hotel,
  Mail,
  Phone,
  Plane,
  Receipt,
  Repeat,
  TrainFront,
  UserCheck,
  UserPlus,
  UserX,

  // Notifiche
  BellRing,
  BellDot,
  BellOff,
  Megaphone,

  // Documenti
  Download,
  FileImage,
  FileSpreadsheet,
  File,
  Eye,
  Printer,
  FileDown,
  Trash2,

  // Dashboard & Report
  BarChart3,
  TrendingUp,
  TrendingDown,
  CalendarPlus,

  // PWA / Connectivity
  Wifi,
  WifiOff,
  MonitorSmartphone,

  // View toggle
  List,

  // Compliance
  Shield,
  Scale,
  ScrollText,
  History,
  Fingerprint,
  BadgeCheck,
  FileWarning,
  Gavel,

  // Persone tab improvements
  StickyNote,
  UtensilsCrossed,
  Accessibility,
  ToggleLeft,

  // Nuovi (color/icon maps Phase 7)
  PackageCheck,
  PackageMinus,
  PackageX,
  FileCheck,
  FileClock,
  FileLock,
  Factory,
  Store,
  Stethoscope,
  UserCog,
  Layers,
  FlaskConical,
  Cpu,

  // Password
  EyeOff,
  KeyRound,

  // Misc UI
  EllipsisVertical,
  Loader2,
} from 'lucide-react'

// ═══════════════════════════════════════════
// Tipi evento
// ═══════════════════════════════════════════
export const TIPO_EVENTO_ICONS = {
  workshop: Presentation,
  corso: GraduationCap,
  congresso: Building2,
  convegno: MessageSquare,
  cadaver_lab: Bone,
  live_surgery: HeartPulse,
}

// ═══════════════════════════════════════════
// Modalità evento
// ═══════════════════════════════════════════
export const MODALITA_ICONS = {
  interno: Building,
  esterno: Globe,
  contributo: HandCoins,
}

// ═══════════════════════════════════════════
// Stati evento (per StatusBadge e StatusFlow)
// ═══════════════════════════════════════════
export const STATO_EVENTO_ICONS = {
  proposto: Clock,
  confermato: CheckCircle,
  in_preparazione: Hammer,
  pronto: ShieldCheck,
  in_corso: Play,
  concluso: Flag,
  cancellato: XCircle,
  rifiutato: XCircle,
}

// ═══════════════════════════════════════════
// Colori status badge → icone
// ═══════════════════════════════════════════
export const STATUS_COLOR_ICONS = {
  green: CheckCircle,
  yellow: Clock,
  red: XCircle,
  blue: CheckCircle,
  mikai: Hammer,
  emerald: Play,
  gray: Flag,
}

// ═══════════════════════════════════════════
// Navigazione sidebar/bottombar
// ═══════════════════════════════════════════
export const NAV_ICONS = {
  riepilogo: LayoutDashboard,
  eventi: Calendar,
  calendario: CalendarDays,
  materiale: Package,
  contatti: Contact,
  documenti: Paperclip,
  notifiche: Bell,
  impostazioni: Settings,
  nuovo: CirclePlus,
  profilo: User,
  logout: LogOut,
  logistica: Truck,
  dashboard: LayoutDashboard,
  attivita: ListTodo,
  costi: Euro,
  checklist: ClipboardCheck,
  report: BarChart3,
  altro: LayoutGrid,
}

// ═══════════════════════════════════════════
// Azioni
// ═══════════════════════════════════════════
export const ACTION_ICONS = {
  approve: ThumbsUp,
  reject: ThumbsDown,
  check: Check,
  close: X,
  search: Search,
  filter: Filter,
  add: Plus,
  back: ArrowLeft,
  forward: ArrowRight,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  clearFilter: FilterX,
  edit: Pencil,
  upload: Upload,
  sortAsc: ArrowUpNarrowWide,
  sortDesc: ArrowDownWideNarrow,
  refresh: RotateCcw,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  manage: ExternalLink,
  more: EllipsisVertical,
}

// ═══════════════════════════════════════════
// Materiale & movimenti
// ═══════════════════════════════════════════
export const MATERIALE_ICONS = {
  package: Package,
  package_open: PackageOpen,
  uscita: Truck,
  truck: Truck,
  rientro: RotateCcw,
  trasferimento: ArrowRightLeft,
  manutenzione: Wrench,
  gadget: Gift,
  produttore: Building2,
  distributore: Handshake,
  inLista: Clock,
  confermato: CheckCircle,
  rifiutato: XCircle,
  listLocked: Lock,
  warehouse: Warehouse,
  viewList: List,
  viewGrid: LayoutGrid,
  viewProduct: Layers,
}

// ═══════════════════════════════════════════
// Catalogo e-commerce
// ═══════════════════════════════════════════
export const CATALOGO_ICONS = {
  cart: ShoppingCart,
  filters: SlidersHorizontal,
  group: Layers,
}

// ═══════════════════════════════════════════
// Wizard steps
// ═══════════════════════════════════════════
export const WIZARD_STEP_ICONS = {
  tipo: ListChecks,
  dove: MapPin,
  modalita: Users,
  riepilogo: FileText,
}

// ═══════════════════════════════════════════
// Toast/feedback
// ═══════════════════════════════════════════
export const TOAST_ICONS = {
  success: CircleCheck,
  error: CircleX,
  warning: TriangleAlert,
  info: Info,
}

// ═══════════════════════════════════════════
// Posizione materiale
// ═══════════════════════════════════════════
export const POSIZIONE_ICONS = {
  in_magazzino: Package,
  presso_evento: Calendar,
  magazzino_agente: User,
  in_transito: Truck,
  manutenzione: Wrench,
}

// ═══════════════════════════════════════════
// Admin section
// ═══════════════════════════════════════════
export const ADMIN_ICONS = {
  brand: Tag,
  distretti: Bone,
  prodotti: Package,
  materiali: Boxes,
  sedi: MapPin,
  zone: Map,
  utenti: Users,
  corrieri: Truck,
  sottoattivita: ListChecks,
  resetPassword: KeyRound,
}

// ═══════════════════════════════════════════
// Password
// ═══════════════════════════════════════════
export const PASSWORD_ICONS = {
  eye: Eye,
  eyeOff: EyeOff,
  key: KeyRound,
  lock: Lock,
}

// ═══════════════════════════════════════════
// Feedback / alert
// ═══════════════════════════════════════════
export const FEEDBACK_ICONS = {
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
  error: XCircle,
  empty: Inbox,
  loading: Loader2,
}

// ═══════════════════════════════════════════
// Attività (Readiness Engine)
// ═══════════════════════════════════════════
export const ATTIVITA_STATO_ICONS = {
  da_fare: Circle,
  in_corso: CircleDot,
  completata: CheckCircle,
  in_ritardo: Timer,
  bloccata: Lock,
  disattivata: XCircle,
  auto_verificata: ShieldCheck,
}

export const CATEGORIA_ICONS = {
  logistica: Truck,
  marketing: FileText,
  materiale: Package,
  organizzazione: ClipboardList,
  amministrazione: Calculator,
}

// ═══════════════════════════════════════════
// Contatti
// ═══════════════════════════════════════════
export const CONTATTI_ICONS = {
  contatti: Contact,
  medico: UserCheck,
  fornitore: Receipt,
  aggiungi: UserPlus,
  email: Mail,
  telefono: Phone,
  azienda: Building2,
  zona: MapPin,
  ruolo: UserCheck,
  specializzazione: GraduationCap,
  proprietario: User,
}

// ═══════════════════════════════════════════
// Logistica persone
// ═══════════════════════════════════════════
export const LOGISTICA_PERSONE_ICONS = {
  hotel: Hotel,
  trasporto: Plane,
  bus: Bus,
  bed: Bed,
  esigenze_alimentari: UtensilsCrossed,
  esigenze_accessibilita: Accessibility,
  note: StickyNote,
  timeline: ToggleLeft,
}

// ═══════════════════════════════════════════
// Info evento (EventInfoTab rows)
// ═══════════════════════════════════════════
export const INFO_EVENTO_ICONS = {
  luogo: MapPin,
  sede: Building,
  desk: LayoutGrid,
  postazioni: LayoutGrid,
  note: FileText,
  ricorrenza: Repeat,
  cancellazione: XCircle,
}

// ═══════════════════════════════════════════
// Costi
// ═══════════════════════════════════════════
export const COSTI_ICONS = {
  preventivo: FileText,
  costo: Euro,
  clipboard: Clipboard,
}

// ═══════════════════════════════════════════
// Notifiche
// ═══════════════════════════════════════════
export const NOTIFICA_ICONS = {
  approvazione_richiesta: Clock,
  approvazione_completata: CheckCircle,
  attivita_scaduta: Timer,
  attivita_in_scadenza: AlertTriangle,
  attivita_assegnata: UserCheck,
  attivita_non_assegnata: UserPlus,
  conflitto_materiale: AlertTriangle,
  rientro_scaduto: RotateCcw,
  preventivo_stato: FileText,
  evento_stato_cambiato: Calendar,
  escalation: Megaphone,
  materiale_approvato: PackageCheck,
  materiale_rifiutato: PackageX,
  materiale_in_preparazione: Package,
  materiale_spedito: Truck,
  materiale_rientrato: PackageCheck,
  staff_assegnato: UserCheck,
  staff_rimosso: UserX,
  bell_ring: BellRing,
  bell_dot: BellDot,
  bell_off: BellOff,
}

// ═══════════════════════════════════════════
// Sotto-attività
// ═══════════════════════════════════════════
export const SOTTO_ATTIVITA_ICONS = {
  programma: ListChecks,
}

// ═══════════════════════════════════════════
// Trasporti
// ═══════════════════════════════════════════
export const TRASPORTO_ICONS = {
  treno: TrainFront,
  volo: Plane,
  auto: Car,
  navetta: Bus,
  transfer: ArrowRightLeft,
  indipendente: UserX,
}

// ═══════════════════════════════════════════
// Tavoli
// ═══════════════════════════════════════════
export const TAVOLI_ICONS = {
  tavoli: LayoutGrid,
}

// ═══════════════════════════════════════════
// Documenti
// ═══════════════════════════════════════════
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
  replace: RotateCcw,
}

// ═══════════════════════════════════════════
// Dashboard & Report
// ═══════════════════════════════════════════
export const DASHBOARD_ICONS = {
  report: BarChart3,
  trendUp: TrendingUp,
  trendDown: TrendingDown,
  newEvent: CalendarPlus,
  newContact: UserPlus,
  coinvolto_promotore: Megaphone,
  coinvolto_manager: Briefcase,
  coinvolto_staff: Users,
  coinvolto_attivita: ClipboardCheck,
}

// ═══════════════════════════════════════════
// PWA / Connectivity
// ═══════════════════════════════════════════
export const PWA_ICONS = {
  wifiOff: WifiOff,
  online: Wifi,
  install: MonitorSmartphone,
}

// ═══════════════════════════════════════════
// Compliance
// ═══════════════════════════════════════════
export const COMPLIANCE_ICONS = {
  compliance: Shield,
  hcp: UserCheck,
  tov: Scale,
  interazione: ScrollText,
  audit: History,
  privacy: Fingerprint,
  verificato: BadgeCheck,
  segnalato: FileWarning,
  registrato: Clock,
  gavel: Gavel,
}

// ═══════════════════════════════════════════
// Stato richiesta materiale
// ═══════════════════════════════════════════
export const STATO_MATERIALE_RICHIESTA_ICONS = {
  richiesto: Clock,
  approvato: CheckCircle,
  rifiutato: XCircle,
}

// ═══════════════════════════════════════════
// Stato documento
// ═══════════════════════════════════════════
export const STATO_DOCUMENTO_ICONS = {
  caricato: File,
  da_approvare: FileClock,
  approvato: FileCheck,
  rifiutato: FileWarning,
  in_revisione: FileClock,
}

// ═══════════════════════════════════════════
// Stato rientro materiale
// ═══════════════════════════════════════════
export const STATO_RIENTRO_ICONS = {
  integro: PackageCheck,
  parziale: PackageMinus,
  danneggiato: PackageX,
}

// ═══════════════════════════════════════════
// Tipo brand
// ═══════════════════════════════════════════
export const TIPO_BRAND_ICONS = {
  produttore: Factory,
  distributore: Store,
  fornitore: Handshake,
}

// ═══════════════════════════════════════════
// Tipo contatto
// ═══════════════════════════════════════════
export const TIPO_CONTATTO_ICONS = {
  medico: Stethoscope,
  specializzando: GraduationCap,
  infermiere: HeartPulse,
  agente: Briefcase,
  fornitore: Building,
  tecnico: UserCog,
  istituzionale: Building2,
  altro: User,
}

// ═══════════════════════════════════════════
// Tipo prodotto
// ═══════════════════════════════════════════
export const TIPO_PRODOTTO_ICONS = {
  demo_kit: Layers,
  strumentario: FlaskConical,
  montaggio: Wrench,
  pezzo_sfuso: Cpu,
  gadget: Gift,
  ossa: Bone,
}

// ═══════════════════════════════════════════
// Dynamic icon resolution by kebab-case name
// Used by event_types.icona and product_types.icona DB fields
// ═══════════════════════════════════════════
export const ICON_BY_NAME = {
  'presentation': Presentation,
  'graduation-cap': GraduationCap,
  'building-2': Building2,
  'message-square': MessageSquare,
  'bone': Bone,
  'heart-pulse': HeartPulse,
  'calendar': Calendar,
  'users': Users,
  'microscope': Microscope,
  'stethoscope': Stethoscope,
  'package': Package,
  'truck': Truck,
  'gift': Gift,
  'layers': Layers,
  'flask': FlaskConical,
  'wrench': Wrench,
  'cpu': Cpu,
  'bolt': Bolt,
  'book-open': BookOpen,
  'projector': Projector,
  'factory': Factory,
}

// Picker options for admin pages — single source of truth
export const ICON_PICKER_OPTIONS = [
  { value: 'package', label: 'Kit' },
  { value: 'layers', label: 'Livelli' },
  { value: 'gift', label: 'Gadget' },
  { value: 'bone', label: 'Osso' },
  { value: 'flask', label: 'Laboratorio' },
  { value: 'wrench', label: 'Montaggio' },
  { value: 'cpu', label: 'Componente' },
  { value: 'truck', label: 'Spedizione' },
  { value: 'presentation', label: 'Presentazione' },
  { value: 'graduation-cap', label: 'Corso' },
  { value: 'building-2', label: 'Edificio' },
  { value: 'message-square', label: 'Convegno' },
  { value: 'heart-pulse', label: 'Chirurgia' },
  { value: 'microscope', label: 'Microscopio' },
  { value: 'stethoscope', label: 'Stetoscopio' },
  { value: 'users', label: 'Persone' },
  { value: 'calendar', label: 'Calendario' },
  { value: 'bolt', label: 'Bullone' },
  { value: 'projector', label: 'Espositore' },
  { value: 'book-open', label: 'Libro' },
  { value: 'factory', label: 'Fabbrica' },
]
