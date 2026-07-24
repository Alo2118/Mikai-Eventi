#!/usr/bin/env bash
#
# deploy-ondate.sh — Deploy backend per lo Studio funzionale (Ondate 1-2-3).
#
# Esegue, NELL'ORDINE CORRETTO:
#   1) db push        → applica le 6 migrazioni (email_deliveries, notification_evento_imminente,
#                        costi_trasferta, agent_material_self_service, push_subscriptions,
#                        reset_agent_flags_on_owner_change)
#   2) secret         → imposta i secret delle edge function SE presenti nell'ambiente
#   3) functions      → deploya deadline-checker, email-digest, send-push (DOPO il db push)
#
# NB: NON tocca il frontend (GitHub Pages fa il deploy da solo al push/merge su master).
#     Le feature restano INERTI finché mancano i secret (email senza RESEND_API_KEY,
#     push senza chiavi VAPID) — nessuna rottura, solo nessun invio.
#
# Uso:
#   ./scripts/deploy-ondate.sh              # esegue tutti i passi, con conferme
#   ./scripts/deploy-ondate.sh --dry-run    # mostra cosa farebbe, senza eseguire
#   ./scripts/deploy-ondate.sh db           # solo il db push
#   ./scripts/deploy-ondate.sh secrets      # solo i secret
#   ./scripts/deploy-ondate.sh functions    # solo il deploy delle edge function
#
# Prerequisiti: .env con SUPABASE_ACCESS_TOKEN e SUPABASE_DB_PASSWORD; progetto già linkato
#   (npx supabase link --project-ref ncjpbbvlucquopyihios). Per i secret, esporta prima le
#   variabili che vuoi impostare (vedi sezione "secrets" sotto).

set -euo pipefail

cd "$(dirname "$0")/.."

DRY_RUN=0
STEP="all"
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    db|secrets|functions|all) STEP="$arg" ;;
    *) echo "Argomento sconosciuto: $arg" >&2; exit 2 ;;
  esac
done

FUNCTIONS=(deadline-checker email-digest send-push)

# --- colori/log -------------------------------------------------------------
c()   { printf '\033[1;34m%s\033[0m\n' "$*"; }   # info
ok()  { printf '\033[1;32m%s\033[0m\n' "$*"; }   # ok
warn(){ printf '\033[1;33m%s\033[0m\n' "$*"; }   # warn
die() { printf '\033[1;31m%s\033[0m\n' "$*" >&2; exit 1; }

run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    printf '  [dry-run] %s\n' "$*"
  else
    eval "$@"
  fi
}

confirm() {
  [[ $DRY_RUN -eq 1 ]] && return 0
  read -r -p "$1 [s/N] " r
  [[ "$r" == "s" || "$r" == "S" ]]
}

# --- prerequisiti -----------------------------------------------------------
[[ -f .env ]] || die "Manca il file .env nella root del progetto."
# shellcheck disable=SC1091
set -a; source .env; set +a
: "${SUPABASE_ACCESS_TOKEN:?Manca SUPABASE_ACCESS_TOKEN in .env}"
: "${SUPABASE_DB_PASSWORD:?Manca SUPABASE_DB_PASSWORD in .env}"
command -v npx >/dev/null || die "npx non trovato."

SB="npx supabase"

# --- 1) DB PUSH -------------------------------------------------------------
step_db() {
  c "== 1) DB PUSH — migrazioni da applicare =="
  SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" $SB migration list -p "$SUPABASE_DB_PASSWORD" || \
    warn "(migration list non disponibile: procedo comunque con la preview del push)"
  if confirm "Applicare le migrazioni al DB di PRODUZIONE?"; then
    run "SUPABASE_ACCESS_TOKEN=\"$SUPABASE_ACCESS_TOKEN\" $SB db push -p \"$SUPABASE_DB_PASSWORD\""
    ok "DB push completato."
  else
    warn "DB push saltato."
  fi
}

# --- 2) SECRET --------------------------------------------------------------
# Imposta un secret SOLO se la variabile d'ambiente corrispondente è valorizzata.
# Esempio:  RESEND_API_KEY=... VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... ./scripts/deploy-ondate.sh secrets
step_secrets() {
  c "== 2) SECRET edge function =="
  local pairs=(
    "RESEND_API_KEY"   "email-digest"
    "RESEND_FROM"      "email-digest"
    "VAPID_PUBLIC_KEY" "send-push"
    "VAPID_PRIVATE_KEY" "send-push"
    "VAPID_SUBJECT"    "send-push"
  )
  local to_set=()
  local i
  for ((i=0; i<${#pairs[@]}; i+=2)); do
    local name="${pairs[i]}"
    if [[ -n "${!name:-}" ]]; then
      to_set+=("$name=${!name}")
      ok "  trovato: $name (per ${pairs[i+1]})"
    else
      warn "  assente: $name — salterò (impostalo a mano quando pronto)"
    fi
  done
  if [[ ${#to_set[@]} -eq 0 ]]; then
    warn "Nessun secret nell'ambiente: passo saltato. (Vedi commenti nello script.)"
    return 0
  fi
  if confirm "Impostare ${#to_set[@]} secret su Supabase?"; then
    run "SUPABASE_ACCESS_TOKEN=\"$SUPABASE_ACCESS_TOKEN\" $SB secrets set ${to_set[*]}"
    ok "Secret impostati."
  else
    warn "Secret saltati."
  fi
}

# --- 3) EDGE FUNCTIONS ------------------------------------------------------
step_functions() {
  c "== 3) DEPLOY edge functions (dopo il db push) =="
  local f
  for f in "${FUNCTIONS[@]}"; do
    [[ -d "supabase/functions/$f" ]] || { warn "  $f: cartella assente, salto."; continue; }
    c "  deploy: $f"
    run "SUPABASE_ACCESS_TOKEN=\"$SUPABASE_ACCESS_TOKEN\" $SB functions deploy $f"
  done
  ok "Edge functions deployate."
}

# --- run --------------------------------------------------------------------
[[ $DRY_RUN -eq 1 ]] && warn "*** DRY-RUN: nessun comando verrà eseguito ***"
case "$STEP" in
  db)        step_db ;;
  secrets)   step_secrets ;;
  functions) step_functions ;;
  all)       step_db; echo; step_secrets; echo; step_functions ;;
esac

echo
ok "Fatto."
cat <<'NOTE'

── PROMEMORIA (passi manuali che questo script NON copre) ──────────────────
• Frontend / web push: metti la chiave PUBBLICA VAPID come VITE_VAPID_PUBLIC_KEY
  nei GitHub repository secrets (usata dal build di deploy). Senza, la sezione
  push resta nascosta/inerte.
• Verifica il dominio mittente su Resend (record DNS SPF/DKIM) prima di inviare
  email da un indirizzo @mikai.it.
• Cablare send-push: oggi la function è pronta ma NON è invocata da nessun
  trigger/cron. Aggancia una chiamata HTTP (user_ids/tipo/title/body/url) dai
  punti che creano le notifiche, o da un cron che legge le notifiche nuove.
• Genera le chiavi VAPID (se non fatto):  npx web-push generate-vapid-keys
• Test prima del rollout: invia email/push a 2-3 indirizzi e controlla la tabella
  email_deliveries prima di lasciar girare i cron per tutti.
────────────────────────────────────────────────────────────────────────────
NOTE
