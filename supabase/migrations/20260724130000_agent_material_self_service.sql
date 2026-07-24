-- ============================================================
-- Intervento 3 — Self-service agente sul materiale
-- L'agente che detiene un esemplare (materials.presso_utente_id = auth.uid())
-- puo' segnalarne il rientro, confermare il possesso, o segnalarlo perso/consumato,
-- direttamente dal proprio dashboard. Le scritture su materials/notifications sono
-- vietate ai commerciali dalle RLS, quindi passiamo da una funzione SECURITY DEFINER
-- che valida rigorosamente la proprieta' prima di agire.
-- ============================================================

-- ── 1. Colonne-segnale additive su materials (nullable, idempotenti) ──
ALTER TABLE materials ADD COLUMN IF NOT EXISTS rientro_richiesto_at timestamptz;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS possesso_confermato_at timestamptz;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS segnalato_perso_at timestamptz;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS segnalazione_foto_url text;

-- ── 2. Nuovo tipo notifica: segnalazione agente -> magazzino ──
-- Rigenera il CHECK includendo tutti i valori esistenti + 'rientro_richiesto_agente'.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_tipo_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_tipo_check
  CHECK (tipo IN (
    'approvazione_richiesta',
    'approvazione_completata',
    'attivita_scaduta',
    'attivita_in_scadenza',
    'attivita_assegnata',
    'attivita_non_assegnata',
    'conflitto_materiale',
    'rientro_scaduto',
    'sollecito_rientro',
    'rientro_richiesto_agente',
    'preventivo_stato',
    'evento_stato_cambiato',
    'evento_imminente',
    'escalation',
    'materiale_approvato',
    'materiale_rifiutato',
    'materiale_in_preparazione',
    'materiale_spedito',
    'materiale_rientrato',
    'staff_assegnato',
    'staff_rimosso'
  ));

-- ── 3. RPC: l'agente segnala un'azione sul proprio esemplare ──
-- p_azione: 'rientro' | 'ack' | 'perso'
--   rientro -> registra rientro_richiesto_at + notifica il magazzino (rientro in arrivo)
--   ack     -> registra possesso_confermato_at (nessuna notifica, non distruttivo)
--   perso   -> registra segnalato_perso_at (+ foto) + notifica il magazzino
-- L'esemplare NON cambia posizione: la chiusura resta al back-office (registerBulkReturn).
CREATE OR REPLACE FUNCTION agent_flag_material(
  p_material_id uuid,
  p_azione text,
  p_note text DEFAULT NULL,
  p_foto_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _mat RECORD;
  _agent RECORD;
  _recipient RECORD;
  _gruppo text;
  _titolo text;
  _msg text;
BEGIN
  IF p_azione NOT IN ('rientro', 'ack', 'perso') THEN
    RAISE EXCEPTION 'Azione non valida';
  END IF;

  SELECT m.id, m.nome, m.presso_utente_id, m.attivo,
         COALESCE(p.nome, m.nome) AS product_name
  INTO _mat
  FROM materials m
  LEFT JOIN products p ON p.id = m.product_id
  WHERE m.id = p_material_id;

  IF _mat.id IS NULL THEN
    RAISE EXCEPTION 'Materiale non trovato';
  END IF;

  -- Guardia di proprieta': solo chi detiene fisicamente l'esemplare puo' segnalarlo.
  IF _mat.presso_utente_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Non autorizzato: questo materiale non risulta presso di te';
  END IF;

  SELECT nome, cognome INTO _agent FROM users WHERE id = auth.uid();

  -- ── ACK: solo timestamp, nessuna notifica ──
  IF p_azione = 'ack' THEN
    UPDATE materials SET possesso_confermato_at = now() WHERE id = p_material_id;
    RETURN;
  END IF;

  -- ── RIENTRO ──
  IF p_azione = 'rientro' THEN
    UPDATE materials SET rientro_richiesto_at = now() WHERE id = p_material_id;
    _titolo := 'Rientro in arrivo: ' || _mat.product_name;
    _msg := COALESCE(_agent.nome || ' ' || _agent.cognome, 'Un agente')
            || ' ha segnalato che riporta questo materiale al magazzino'
            || COALESCE(' — ' || p_note, '');
    _gruppo := 'agent_return_' || p_material_id::text || '_' || to_char(now(), 'YYYYMMDD');

  -- ── PERSO / CONSUMATO ──
  ELSE
    UPDATE materials
      SET segnalato_perso_at = now(),
          segnalazione_foto_url = COALESCE(p_foto_url, segnalazione_foto_url)
      WHERE id = p_material_id;
    _titolo := 'Materiale segnalato perso/consumato: ' || _mat.product_name;
    _msg := COALESCE(_agent.nome || ' ' || _agent.cognome, 'Un agente')
            || ' ha segnalato questo materiale come consumato o perso'
            || COALESCE(' — ' || p_note, '');
    _gruppo := 'agent_lost_' || p_material_id::text || '_' || to_char(now(), 'YYYYMMDD');
  END IF;

  -- Notifica il team magazzino/spedizioni (dedup giornaliero per gruppo).
  FOR _recipient IN
    SELECT DISTINCT u.id
    FROM users u
    JOIN user_permissions up ON up.user_id = u.id
    WHERE up.permission IN ('gestione_magazzino', 'gestione_spedizioni')
      AND u.attivo = true
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.gruppo = _gruppo AND n.user_id = u.id
      )
  LOOP
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      _recipient.id,
      'rientro_richiesto_agente',
      _titolo,
      _msg,
      '/materiale/' || p_material_id::text,
      'Vai al materiale',
      'material',
      p_material_id,
      _gruppo
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION agent_flag_material(uuid, text, text, text) TO authenticated;
