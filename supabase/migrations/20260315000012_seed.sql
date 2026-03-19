-- Mikai Eventi — Seed Data (development only)

INSERT INTO event_templates (id, tipo_evento, modalita, nome_template) VALUES
  ('10000000-0000-0000-0000-000000000001', 'workshop', 'interno', 'Workshop interno standard'),
  ('10000000-0000-0000-0000-000000000002', 'congresso', 'esterno', 'Congresso esterno standard'),
  ('10000000-0000-0000-0000-000000000003', 'corso', 'interno', 'Corso chirurgico interno');

INSERT INTO template_items (template_id, tipo, descrizione, assegnazione_ruolo_operativo, giorni_prima_evento, obbligatorio, pre_approvazione, ordine) VALUES
  ('10000000-0000-0000-0000-000000000001', 'checklist', 'Preparare locandina', 'marketing', -21, true, true, 1),
  ('10000000-0000-0000-0000-000000000001', 'checklist', 'Ordinare materiale mancante', 'logistica_ordini', -14, true, false, 2),
  ('10000000-0000-0000-0000-000000000001', 'checklist', 'Preparare e spedire kit demo', 'logistica_spedizioni', -7, true, false, 3),
  ('10000000-0000-0000-0000-000000000001', 'checklist', 'Confermare iscrizioni e inviare promemoria', 'segreteria_org', -3, true, false, 4),
  ('10000000-0000-0000-0000-000000000001', 'checklist', 'Verifica finale', 'segreteria_org', -1, true, false, 5),
  ('10000000-0000-0000-0000-000000000001', 'checklist', 'Verificare rientro materiale demo', 'logistica_spedizioni', 3, true, false, 6),
  ('10000000-0000-0000-0000-000000000001', 'checklist', 'Compilare report e chiudere consuntivo', 'segreteria_org', 7, false, false, 7);

INSERT INTO template_items (template_id, tipo, descrizione, assegnazione_ruolo_operativo, giorni_prima_evento, obbligatorio, pre_approvazione, ordine) VALUES
  ('10000000-0000-0000-0000-000000000002', 'checklist', 'Preparare materiale marketing', 'marketing', -21, true, true, 1),
  ('10000000-0000-0000-0000-000000000002', 'checklist', 'Preparare e spedire kit demo + gadget', 'logistica_spedizioni', -10, true, false, 2),
  ('10000000-0000-0000-0000-000000000002', 'checklist', 'Prenotare hotel e trasporti staff', 'segreteria_org', -14, true, false, 3),
  ('10000000-0000-0000-0000-000000000002', 'checklist', 'Verificare rientro materiale', 'logistica_spedizioni', 3, true, false, 4);

INSERT INTO approval_thresholds (tipo_evento, soglia_importo, area_manager_can_approve) VALUES
  (NULL, 5000, true),
  ('congresso', 10000, true);

INSERT INTO materials (id, nome, tipo, codice_inventario, quantita_totale, posizione_attuale) VALUES
  (gen_random_uuid(), 'Kit Stylo #1', 'demo_kit', 'KIT-STYLO-001', 1, 'magazzino'),
  (gen_random_uuid(), 'Kit Stylo #2', 'demo_kit', 'KIT-STYLO-002', 1, 'magazzino'),
  (gen_random_uuid(), 'Kit Stylo #3', 'demo_kit', 'KIT-STYLO-003', 1, 'magazzino'),
  (gen_random_uuid(), 'Kit MiniStylo #1', 'demo_kit', 'KIT-MINI-001', 1, 'magazzino'),
  (gen_random_uuid(), 'Kit MiniStylo #2', 'demo_kit', 'KIT-MINI-002', 1, 'magazzino'),
  (gen_random_uuid(), 'Vela espositiva grande', 'montaggio', 'VEL-001', 2, 'magazzino'),
  (gen_random_uuid(), 'Kit strumentario MMC', 'strumentario', 'STR-MMC-001', 1, 'magazzino');

INSERT INTO gadgets (nome, quantita_disponibile, soglia_minima, fornitore_abituale) VALUES
  ('Penne Mikai', 500, 100, 'Tipografia Rossi'),
  ('Borse congresso', 200, 50, 'Tipografia Rossi'),
  ('Block notes A5', 300, 80, 'Tipografia Rossi'),
  ('USB 16GB brandizzate', 100, 30, 'PromoGadget Srl');
