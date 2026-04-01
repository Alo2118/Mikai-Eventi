-- Import Demo Kits from "kit demo.pdf"
-- Each kit = product (tipo demo_kit) + kit_contents (demo pieces + strumentario)
-- Brand: Mikai (b0000001-0000-0000-0000-000000000001)

-- ═══════════════════════════════════════════
-- 1. Insert 16 demo kit products
-- ═══════════════════════════════════════════
INSERT INTO products (id, brand_id, nome, descrizione, codice, tipo, serializzato) VALUES
  -- Stylo family
  ('e0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo ClickIt Stylo', 'Fissatore esterno da polso — kit demo completo', 'KIT-CLICKIT-STYLO', 'demo_kit', true),
  ('e0000002-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo Stylo Calcagno', 'Fissatore esterno calcagno — kit demo completo', 'KIT-STYLO-CALCAGNO', 'demo_kit', true),
  ('e0000003-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo Stylo Piede Diabetico', 'Fissatore esterno piede diabetico — kit demo completo', 'KIT-STYLO-DIABETICO', 'demo_kit', true),
  -- VCA / BSS
  ('e0000004-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo VCA', 'Viti piede piatto — kit demo', 'KIT-VCA', 'demo_kit', true),
  ('e0000005-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo BSS', 'Viti piccoli segmenti — kit demo', 'KIT-BSS', 'demo_kit', true),
  -- MiniStylo
  ('e0000006-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo MiniStylo', 'Mini fissatore esterno da polso — kit demo completo', 'KIT-MINISTYLO', 'demo_kit', true),
  -- ClickIt Smart
  ('e0000007-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo ClickIt Smart', 'Fissatore ClickIt Smart — kit demo', 'KIT-CLICKIT-SMART', 'demo_kit', true),
  -- FEP family
  ('e0000008-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo FEP Shoulder', 'Fissatore esterno polivalente spalla — kit demo completo', 'KIT-FEP-SHOULDER', 'demo_kit', true),
  ('e0000009-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo FEP Medio', 'Fissatore esterno polivalente medio — kit demo completo', 'KIT-FEP-MEDIO', 'demo_kit', true),
  -- ClickIt Shoulder
  ('e0000010-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo ClickIt Shoulder', 'Fissatore ClickIt spalla — kit demo completo', 'KIT-CLICKIT-SHOULDER', 'demo_kit', true),
  -- ER family
  ('e0000011-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo ER Elbow', 'Fissatore ER gomito — kit demo completo', 'KIT-ER-ELBOW', 'demo_kit', true),
  ('e0000012-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo ER Ibrido (Dimostrativo)', 'Fissatore ER ibrido — kit dimostrativo', 'KIT-ER-IBRIDO', 'demo_kit', true),
  ('e0000013-0000-0000-0000-000000000013', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo ER Pelvis', 'Fissatore ER bacino — kit demo completo', 'KIT-ER-PELVIS', 'demo_kit', true),
  ('e0000014-0000-0000-0000-000000000014', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo ER Pilone Tibiale Plus', 'Fissatore ER pilone tibiale — kit demo completo', 'KIT-ER-PILONE-TIBIALE', 'demo_kit', true),
  ('e0000015-0000-0000-0000-000000000015', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo ER Universale', 'Fissatore ER universale — kit dimostrativo', 'KIT-ER-UNIVERSALE', 'demo_kit', true),
  -- ClickIt CF
  ('e0000016-0000-0000-0000-000000000016', 'b0000001-0000-0000-0000-000000000001', 'Kit Demo ClickIt CF (Dimostrativo)', 'Fissatore ClickIt CF — kit dimostrativo', 'KIT-CLICKIT-CF', 'demo_kit', true)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════
-- 2. Body section links
-- ═══════════════════════════════════════════
-- Body section IDs:
--   Polso    = a0000001-...-01
--   Mano     = a0000002-...-02
--   Gomito   = a0000003-...-03
--   Spalla   = a0000004-...-04
--   Piede    = a0000005-...-05
--   Caviglia = a0000006-...-06
--   Gamba    = a0000007-...-07
--   Ginocchio= a0000008-...-08
--   Anca     = a0000009-...-09
--   Colonna  = a0000010-...-10
--   Omero    = a0000011-...-11
--   Femore   = a0000012-...-12
--   Tibia    = a0000013-...-13
--   Bacino   = a0000014-...-14

INSERT INTO product_body_sections (product_id, body_section_id) VALUES
  -- ClickIt Stylo → Polso, Mano
  ('e0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001'),
  ('e0000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002'),
  -- Stylo Calcagno → Caviglia, Piede
  ('e0000002-0000-0000-0000-000000000002', 'a0000006-0000-0000-0000-000000000006'),
  ('e0000002-0000-0000-0000-000000000002', 'a0000005-0000-0000-0000-000000000005'),
  -- Stylo Piede Diabetico → Piede
  ('e0000003-0000-0000-0000-000000000003', 'a0000005-0000-0000-0000-000000000005'),
  -- VCA → Piede
  ('e0000004-0000-0000-0000-000000000004', 'a0000005-0000-0000-0000-000000000005'),
  -- BSS → Mano, Piede
  ('e0000005-0000-0000-0000-000000000005', 'a0000002-0000-0000-0000-000000000002'),
  ('e0000005-0000-0000-0000-000000000005', 'a0000005-0000-0000-0000-000000000005'),
  -- MiniStylo → Polso, Mano
  ('e0000006-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001'),
  ('e0000006-0000-0000-0000-000000000006', 'a0000002-0000-0000-0000-000000000002'),
  -- ClickIt Smart → Polso, Mano
  ('e0000007-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001'),
  ('e0000007-0000-0000-0000-000000000007', 'a0000002-0000-0000-0000-000000000002'),
  -- FEP Shoulder → Spalla
  ('e0000008-0000-0000-0000-000000000008', 'a0000004-0000-0000-0000-000000000004'),
  -- FEP Medio → Gomito
  ('e0000009-0000-0000-0000-000000000009', 'a0000003-0000-0000-0000-000000000003'),
  -- ClickIt Shoulder → Spalla
  ('e0000010-0000-0000-0000-000000000010', 'a0000004-0000-0000-0000-000000000004'),
  -- ER Elbow → Gomito
  ('e0000011-0000-0000-0000-000000000011', 'a0000003-0000-0000-0000-000000000003'),
  -- ER Ibrido → Gomito, Gamba
  ('e0000012-0000-0000-0000-000000000012', 'a0000003-0000-0000-0000-000000000003'),
  ('e0000012-0000-0000-0000-000000000012', 'a0000007-0000-0000-0000-000000000007'),
  -- ER Pelvis → Bacino, Anca
  ('e0000013-0000-0000-0000-000000000013', 'a0000014-0000-0000-0000-000000000014'),
  ('e0000013-0000-0000-0000-000000000013', 'a0000009-0000-0000-0000-000000000009'),
  -- ER Pilone Tibiale Plus → Tibia, Gamba
  ('e0000014-0000-0000-0000-000000000014', 'a0000013-0000-0000-0000-000000000013'),
  ('e0000014-0000-0000-0000-000000000014', 'a0000007-0000-0000-0000-000000000007'),
  -- ER Universale → multi (Gomito, Gamba, Tibia)
  ('e0000015-0000-0000-0000-000000000015', 'a0000003-0000-0000-0000-000000000003'),
  ('e0000015-0000-0000-0000-000000000015', 'a0000007-0000-0000-0000-000000000007'),
  ('e0000015-0000-0000-0000-000000000015', 'a0000013-0000-0000-0000-000000000013'),
  -- ClickIt CF → multi (Gomito, Spalla, Gamba, Bacino)
  ('e0000016-0000-0000-0000-000000000016', 'a0000003-0000-0000-0000-000000000003'),
  ('e0000016-0000-0000-0000-000000000016', 'a0000004-0000-0000-0000-000000000004'),
  ('e0000016-0000-0000-0000-000000000016', 'a0000007-0000-0000-0000-000000000007'),
  ('e0000016-0000-0000-0000-000000000016', 'a0000014-0000-0000-0000-000000000014')
ON CONFLICT (product_id, body_section_id) DO NOTHING;

-- ═══════════════════════════════════════════
-- 3. Kit contents (demo pieces + strumentario)
-- ═══════════════════════════════════════════

-- ── ClickIt Stylo ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  -- Demo
  ('e0000001-0000-0000-0000-000000000001', 'Corpo fissatore', NULL, 1),
  ('e0000001-0000-0000-0000-000000000001', 'Arco', '5002016', 1),
  ('e0000001-0000-0000-0000-000000000001', 'Raccordo a binario', '5002015', 1),
  ('e0000001-0000-0000-0000-000000000001', 'Morsetto singolo', '5000004', 1),
  ('e0000001-0000-0000-0000-000000000001', 'Morsetto singolo', '5002010', 1),
  ('e0000001-0000-0000-0000-000000000001', 'Morsetto singolo aperto', '5002010A', 1),
  ('e0000001-0000-0000-0000-000000000001', 'Morsetto doppio prolungato', '5002011', 1),
  ('e0000001-0000-0000-0000-000000000001', 'Morsetto doppio', '5002022', 2),
  ('e0000001-0000-0000-0000-000000000001', 'Vite autoperforante L 70', '5002402', 2),
  ('e0000001-0000-0000-0000-000000000001', 'Vite autoperforante L 60', '5002412', 2),
  ('e0000001-0000-0000-0000-000000000001', 'Filo filettato', '5002431', 1),
  ('e0000001-0000-0000-0000-000000000001', 'Prolunga stylo (se possibile da 40)', NULL, 1),
  -- Strumentario
  ('e0000001-0000-0000-0000-000000000001', '[S] Chiave piana da 10 mm', '5000623', 1),
  ('e0000001-0000-0000-0000-000000000001', '[S] Chiave a T da 3.0-5.0 mm', '5000625', 1),
  ('e0000001-0000-0000-0000-000000000001', '[S] Chiave a T da 10 mm', '5000214', 1),
  ('e0000001-0000-0000-0000-000000000001', '[S] Cannula doppia', '5002072', 1),
  ('e0000001-0000-0000-0000-000000000001', '[S] Chiave per grani da 3.0 mm', '5000124', 1),
  ('e0000001-0000-0000-0000-000000000001', '[S] Unità compres./distraz.', '5002024', 1),
  ('e0000001-0000-0000-0000-000000000001', '[S] Prolunga per vite', '5002056', 1),
  ('e0000001-0000-0000-0000-000000000001', '[S] Chiave brugola Ø 5 mm', NULL, 1);

-- ── Stylo Calcagno ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  -- Demo
  ('e0000002-0000-0000-0000-000000000002', 'Corpo fissatore', '5002020', 1),
  ('e0000002-0000-0000-0000-000000000002', 'Raccordo a binario', '5002015', 1),
  ('e0000002-0000-0000-0000-000000000002', 'Arco', '5002016', 1),
  ('e0000002-0000-0000-0000-000000000002', 'Morsetto singolo per arco', '5000004', 2),
  ('e0000002-0000-0000-0000-000000000002', 'Morsetto doppio', '5002012', 2),
  ('e0000002-0000-0000-0000-000000000002', 'Morsetto singolo', '5002010', 1),
  ('e0000002-0000-0000-0000-000000000002', 'Morsetto singolo aperto', '5002010A', 1),
  ('e0000002-0000-0000-0000-000000000002', 'Morsetto doppio prolungato', '5002011', 1),
  ('e0000002-0000-0000-0000-000000000002', 'Vite corticale L 80', '5002414', 6),
  ('e0000002-0000-0000-0000-000000000002', 'Filo filettato', '5002431', 1),
  ('e0000002-0000-0000-0000-000000000002', 'Prolunghe stylo (2 misure)', NULL, 2),
  -- Strumentario
  ('e0000002-0000-0000-0000-000000000002', '[S] Chiave piana da 10 mm', '5000623', 1),
  ('e0000002-0000-0000-0000-000000000002', '[S] Chiave a T da 3.0-5.0 mm', '5000625', 1),
  ('e0000002-0000-0000-0000-000000000002', '[S] Chiave a T da 10 mm', '5000214', 1),
  ('e0000002-0000-0000-0000-000000000002', '[S] Chiave brugola Ø 3 mm', '5006000', 1),
  ('e0000002-0000-0000-0000-000000000002', '[S] Cannula doppia', '5002070', 1),
  ('e0000002-0000-0000-0000-000000000002', '[S] Cannula singola (opzionale)', '5000130', 1),
  ('e0000002-0000-0000-0000-000000000002', '[S] Prolunga per vite', '5002056', 1);

-- ── Stylo Piede Diabetico ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  -- Demo
  ('e0000003-0000-0000-0000-000000000003', 'Corpo fissatore', '5002020', 1),
  ('e0000003-0000-0000-0000-000000000003', 'Morsetto stylo calcagno', '5002012', 2),
  ('e0000003-0000-0000-0000-000000000003', 'Arco', '5002016', 1),
  ('e0000003-0000-0000-0000-000000000003', 'Morsetto singolo per arco', '5000004', 1),
  ('e0000003-0000-0000-0000-000000000003', 'Morsetto singolo aperto', '5002010A', 1),
  ('e0000003-0000-0000-0000-000000000003', 'Vite corticale L 80', '5002414', 2),
  ('e0000003-0000-0000-0000-000000000003', 'Vite corticale', '5002402', 4),
  ('e0000003-0000-0000-0000-000000000003', 'Filo filettato', '5002431', 1),
  -- Strumentario
  ('e0000003-0000-0000-0000-000000000003', '[S] Chiave piana da 10 mm', '5000623', 1),
  ('e0000003-0000-0000-0000-000000000003', '[S] Chiave a T da 3.0-5.0 mm', '5000625', 1),
  ('e0000003-0000-0000-0000-000000000003', '[S] Chiave a T da 10 mm', '5000214', 1),
  ('e0000003-0000-0000-0000-000000000003', '[S] Cannula doppia', '5002070', 1),
  ('e0000003-0000-0000-0000-000000000003', '[S] Prolunga per vite (opzionale)', '5002056', 1);

-- ── VCA ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  ('e0000004-0000-0000-0000-000000000004', 'VCA varie misure', NULL, 2),
  ('e0000004-0000-0000-0000-000000000004', '[S] Perforatore', '5000431', 1),
  ('e0000004-0000-0000-0000-000000000004', '[S] Cacciavite', '5000430', 1);

-- ── BSS ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  ('e0000005-0000-0000-0000-000000000005', 'BSS varie misure', NULL, 2),
  ('e0000005-0000-0000-0000-000000000005', '[S] Blocchetto BSS', NULL, 1),
  ('e0000005-0000-0000-0000-000000000005', '[S] Asta Ø 3.0 mm', '5003058', 1),
  ('e0000005-0000-0000-0000-000000000005', '[S] Asta Ø 2.5 mm', '5003068', 1),
  ('e0000005-0000-0000-0000-000000000005', '[S] Manico universale', '5003069', 1);

-- ── MiniStylo ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  -- Demo
  ('e0000006-0000-0000-0000-000000000006', 'Corpo fissatore', NULL, 1),
  ('e0000006-0000-0000-0000-000000000006', 'Morsetto singolo', '5002210', 2),
  ('e0000006-0000-0000-0000-000000000006', 'Morsetto singolo aperto', '5002210A', 1),
  ('e0000006-0000-0000-0000-000000000006', 'Morsetto doppio prolungato', '5002211', 1),
  ('e0000006-0000-0000-0000-000000000006', 'Morsetto doppio monolaterale', '5002212', 2),
  ('e0000006-0000-0000-0000-000000000006', 'Vite corticale', '5002422', 4),
  ('e0000006-0000-0000-0000-000000000006', 'Prolunga da 15 mm', '5002206', 1),
  ('e0000006-0000-0000-0000-000000000006', 'Filo filettato', '5002431', 1),
  -- Strumentario
  ('e0000006-0000-0000-0000-000000000006', '[S] Chiave a brugola 3.0 mm', NULL, 1),
  ('e0000006-0000-0000-0000-000000000006', '[S] Chiave piana Ø 5.5', NULL, 2),
  ('e0000006-0000-0000-0000-000000000006', '[S] Chiave a T da 8.0 mm', '5002225', 1),
  ('e0000006-0000-0000-0000-000000000006', '[S] Chiave a croce', '5000214', 1),
  ('e0000006-0000-0000-0000-000000000006', '[S] Cannula singola Ø 2.0 mm', '5002230', 1),
  ('e0000006-0000-0000-0000-000000000006', '[S] Cannula doppia Ø 2.0 mm', '5002235', 1),
  ('e0000006-0000-0000-0000-000000000006', '[S] Prolunga per vite', '5002056', 1);

-- ── ClickIt Smart ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  ('e0000007-0000-0000-0000-000000000007', 'Fili da 1.5', NULL, 4),
  ('e0000007-0000-0000-0000-000000000007', 'Asta filettata completa di dadi', NULL, 1),
  ('e0000007-0000-0000-0000-000000000007', 'Arco completo di morsetti', NULL, 2),
  ('e0000007-0000-0000-0000-000000000007', 'Morsetto arco Smart', '5002504', 4),
  -- Strumentario
  ('e0000007-0000-0000-0000-000000000007', '[S] Chiave piana da 5.5-8.0 mm', '5002220', 1),
  ('e0000007-0000-0000-0000-000000000007', '[S] Chiave da 2.5 mm', NULL, 1);

-- ── FEP Shoulder ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  -- Demo
  ('e0000008-0000-0000-0000-000000000008', 'Barra a binario L 220 mm', '5000005', 1),
  ('e0000008-0000-0000-0000-000000000008', 'Raccordo ad arco 90° Ø 120 mm', '5000080', 1),
  ('e0000008-0000-0000-0000-000000000008', 'Morsetto singolo per perno', '5002010', 2),
  ('e0000008-0000-0000-0000-000000000008', 'Morsetto singolo FEP', '5000002', 4),
  ('e0000008-0000-0000-0000-000000000008', 'Perno di supporto completo', '5000006', 1),
  ('e0000008-0000-0000-0000-000000000008', 'Vite autoperforante', '5000569', 2),
  ('e0000008-0000-0000-0000-000000000008', 'Filo di K liscio', '5000597', 2),
  ('e0000008-0000-0000-0000-000000000008', 'Filo filettato', '5000610', 2),
  -- Strumentario
  ('e0000008-0000-0000-0000-000000000008', '[S] Cacciavite esagonale da 3.0 mm', '5000124', 1),
  ('e0000008-0000-0000-0000-000000000008', '[S] Chiave piana 10-12 mm', '5006002', 1),
  ('e0000008-0000-0000-0000-000000000008', '[S] Chiave piana 19-23 mm', '5000123', 1),
  ('e0000008-0000-0000-0000-000000000008', '[S] Chiave a T per viti Ø 4.0 mm', '5000600', 1);

-- ── FEP Medio ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  -- Demo
  ('e0000009-0000-0000-0000-000000000009', 'FEP medio', NULL, 1),
  ('e0000009-0000-0000-0000-000000000009', 'Morsetto doppio', '5000003', 1),
  ('e0000009-0000-0000-0000-000000000009', 'Morsetto singolo', '5000002', 1),
  ('e0000009-0000-0000-0000-000000000009', 'Raccordo ad arco 90° 120 Ø', '5000080', 1),
  ('e0000009-0000-0000-0000-000000000009', 'Viti autoperforante', '5000539', 6),
  -- Strumentario
  ('e0000009-0000-0000-0000-000000000009', '[S] Manico', '5000120', 1),
  ('e0000009-0000-0000-0000-000000000009', '[S] Chiave 19/23', '5000123', 1),
  ('e0000009-0000-0000-0000-000000000009', '[S] Chiave a L Ø 12', '5000140', 1),
  ('e0000009-0000-0000-0000-000000000009', '[S] Chiave per grani', '5000124', 1),
  ('e0000009-0000-0000-0000-000000000009', '[S] Brugola Ø 3.0 mm', '5006000', 1),
  ('e0000009-0000-0000-0000-000000000009', '[S] Chiave a T Ø 12', '5000121', 1),
  ('e0000009-0000-0000-0000-000000000009', '[S] Chiave a T Ø 5.0', '5000601', 1);

-- ── ClickIt Shoulder ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  -- Demo
  ('e0000010-0000-0000-0000-000000000010', 'Barra in carbonio 250 mm', '5006.25', 2),
  ('e0000010-0000-0000-0000-000000000010', 'Barra in carbonio 150 mm', '5006.15', 2),
  ('e0000010-0000-0000-0000-000000000010', 'Morsetto barra/barra', '5006514', 4),
  ('e0000010-0000-0000-0000-000000000010', 'Morsetto fili', '5006516', 3),
  ('e0000010-0000-0000-0000-000000000010', 'Filo filettato', '5006510', 6),
  -- Strumentario
  ('e0000010-0000-0000-0000-000000000010', '[S] Chiave a T universale', '5000621', 1),
  ('e0000010-0000-0000-0000-000000000010', '[S] Cannula per filo', '5000620', 1),
  ('e0000010-0000-0000-0000-000000000010', '[S] Chiave esagonale da 5.0 mm', '5000622', 1),
  ('e0000010-0000-0000-0000-000000000010', '[S] Adattatore da 6.0 mm', '5006.06', 1),
  ('e0000010-0000-0000-0000-000000000010', '[S] Chiave piana da 10 mm', '5000623', 1);

-- ── ER Elbow ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  -- Demo
  ('e0000011-0000-0000-0000-000000000011', 'Snodo corpo fissatore', '5006538', 1),
  ('e0000011-0000-0000-0000-000000000011', 'Morsetto multiplo', '5006504G', 1),
  ('e0000011-0000-0000-0000-000000000011', 'Morsetto', '5006539', 6),
  ('e0000011-0000-0000-0000-000000000011', 'Vite autoperforante', 'VA5.150.40', 2),
  ('e0000011-0000-0000-0000-000000000011', 'Vite autoperforante', 'VA4.150.40', 2),
  ('e0000011-0000-0000-0000-000000000011', 'Barra in carbonio L 300', '5006.30', 1),
  -- Strumentario
  ('e0000011-0000-0000-0000-000000000011', '[S] Chiave a T universale', '5000621', 1),
  ('e0000011-0000-0000-0000-000000000011', '[S] Adattatore per viti Ø 4.0', '5006.04', 1),
  ('e0000011-0000-0000-0000-000000000011', '[S] Adattatore per viti Ø 5.0', '5006.05', 1),
  ('e0000011-0000-0000-0000-000000000011', '[S] Chiave a brugola Ø 3', '5006000', 1),
  ('e0000011-0000-0000-0000-000000000011', '[S] Chiave a L esagonale Ø 5.0 mm', NULL, 1);

-- ── ER Ibrido (Dimostrativo) ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  -- Demo
  ('e0000012-0000-0000-0000-000000000012', 'Anello Ø 160 o 180 / anello 5/8 Ø 160 o 180', NULL, 1),
  ('e0000012-0000-0000-0000-000000000012', 'Fissafili + dadi', '5000330', 6),
  ('e0000012-0000-0000-0000-000000000012', 'Morsetto x vite singola + dadi', '5000332', 1),
  ('e0000012-0000-0000-0000-000000000012', 'Supporto a un foro + dadi', '5000335', 1),
  ('e0000012-0000-0000-0000-000000000012', 'Supporti ibrido ER + dadi', '5006506', 3),
  ('e0000012-0000-0000-0000-000000000012', 'Fili di k liscio', NULL, 3),
  ('e0000012-0000-0000-0000-000000000012', 'Fili di k con oliva', NULL, 2),
  ('e0000012-0000-0000-0000-000000000012', 'Morsetto universale', '5006508', 6),
  ('e0000012-0000-0000-0000-000000000012', 'Morsetto multiplo', '5006504', 1),
  ('e0000012-0000-0000-0000-000000000012', 'Barra L 350', '5006520', 2),
  ('e0000012-0000-0000-0000-000000000012', 'Barra L 200', '5006514', 2),
  ('e0000012-0000-0000-0000-000000000012', 'Vite autoperforante (nuove)', 'VA6.150.40', 2),
  -- Strumentario
  ('e0000012-0000-0000-0000-000000000012', '[S] Chiave piana 10/10', NULL, 2),
  ('e0000012-0000-0000-0000-000000000012', '[S] Chiave a brugola Ø 5.0', NULL, 1),
  ('e0000012-0000-0000-0000-000000000012', '[S] Chiave a brugola Ø 3.0', NULL, 1),
  ('e0000012-0000-0000-0000-000000000012', '[S] Chiave per viti Ø 6.0', NULL, 1),
  ('e0000012-0000-0000-0000-000000000012', '[S] Chiave tubolare a L 10 mm (pipa)', '5006003', 1),
  -- NB: se il kit serve per WS, aggiungere tendifilo, pinza, tronchese
  ('e0000012-0000-0000-0000-000000000012', '[S] Tendifilo (opzionale per WS)', NULL, 1),
  ('e0000012-0000-0000-0000-000000000012', '[S] Pinza (opzionale per WS)', NULL, 1),
  ('e0000012-0000-0000-0000-000000000012', '[S] Tronchese (opzionale per WS)', NULL, 1);

-- ── ER Pelvis ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  -- Demo
  ('e0000013-0000-0000-0000-000000000013', 'Arco parte prossimale', NULL, 1),
  ('e0000013-0000-0000-0000-000000000013', 'Arco parte distale', NULL, 1),
  ('e0000013-0000-0000-0000-000000000013', 'Morsetto universale', NULL, 8),
  ('e0000013-0000-0000-0000-000000000013', 'Barra in carbonio Ø 12 x L 250 mm', NULL, 2),
  ('e0000013-0000-0000-0000-000000000013', 'Vite corticale Ø 6 L 250', 'VA6.250.55', 4),
  -- Strumentario
  ('e0000013-0000-0000-0000-000000000013', '[S] Manico a T con attacco AO', '5000604', 1),
  ('e0000013-0000-0000-0000-000000000013', '[S] Asta esagonale Ø 5.0 mm', '5000605', 1),
  ('e0000013-0000-0000-0000-000000000013', '[S] Chiave universale', '5000621', 1),
  ('e0000013-0000-0000-0000-000000000013', '[S] Adattatore per viti Ø 6.0', '5006.06', 1);

-- ── ER Pilone Tibiale Plus ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  -- Demo
  ('e0000014-0000-0000-0000-000000000014', 'Morsetto universale', '5006508', 6),
  ('e0000014-0000-0000-0000-000000000014', 'Morsetto multiplo', '5006504', 1),
  ('e0000014-0000-0000-0000-000000000014', 'Barra L 350', '5006520', 2),
  ('e0000014-0000-0000-0000-000000000014', 'Barra L 200', '5006514', 2),
  ('e0000014-0000-0000-0000-000000000014', 'Vite trapassante', '5000592', 1),
  ('e0000014-0000-0000-0000-000000000014', 'Vite autoperforante', 'VA4.150.40', 1),
  ('e0000014-0000-0000-0000-000000000014', 'Vite autoperforante', 'VA5.150.40', 2),
  -- Strumentario
  ('e0000014-0000-0000-0000-000000000014', '[S] Chiave a brugola da 3.0 mm', NULL, 1),
  ('e0000014-0000-0000-0000-000000000014', '[S] Chiave a brugola da 5.0 mm', NULL, 1),
  ('e0000014-0000-0000-0000-000000000014', '[S] Manico a T con attacco AO', '5000604', 1),
  ('e0000014-0000-0000-0000-000000000014', '[S] Asta esagonale Ø 5.0 mm', '5000605', 1),
  ('e0000014-0000-0000-0000-000000000014', '[S] Asta esagonale Ø 3.0 mm', '5000606', 1),
  ('e0000014-0000-0000-0000-000000000014', '[S] Chiave per viti Ø 5.0 mm', '5000601', 1),
  ('e0000014-0000-0000-0000-000000000014', '[S] Chiave per viti Ø 4.0 mm', '5000600', 1),
  ('e0000014-0000-0000-0000-000000000014', '[S] Cannula (opzionale)', '5006010', 1),
  ('e0000014-0000-0000-0000-000000000014', '[S] Perforatore Ø 3.5 mm (opzionale)', '5000222', 1);

-- ── ER Universale (Kit Dimostrativo) ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  ('e0000015-0000-0000-0000-000000000015', 'Barra di varia misura', NULL, 2),
  ('e0000015-0000-0000-0000-000000000015', 'Vite di varia misura', NULL, 1),
  ('e0000015-0000-0000-0000-000000000015', 'Morsetto universale', '5006508', 1),
  ('e0000015-0000-0000-0000-000000000015', 'Morsetto multiplo', '5006504', 1),
  ('e0000015-0000-0000-0000-000000000015', '[S] Chiave esagonale da 5.0 mm', '5000622', 1),
  ('e0000015-0000-0000-0000-000000000015', '[S] Manico', '500124', 1);

-- ── ClickIt CF (Dimostrativo) ──
INSERT INTO kit_contents (product_id, piece_name, piece_code, quantity) VALUES
  -- Demo
  ('e0000016-0000-0000-0000-000000000016', 'Arco Ø 160 o 180 mm', NULL, 2),
  ('e0000016-0000-0000-0000-000000000016', 'Settore Ø 160 o 180 mm', NULL, 1),
  ('e0000016-0000-0000-0000-000000000016', 'Arco piede Ø 160 o 180 mm', NULL, 1),
  ('e0000016-0000-0000-0000-000000000016', 'Morsetto 3 fori', '5000334', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Morsetto 2 fori', '5000333', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Morsetto fissafili', '5000330', 4),
  ('e0000016-0000-0000-0000-000000000016', 'Morsetto fissafilo lungo', '5000330L', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Morsetto vite singola', '5000332', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Prolunga arco piede', '5000370', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Supporto obliquo 45°', '5006045/46', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Snodo emisferico', '5006052', 2),
  ('e0000016-0000-0000-0000-000000000016', 'Barra mobile bilaterale - varie misure', NULL, 2),
  ('e0000016-0000-0000-0000-000000000016', 'Barra fissa - varie misure', NULL, 2),
  ('e0000016-0000-0000-0000-000000000016', 'Barra mobile monolaterale - varie misure', NULL, 2),
  ('e0000016-0000-0000-0000-000000000016', 'Barra filettata (max da 100 mm)', NULL, 2),
  ('e0000016-0000-0000-0000-000000000016', 'Distrattore per barra filettata', '5006040', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Snodo arco piede', '5000374', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Cerniera doppia', '5006050', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Supporto ibrido FEP', '5006058', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Supporto ibrido ClickIt ER', '5006506', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Supporto multifunzione maschio', '5006054', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Supporto multifunzione femmina', '5006055', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Supporto angolare a 90°', '5006056', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Supporto vite/filo a 1 foro', '5000335', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Supporto vite/filo a 2 foro', '5000336', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Supporto vite/filo a 3 foro', '5000337', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Piastrina di adattamento', '5006042', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Rondella distanziale Ø 13 mm', '5006044', 1),
  ('e0000016-0000-0000-0000-000000000016', 'Bullone M6 L 20 mm', '5000356', 2),
  ('e0000016-0000-0000-0000-000000000016', 'Vite svasata per barre', '3000456', 2),
  ('e0000016-0000-0000-0000-000000000016', 'Dado da 10 mm', '5000354', 10),
  ('e0000016-0000-0000-0000-000000000016', 'Vite svasata per archi', '5000352', 6),
  -- Strumentario
  ('e0000016-0000-0000-0000-000000000016', '[S] Chiave a brugola da 3.0 mm', NULL, 1),
  ('e0000016-0000-0000-0000-000000000016', '[S] Cacciavite esagonale da 3.0 mm', '5000124', 1),
  ('e0000016-0000-0000-0000-000000000016', '[S] Chiave piana 10-12 mm', '5006002', 2),
  ('e0000016-0000-0000-0000-000000000016', '[S] Chiave a T 5.0-3-0 mm', '5000621', 1),
  ('e0000016-0000-0000-0000-000000000016', '[S] Vite Ø 4.0 mm', 'VA4...', 1),
  ('e0000016-0000-0000-0000-000000000016', '[S] Vite Ø 5.0 mm', 'VA5...', 1),
  ('e0000016-0000-0000-0000-000000000016', '[S] Vite Ø 6.0 mm', 'VA6...', 1),
  ('e0000016-0000-0000-0000-000000000016', '[S] Adattatore per viti Ø 4.0', '5006.04', 1),
  ('e0000016-0000-0000-0000-000000000016', '[S] Adattatore per viti Ø 5.0', '5006.05', 1),
  ('e0000016-0000-0000-0000-000000000016', '[S] Adattatore per viti Ø 6.0', '5006.06', 1);
