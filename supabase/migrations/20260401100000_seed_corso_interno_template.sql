-- Seed: Corso interno Monteviale — checklist + program template
-- Based on "VADEMECUM EVENTI MONTEVIALE" (Corso Paolo pattern)

-- 1. Add missing sub_activity_types
INSERT INTO sub_activity_types (nome)
SELECT nome FROM (VALUES
  ('registrazione'), ('preparazione_sala'), ('spesa'), ('assemblaggio')
) AS v(nome)
WHERE NOT EXISTS (SELECT 1 FROM sub_activity_types sat WHERE sat.nome = v.nome);

-- 2. Get the template ID for corso + interno
-- (seeded as 10000000-0000-0000-0000-000000000003)
DO $$
DECLARE
  tmpl_id uuid := '10000000-0000-0000-0000-000000000003';
  -- sub_activity_type IDs (resolved dynamically)
  t_registrazione uuid;
  t_coffee_break uuid;
  t_sessione_teorica uuid;
  t_sessione_pratica uuid;
  t_pranzo uuid;
  t_aperitivo uuid;
  t_preparazione_sala uuid;
  t_spesa uuid;
  t_assemblaggio uuid;
BEGIN
  -- Resolve type IDs
  SELECT id INTO t_registrazione FROM sub_activity_types WHERE nome = 'registrazione';
  SELECT id INTO t_coffee_break FROM sub_activity_types WHERE nome = 'coffee_break';
  SELECT id INTO t_sessione_teorica FROM sub_activity_types WHERE nome = 'sessione_teorica';
  SELECT id INTO t_sessione_pratica FROM sub_activity_types WHERE nome = 'sessione_pratica';
  SELECT id INTO t_pranzo FROM sub_activity_types WHERE nome = 'pranzo';
  SELECT id INTO t_aperitivo FROM sub_activity_types WHERE nome = 'aperitivo';
  SELECT id INTO t_preparazione_sala FROM sub_activity_types WHERE nome = 'preparazione_sala';
  SELECT id INTO t_spesa FROM sub_activity_types WHERE nome = 'spesa';
  SELECT id INTO t_assemblaggio FROM sub_activity_types WHERE nome = 'assemblaggio';

  -- Skip if template already has items
  IF EXISTS (SELECT 1 FROM template_items WHERE template_id = tmpl_id) THEN
    RAISE NOTICE 'Template corso interno already has items, skipping seed';
    RETURN;
  END IF;

  -- ═══════════════════════════════════════════
  -- CHECKLIST (tipo = 'checklist') — preparation activities
  -- ═══════════════════════════════════════════

  INSERT INTO template_items (template_id, tipo, descrizione, categoria, permesso_responsabile, giorni_prima_evento, obbligatorio, tipo_verifica, ordine) VALUES
  -- Logistica & spese
  (tmpl_id, 'checklist', 'Ordinare pasticcini da Righetto (3 pz/persona per pausa)', 'organizzazione', 'gestione_organizzazione', -3, true, 'manuale', 1),
  (tmpl_id, 'checklist', 'Spesa Tosano: acqua, coca cola, the, merendine, latte, tovaglioli, bicchieri, tovaglie blu', 'organizzazione', 'gestione_organizzazione', -2, true, 'manuale', 2),
  (tmpl_id, 'checklist', 'Spesa Tosano aperitivo: prosecco, patatine, arachidi, salatini, bicchieri plastica', 'organizzazione', 'gestione_organizzazione', -2, false, 'manuale', 3),
  (tmpl_id, 'checklist', 'Verificare scorta cialde caffè Ageda', 'organizzazione', 'gestione_organizzazione', -3, true, 'manuale', 4),

  -- Pranzi
  (tmpl_id, 'checklist', 'Ordinare tramezzini/panini da Bottega del Tramezzino (giovedì)', 'organizzazione', 'gestione_organizzazione', -3, true, 'manuale', 5),
  (tmpl_id, 'checklist', 'Ordinare pranzo da Cucina Tomasi (venerdì) — richiedere 2/3 proposte', 'organizzazione', 'gestione_organizzazione', -5, true, 'manuale', 6),
  (tmpl_id, 'checklist', 'Far approvare scelta pranzo a Enrica', 'organizzazione', 'gestione_organizzazione', -3, true, 'manuale', 7),
  (tmpl_id, 'checklist', 'Verificare intolleranze partecipanti e comunicarle ai fornitori', 'organizzazione', 'gestione_organizzazione', -5, true, 'manuale', 8),

  -- Materiale marketing
  (tmpl_id, 'checklist', 'Assemblare cartelline: penna, blocco, flyer QR-code, brochure, locandina', 'marketing', 'gestione_marketing', -3, true, 'manuale', 10),
  (tmpl_id, 'checklist', 'Stampare locandina da Grafiche Fabris', 'marketing', 'gestione_marketing', -7, true, 'manuale', 11),
  (tmpl_id, 'checklist', 'Stampare attestati da Grafiche Fabris', 'marketing', 'gestione_marketing', -5, true, 'manuale', 12),

  -- Badge
  (tmpl_id, 'checklist', 'Creare grafica badge per tutti (partecipanti, staff, agenti)', 'marketing', 'gestione_marketing', -5, true, 'manuale', 13),
  (tmpl_id, 'checklist', 'Stampare, ritagliare e assemblare badge con bustine e porta badge', 'organizzazione', 'gestione_organizzazione', -2, true, 'manuale', 14),

  -- Materiale demo
  (tmpl_id, 'checklist', 'Preparare pezzi DEMO per postazione relatore', 'materiale', 'gestione_magazzino', -3, true, 'manuale', 15),
  (tmpl_id, 'checklist', 'Preparare portachiavi con incisione laser (nomi e pezzi)', 'materiale', 'gestione_magazzino', -7, true, 'manuale', 16),
  (tmpl_id, 'checklist', 'Comporre kit workshop per ogni tavolo', 'materiale', 'gestione_magazzino', -2, true, 'manuale', 17),

  -- Sala
  (tmpl_id, 'checklist', 'Preparare postazione relatore: brochure, catalogo, poster, acqua, demo', 'organizzazione', 'gestione_organizzazione', -1, true, 'manuale', 20),
  (tmpl_id, 'checklist', 'Posizionare cartelline sulle sedie sala teorica', 'organizzazione', 'gestione_organizzazione', -1, true, 'manuale', 21),
  (tmpl_id, 'checklist', 'Preparare tavoli workshop: tovagliette blu, trapano, kit, osso', 'materiale', 'gestione_magazzino', -1, true, 'manuale', 22),
  (tmpl_id, 'checklist', 'Preparare tavolo ingresso: foglio presenze, badge in ordine alfabetico', 'organizzazione', 'gestione_organizzazione', -1, true, 'manuale', 23),
  (tmpl_id, 'checklist', 'Verificare pulizia e ordine area ingresso', 'organizzazione', 'gestione_organizzazione', -1, true, 'manuale', 24),

  -- Post-evento
  (tmpl_id, 'checklist', 'Mandare mail a Ivan+Danila con importo speso e motivazione', 'amministrazione', 'gestione_costi', 1, true, 'manuale', 30),
  (tmpl_id, 'checklist', 'Verificare rientro contenitori catering', 'organizzazione', 'gestione_organizzazione', 0, false, 'manuale', 31),
  (tmpl_id, 'checklist', 'Verificare rientro materiale demo', 'logistica', 'gestione_magazzino', 3, true, 'manuale', 32);

  -- ═══════════════════════════════════════════
  -- PROGRAMMA (tipo = 'sub_activity') — event schedule
  -- Corso Paolo pattern: giovedì pomeriggio + venerdì intera giornata
  -- ═══════════════════════════════════════════

  INSERT INTO template_items (template_id, tipo, descrizione, tipo_sotto_attivita_id, giorno, orario, durata_minuti, luogo, fornitore, ordine) VALUES
  -- GIORNO 1 (giovedì pomeriggio)
  (tmpl_id, 'sub_activity', 'Registrazione e accoglienza', t_registrazione, 1, '13:00', 30, 'Ingresso', NULL, 1),
  (tmpl_id, 'sub_activity', 'Sessione teorica', t_sessione_teorica, 1, '13:30', 120, 'Sala teorica', NULL, 2),
  (tmpl_id, 'sub_activity', 'Pausa caffè', t_coffee_break, 1, '15:30', 20, NULL, 'Righetto', 3),
  (tmpl_id, 'sub_activity', 'Sessione pratica', t_sessione_pratica, 1, '15:50', 120, 'Sala workshop', NULL, 4),
  (tmpl_id, 'sub_activity', 'Aperitivo', t_aperitivo, 1, '18:00', 60, NULL, 'Bottega del Tramezzino', 5),

  -- GIORNO 2 (venerdì intera giornata)
  (tmpl_id, 'sub_activity', 'Coffee break', t_coffee_break, 2, '08:30', 15, NULL, 'Righetto', 6),
  (tmpl_id, 'sub_activity', 'Sessione pratica mattina', t_sessione_pratica, 2, '08:45', 180, 'Sala workshop', NULL, 7),
  (tmpl_id, 'sub_activity', 'Pranzo', t_pranzo, 2, '12:15', 60, NULL, 'Cucina Tomasi', 8),
  (tmpl_id, 'sub_activity', 'Sessione pratica pomeriggio', t_sessione_pratica, 2, '13:30', 120, 'Sala workshop', NULL, 9),
  (tmpl_id, 'sub_activity', 'Pausa caffè', t_coffee_break, 2, '15:30', 15, NULL, 'Righetto', 10),
  (tmpl_id, 'sub_activity', 'Sessione pratica finale', t_sessione_pratica, 2, '15:45', 90, 'Sala workshop', NULL, 11),
  (tmpl_id, 'sub_activity', 'Consegna attestati e chiusura', t_registrazione, 2, '17:15', 30, 'Sala teorica', NULL, 12);

END $$;
