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

  // Status/feedback
  AlertTriangle,
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
  gadget: Gift,
  sedi: MapPin,
  zone: Map,
  utenti: Users,
  corrieri: Truck,
}

// ═══════════════════════════════════════════
// Feedback / alert
// ═══════════════════════════════════════════
export const FEEDBACK_ICONS = {
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
  error: XCircle,
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
}

export const CATEGORIA_ICONS = {
  logistica: Truck,
  marketing: FileText,
  materiale: Package,
  organizzazione: ClipboardList,
  amministrazione: Calculator,
}
