-- Readiness Engine: seed data

-- Magazzini
INSERT INTO magazzini (id, nome, indirizzo) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Monteviale', 'Via Monteviale, Monteviale (VI)'),
  ('20000000-0000-0000-0000-000000000002', 'Genova', 'Via Genova, Genova')
ON CONFLICT DO NOTHING;

-- Set magazzino_id for existing materials in 'in_magazzino' position
UPDATE materials SET magazzino_id = '20000000-0000-0000-0000-000000000001'
WHERE posizione_attuale = 'in_magazzino' AND magazzino_id IS NULL;

-- Update template_items with new fields for existing checklist items
-- Workshop template
UPDATE template_items SET categoria = 'marketing', tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000001' AND descrizione = 'Preparare locandina';

UPDATE template_items SET categoria = 'materiale', tipo_verifica = 'automatica', verifica_automatica = 'lista_materiale_compilata'
WHERE template_id = '10000000-0000-0000-0000-000000000001' AND descrizione = 'Ordinare materiale mancante';

UPDATE template_items SET categoria = 'logistica', tipo_verifica = 'automatica', verifica_automatica = 'materiale_tutto_spedito'
WHERE template_id = '10000000-0000-0000-0000-000000000001' AND descrizione = 'Preparare e spedire kit demo';

UPDATE template_items SET categoria = 'organizzazione', tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000001' AND descrizione = 'Confermare iscrizioni e inviare promemoria';

UPDATE template_items SET categoria = 'organizzazione', tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000001' AND descrizione = 'Verifica finale';

UPDATE template_items SET categoria = 'logistica', tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000001' AND descrizione = 'Verificare rientro materiale demo';

UPDATE template_items SET categoria = 'amministrazione', tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000001' AND descrizione = 'Compilare report e chiudere consuntivo';

-- Congresso template
UPDATE template_items SET categoria = 'marketing', tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000002' AND descrizione = 'Preparare materiale marketing';

UPDATE template_items SET categoria = 'logistica', tipo_verifica = 'automatica', verifica_automatica = 'materiale_tutto_spedito'
WHERE template_id = '10000000-0000-0000-0000-000000000002' AND descrizione = 'Preparare e spedire kit demo + gadget';

UPDATE template_items SET categoria = 'organizzazione', tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000002' AND descrizione = 'Prenotare hotel e trasporti staff';

UPDATE template_items SET categoria = 'logistica', tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000002' AND descrizione = 'Verificare rientro materiale';
