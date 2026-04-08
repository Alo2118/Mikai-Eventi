-- Fix remaining 16 contacts with nome/cognome swapped
-- These survived the duplicate cleanup but still have inverted fields
BEGIN;

SET session_replication_role = 'replica';

UPDATE contacts SET nome = cognome, cognome = nome WHERE id IN (
  '642a6599-325e-4c3e-91a1-e0aa6b253bbd',
  'da4a0433-6ee8-4c44-a289-ac952c985236',
  'c55a7ea1-d3b4-4700-b9d3-d73e6e980bb6',
  '135e0aa7-b51f-471b-aff2-ce28c79ee43f',
  '9b5b26ed-a3c3-489b-ad79-d78dfcf394a3',
  'dbf3c2e7-ea0f-4477-8926-1a7b85a72c9a',
  'd990cbe1-5e07-4c6f-a7f3-e494f26ebd50',
  '1bdd1152-5fe0-4698-919f-c391f8204dc2',
  '4c9be46c-3260-4823-8dab-b2b7f14e1a5e',
  '92ff5649-1207-4852-b911-376ad5942b4c',
  '6781d5fe-0d45-42bd-b3b4-15b97f1e2e71',
  'ae1977d3-ab22-4816-b004-d48e3ae5eaf3',
  '4706b3c9-b0da-4c69-9fa7-7f8ac4e1c9d1',
  '4afcef5e-fa5f-451e-8e50-c4d1b3e0ab42',
  'f8e7a0d3-0ba2-4e3e-9f29-6e32b4be710e',
  'f8ee4f49-2aa3-421e-b3e3-84d1d22b0f3d'
);

-- Also fix D'Ortona duplicate capitalization (same person, different case)
-- Keep 'D''Ortona' (3f414cd9), delete 'D''ortona' (a3cf44d1) if both exist
UPDATE event_participants SET contact_id = '3f414cd9-d5d7-4b5d-b650-4f8606640cc2' WHERE contact_id = 'a3cf44d1-7ae4-4a26-b85b-4b2aa76f6e42' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = '3f414cd9-d5d7-4b5d-b650-4f8606640cc2' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = '3f414cd9-d5d7-4b5d-b650-4f8606640cc2' WHERE contact_id = 'a3cf44d1-7ae4-4a26-b85b-4b2aa76f6e42';
UPDATE event_trasporti SET contact_id = '3f414cd9-d5d7-4b5d-b650-4f8606640cc2' WHERE contact_id = 'a3cf44d1-7ae4-4a26-b85b-4b2aa76f6e42';
UPDATE event_costs SET contact_id = '3f414cd9-d5d7-4b5d-b650-4f8606640cc2' WHERE contact_id = 'a3cf44d1-7ae4-4a26-b85b-4b2aa76f6e42';
UPDATE events SET promotore_contact_id = '3f414cd9-d5d7-4b5d-b650-4f8606640cc2' WHERE promotore_contact_id = 'a3cf44d1-7ae4-4a26-b85b-4b2aa76f6e42';
DELETE FROM event_participants WHERE contact_id = 'a3cf44d1-7ae4-4a26-b85b-4b2aa76f6e42';
DELETE FROM event_hotel WHERE contact_id = 'a3cf44d1-7ae4-4a26-b85b-4b2aa76f6e42';
DELETE FROM event_trasporti WHERE contact_id = 'a3cf44d1-7ae4-4a26-b85b-4b2aa76f6e42';
DELETE FROM contacts WHERE id = 'a3cf44d1-7ae4-4a26-b85b-4b2aa76f6e42';

-- Also fix "Fabrizio Cellini" -> should be cognome=Cellini, nome=Fabrizio (ea00d769)
UPDATE contacts SET nome = 'Fabrizio', cognome = 'Cellini' WHERE id = 'ea00d769-66c9-4d53-9cf1-b492a3719eb2' AND nome = 'Cellini';

-- Fix "Ufficio Fabrizio" -> likely "Fabrizio" with ente_ospedaliero context, skip if unclear

SET session_replication_role = 'origin';

COMMIT;
