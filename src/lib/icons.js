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

  // Compliance
  Shield,
  Scale,
  ScrollText,
  History,
  Fingerprint,
  BadgeCheck,
  FileWarning,
  Gavel,
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
  chevronDown: ChevronDown,
}

// ═══════════════════════════════════════════
// Materiale & movimenti
// ═══════════════════════════════════════════
export const MATERIALE_ICONS = {
  package: Package,
  package_open: PackageOpen,
  uscita: Truck,
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
}

// ═══════════════════════════════════════════
// Catalogo e-commerce
// ═══════════════════════════════════════════
export const CATALOGO_ICONS = {
  cart: ShoppingCart,
  filters: SlidersHorizontal,
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
  conflitto_materiale: AlertTriangle,
  rientro_scaduto: RotateCcw,
  preventivo_stato: FileText,
  evento_stato_cambiato: Calendar,
  escalation: Megaphone,
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
