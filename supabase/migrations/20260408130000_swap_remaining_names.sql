-- Fix remaining 9 contacts with nome/cognome still swapped
-- Previous migration used wrong UUIDs for these
BEGIN;
SET session_replication_role = 'replica';

UPDATE contacts SET nome = cognome, cognome = nome WHERE id IN (
  '135e0aa7-a714-4626-a192-c1a2799e13a8',
  '9b5b26ed-ca91-4b8a-9be1-a722f208350e',
  'd990cbe1-c11c-40de-a2c7-e9e364c6f4f3',
  '4c9be46c-650f-46c3-b900-b9be1dd2324a',
  '6781d5fe-0505-405e-9696-93234cdb0413',
  '4706b3c9-ccc8-4b74-b4ed-6163b7016c7f',
  '4afcef5e-729f-484e-b1d1-2505a378c490',
  'f8e7a0d3-8449-4c87-89a3-4c73a8bcae9a',
  'f8ee4f49-960b-43a5-a8f7-ec3380325dec'
);

SET session_replication_role = 'origin';
COMMIT;
