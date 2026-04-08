-- Fix inverted nome/cognome contacts + remove duplicates
-- 16 inverted pairs: old (20/03, inverted) -> new (31/03, correct by Federica)
-- 2 exact duplicate pairs
BEGIN;

-- Disable audit triggers to avoid FK error on activity_log (no auth.uid() in migration context)
SET session_replication_role = 'replica';

-- Stefano Paladini: migrate f8d8d084 -> ae1977d3
UPDATE event_participants SET contact_id = 'ae1977d3-ab22-4816-b004-d48e3ae5eaf3' WHERE contact_id = 'f8d8d084-8fb0-4c39-8168-805a56538d63' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = 'ae1977d3-ab22-4816-b004-d48e3ae5eaf3' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = 'ae1977d3-ab22-4816-b004-d48e3ae5eaf3' WHERE contact_id = 'f8d8d084-8fb0-4c39-8168-805a56538d63';
UPDATE event_trasporti SET contact_id = 'ae1977d3-ab22-4816-b004-d48e3ae5eaf3' WHERE contact_id = 'f8d8d084-8fb0-4c39-8168-805a56538d63';
UPDATE event_costs SET contact_id = 'ae1977d3-ab22-4816-b004-d48e3ae5eaf3' WHERE contact_id = 'f8d8d084-8fb0-4c39-8168-805a56538d63';
UPDATE events SET promotore_contact_id = 'ae1977d3-ab22-4816-b004-d48e3ae5eaf3' WHERE promotore_contact_id = 'f8d8d084-8fb0-4c39-8168-805a56538d63';
DELETE FROM event_participants WHERE contact_id = 'f8d8d084-8fb0-4c39-8168-805a56538d63';
DELETE FROM event_hotel WHERE contact_id = 'f8d8d084-8fb0-4c39-8168-805a56538d63';
DELETE FROM event_trasporti WHERE contact_id = 'f8d8d084-8fb0-4c39-8168-805a56538d63';
DELETE FROM contacts WHERE id = 'f8d8d084-8fb0-4c39-8168-805a56538d63';

-- Josephine Di Nunzio: migrate a1aebb9c -> dbf3c2e7
UPDATE event_participants SET contact_id = 'dbf3c2e7-ea0f-4477-8926-1a7b85a72c9a' WHERE contact_id = 'a1aebb9c-863b-44f5-b373-8ae2410e19a7' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = 'dbf3c2e7-ea0f-4477-8926-1a7b85a72c9a' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = 'dbf3c2e7-ea0f-4477-8926-1a7b85a72c9a' WHERE contact_id = 'a1aebb9c-863b-44f5-b373-8ae2410e19a7';
UPDATE event_trasporti SET contact_id = 'dbf3c2e7-ea0f-4477-8926-1a7b85a72c9a' WHERE contact_id = 'a1aebb9c-863b-44f5-b373-8ae2410e19a7';
UPDATE event_costs SET contact_id = 'dbf3c2e7-ea0f-4477-8926-1a7b85a72c9a' WHERE contact_id = 'a1aebb9c-863b-44f5-b373-8ae2410e19a7';
UPDATE events SET promotore_contact_id = 'dbf3c2e7-ea0f-4477-8926-1a7b85a72c9a' WHERE promotore_contact_id = 'a1aebb9c-863b-44f5-b373-8ae2410e19a7';
DELETE FROM event_participants WHERE contact_id = 'a1aebb9c-863b-44f5-b373-8ae2410e19a7';
DELETE FROM event_hotel WHERE contact_id = 'a1aebb9c-863b-44f5-b373-8ae2410e19a7';
DELETE FROM event_trasporti WHERE contact_id = 'a1aebb9c-863b-44f5-b373-8ae2410e19a7';
DELETE FROM contacts WHERE id = 'a1aebb9c-863b-44f5-b373-8ae2410e19a7';

-- Omar El Ezzo: migrate a5ee15f8 -> 92ff5649
UPDATE event_participants SET contact_id = '92ff5649-1207-4852-b911-376ad5942b4c' WHERE contact_id = 'a5ee15f8-9b79-4b71-b746-05edb4628b16' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = '92ff5649-1207-4852-b911-376ad5942b4c' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = '92ff5649-1207-4852-b911-376ad5942b4c' WHERE contact_id = 'a5ee15f8-9b79-4b71-b746-05edb4628b16';
UPDATE event_trasporti SET contact_id = '92ff5649-1207-4852-b911-376ad5942b4c' WHERE contact_id = 'a5ee15f8-9b79-4b71-b746-05edb4628b16';
UPDATE event_costs SET contact_id = '92ff5649-1207-4852-b911-376ad5942b4c' WHERE contact_id = 'a5ee15f8-9b79-4b71-b746-05edb4628b16';
UPDATE events SET promotore_contact_id = '92ff5649-1207-4852-b911-376ad5942b4c' WHERE promotore_contact_id = 'a5ee15f8-9b79-4b71-b746-05edb4628b16';
DELETE FROM event_participants WHERE contact_id = 'a5ee15f8-9b79-4b71-b746-05edb4628b16';
DELETE FROM event_hotel WHERE contact_id = 'a5ee15f8-9b79-4b71-b746-05edb4628b16';
DELETE FROM event_trasporti WHERE contact_id = 'a5ee15f8-9b79-4b71-b746-05edb4628b16';
DELETE FROM contacts WHERE id = 'a5ee15f8-9b79-4b71-b746-05edb4628b16';

-- Virginia Cinelli: migrate fe9b5051 -> f8ee4f49
UPDATE event_participants SET contact_id = 'f8ee4f49-960b-43a5-a8f7-ec3380325dec' WHERE contact_id = 'fe9b5051-476e-4fd2-b7bb-9e1f473f155f' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = 'f8ee4f49-960b-43a5-a8f7-ec3380325dec' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = 'f8ee4f49-960b-43a5-a8f7-ec3380325dec' WHERE contact_id = 'fe9b5051-476e-4fd2-b7bb-9e1f473f155f';
UPDATE event_trasporti SET contact_id = 'f8ee4f49-960b-43a5-a8f7-ec3380325dec' WHERE contact_id = 'fe9b5051-476e-4fd2-b7bb-9e1f473f155f';
UPDATE event_costs SET contact_id = 'f8ee4f49-960b-43a5-a8f7-ec3380325dec' WHERE contact_id = 'fe9b5051-476e-4fd2-b7bb-9e1f473f155f';
UPDATE events SET promotore_contact_id = 'f8ee4f49-960b-43a5-a8f7-ec3380325dec' WHERE promotore_contact_id = 'fe9b5051-476e-4fd2-b7bb-9e1f473f155f';
DELETE FROM event_participants WHERE contact_id = 'fe9b5051-476e-4fd2-b7bb-9e1f473f155f';
DELETE FROM event_hotel WHERE contact_id = 'fe9b5051-476e-4fd2-b7bb-9e1f473f155f';
DELETE FROM event_trasporti WHERE contact_id = 'fe9b5051-476e-4fd2-b7bb-9e1f473f155f';
DELETE FROM contacts WHERE id = 'fe9b5051-476e-4fd2-b7bb-9e1f473f155f';

-- Giulia Masci: migrate 1e207a15 -> c55a7ea1
UPDATE event_participants SET contact_id = 'c55a7ea1-d3b4-4700-b9d3-d73e6e980bb6' WHERE contact_id = '1e207a15-fbd1-4ae2-bbae-1919fad59b99' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = 'c55a7ea1-d3b4-4700-b9d3-d73e6e980bb6' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = 'c55a7ea1-d3b4-4700-b9d3-d73e6e980bb6' WHERE contact_id = '1e207a15-fbd1-4ae2-bbae-1919fad59b99';
UPDATE event_trasporti SET contact_id = 'c55a7ea1-d3b4-4700-b9d3-d73e6e980bb6' WHERE contact_id = '1e207a15-fbd1-4ae2-bbae-1919fad59b99';
UPDATE event_costs SET contact_id = 'c55a7ea1-d3b4-4700-b9d3-d73e6e980bb6' WHERE contact_id = '1e207a15-fbd1-4ae2-bbae-1919fad59b99';
UPDATE events SET promotore_contact_id = 'c55a7ea1-d3b4-4700-b9d3-d73e6e980bb6' WHERE promotore_contact_id = '1e207a15-fbd1-4ae2-bbae-1919fad59b99';
DELETE FROM event_participants WHERE contact_id = '1e207a15-fbd1-4ae2-bbae-1919fad59b99';
DELETE FROM event_hotel WHERE contact_id = '1e207a15-fbd1-4ae2-bbae-1919fad59b99';
DELETE FROM event_trasporti WHERE contact_id = '1e207a15-fbd1-4ae2-bbae-1919fad59b99';
DELETE FROM contacts WHERE id = '1e207a15-fbd1-4ae2-bbae-1919fad59b99';

-- Tommaso Speziale: migrate 85aa1b1d -> f8e7a0d3
UPDATE event_participants SET contact_id = 'f8e7a0d3-8449-4c87-89a3-4c73a8bcae9a' WHERE contact_id = '85aa1b1d-9317-4806-80cd-7dbdaf9eff5c' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = 'f8e7a0d3-8449-4c87-89a3-4c73a8bcae9a' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = 'f8e7a0d3-8449-4c87-89a3-4c73a8bcae9a' WHERE contact_id = '85aa1b1d-9317-4806-80cd-7dbdaf9eff5c';
UPDATE event_trasporti SET contact_id = 'f8e7a0d3-8449-4c87-89a3-4c73a8bcae9a' WHERE contact_id = '85aa1b1d-9317-4806-80cd-7dbdaf9eff5c';
UPDATE event_costs SET contact_id = 'f8e7a0d3-8449-4c87-89a3-4c73a8bcae9a' WHERE contact_id = '85aa1b1d-9317-4806-80cd-7dbdaf9eff5c';
UPDATE events SET promotore_contact_id = 'f8e7a0d3-8449-4c87-89a3-4c73a8bcae9a' WHERE promotore_contact_id = '85aa1b1d-9317-4806-80cd-7dbdaf9eff5c';
DELETE FROM event_participants WHERE contact_id = '85aa1b1d-9317-4806-80cd-7dbdaf9eff5c';
DELETE FROM event_hotel WHERE contact_id = '85aa1b1d-9317-4806-80cd-7dbdaf9eff5c';
DELETE FROM event_trasporti WHERE contact_id = '85aa1b1d-9317-4806-80cd-7dbdaf9eff5c';
DELETE FROM contacts WHERE id = '85aa1b1d-9317-4806-80cd-7dbdaf9eff5c';

-- Stefano Trotto: migrate 609b621d -> 4706b3c9
UPDATE event_participants SET contact_id = '4706b3c9-ccc8-4b74-b4ed-6163b7016c7f' WHERE contact_id = '609b621d-7e60-48ed-ba7b-bb42a8794fe5' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = '4706b3c9-ccc8-4b74-b4ed-6163b7016c7f' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = '4706b3c9-ccc8-4b74-b4ed-6163b7016c7f' WHERE contact_id = '609b621d-7e60-48ed-ba7b-bb42a8794fe5';
UPDATE event_trasporti SET contact_id = '4706b3c9-ccc8-4b74-b4ed-6163b7016c7f' WHERE contact_id = '609b621d-7e60-48ed-ba7b-bb42a8794fe5';
UPDATE event_costs SET contact_id = '4706b3c9-ccc8-4b74-b4ed-6163b7016c7f' WHERE contact_id = '609b621d-7e60-48ed-ba7b-bb42a8794fe5';
UPDATE events SET promotore_contact_id = '4706b3c9-ccc8-4b74-b4ed-6163b7016c7f' WHERE promotore_contact_id = '609b621d-7e60-48ed-ba7b-bb42a8794fe5';
DELETE FROM event_participants WHERE contact_id = '609b621d-7e60-48ed-ba7b-bb42a8794fe5';
DELETE FROM event_hotel WHERE contact_id = '609b621d-7e60-48ed-ba7b-bb42a8794fe5';
DELETE FROM event_trasporti WHERE contact_id = '609b621d-7e60-48ed-ba7b-bb42a8794fe5';
DELETE FROM contacts WHERE id = '609b621d-7e60-48ed-ba7b-bb42a8794fe5';

-- Giovanni Guarascio: migrate 5d5fc1e9 -> da4a0433
UPDATE event_participants SET contact_id = 'da4a0433-6ee8-4c44-a289-ac952c985236' WHERE contact_id = '5d5fc1e9-916d-4329-90ac-053d95826989' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = 'da4a0433-6ee8-4c44-a289-ac952c985236' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = 'da4a0433-6ee8-4c44-a289-ac952c985236' WHERE contact_id = '5d5fc1e9-916d-4329-90ac-053d95826989';
UPDATE event_trasporti SET contact_id = 'da4a0433-6ee8-4c44-a289-ac952c985236' WHERE contact_id = '5d5fc1e9-916d-4329-90ac-053d95826989';
UPDATE event_costs SET contact_id = 'da4a0433-6ee8-4c44-a289-ac952c985236' WHERE contact_id = '5d5fc1e9-916d-4329-90ac-053d95826989';
UPDATE events SET promotore_contact_id = 'da4a0433-6ee8-4c44-a289-ac952c985236' WHERE promotore_contact_id = '5d5fc1e9-916d-4329-90ac-053d95826989';
DELETE FROM event_participants WHERE contact_id = '5d5fc1e9-916d-4329-90ac-053d95826989';
DELETE FROM event_hotel WHERE contact_id = '5d5fc1e9-916d-4329-90ac-053d95826989';
DELETE FROM event_trasporti WHERE contact_id = '5d5fc1e9-916d-4329-90ac-053d95826989';
DELETE FROM contacts WHERE id = '5d5fc1e9-916d-4329-90ac-053d95826989';

-- Enrico Salvatore D'agostino: migrate 1e67cdca -> 642a6599
UPDATE event_participants SET contact_id = '642a6599-325e-4c3e-91a1-e0aa6b253bbd' WHERE contact_id = '1e67cdca-098f-4413-aaff-beee3721ca6b' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = '642a6599-325e-4c3e-91a1-e0aa6b253bbd' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = '642a6599-325e-4c3e-91a1-e0aa6b253bbd' WHERE contact_id = '1e67cdca-098f-4413-aaff-beee3721ca6b';
UPDATE event_trasporti SET contact_id = '642a6599-325e-4c3e-91a1-e0aa6b253bbd' WHERE contact_id = '1e67cdca-098f-4413-aaff-beee3721ca6b';
UPDATE event_costs SET contact_id = '642a6599-325e-4c3e-91a1-e0aa6b253bbd' WHERE contact_id = '1e67cdca-098f-4413-aaff-beee3721ca6b';
UPDATE events SET promotore_contact_id = '642a6599-325e-4c3e-91a1-e0aa6b253bbd' WHERE promotore_contact_id = '1e67cdca-098f-4413-aaff-beee3721ca6b';
DELETE FROM event_participants WHERE contact_id = '1e67cdca-098f-4413-aaff-beee3721ca6b';
DELETE FROM event_hotel WHERE contact_id = '1e67cdca-098f-4413-aaff-beee3721ca6b';
DELETE FROM event_trasporti WHERE contact_id = '1e67cdca-098f-4413-aaff-beee3721ca6b';
DELETE FROM contacts WHERE id = '1e67cdca-098f-4413-aaff-beee3721ca6b';

-- Thomas Fava: migrate f4123787 -> 4afcef5e
UPDATE event_participants SET contact_id = '4afcef5e-729f-484e-b1d1-2505a378c490' WHERE contact_id = 'f4123787-21ca-4b99-be50-f3a43a2c3921' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = '4afcef5e-729f-484e-b1d1-2505a378c490' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = '4afcef5e-729f-484e-b1d1-2505a378c490' WHERE contact_id = 'f4123787-21ca-4b99-be50-f3a43a2c3921';
UPDATE event_trasporti SET contact_id = '4afcef5e-729f-484e-b1d1-2505a378c490' WHERE contact_id = 'f4123787-21ca-4b99-be50-f3a43a2c3921';
UPDATE event_costs SET contact_id = '4afcef5e-729f-484e-b1d1-2505a378c490' WHERE contact_id = 'f4123787-21ca-4b99-be50-f3a43a2c3921';
UPDATE events SET promotore_contact_id = '4afcef5e-729f-484e-b1d1-2505a378c490' WHERE promotore_contact_id = 'f4123787-21ca-4b99-be50-f3a43a2c3921';
DELETE FROM event_participants WHERE contact_id = 'f4123787-21ca-4b99-be50-f3a43a2c3921';
DELETE FROM event_hotel WHERE contact_id = 'f4123787-21ca-4b99-be50-f3a43a2c3921';
DELETE FROM event_trasporti WHERE contact_id = 'f4123787-21ca-4b99-be50-f3a43a2c3921';
DELETE FROM contacts WHERE id = 'f4123787-21ca-4b99-be50-f3a43a2c3921';

-- Leonardo Tassinari: migrate 46916813 -> d990cbe1
UPDATE event_participants SET contact_id = 'd990cbe1-c11c-40de-a2c7-e9e364c6f4f3' WHERE contact_id = '46916813-b1f9-4c2c-a46d-c9b559770b65' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = 'd990cbe1-c11c-40de-a2c7-e9e364c6f4f3' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = 'd990cbe1-c11c-40de-a2c7-e9e364c6f4f3' WHERE contact_id = '46916813-b1f9-4c2c-a46d-c9b559770b65';
UPDATE event_trasporti SET contact_id = 'd990cbe1-c11c-40de-a2c7-e9e364c6f4f3' WHERE contact_id = '46916813-b1f9-4c2c-a46d-c9b559770b65';
UPDATE event_costs SET contact_id = 'd990cbe1-c11c-40de-a2c7-e9e364c6f4f3' WHERE contact_id = '46916813-b1f9-4c2c-a46d-c9b559770b65';
UPDATE events SET promotore_contact_id = 'd990cbe1-c11c-40de-a2c7-e9e364c6f4f3' WHERE promotore_contact_id = '46916813-b1f9-4c2c-a46d-c9b559770b65';
DELETE FROM event_participants WHERE contact_id = '46916813-b1f9-4c2c-a46d-c9b559770b65';
DELETE FROM event_hotel WHERE contact_id = '46916813-b1f9-4c2c-a46d-c9b559770b65';
DELETE FROM event_trasporti WHERE contact_id = '46916813-b1f9-4c2c-a46d-c9b559770b65';
DELETE FROM contacts WHERE id = '46916813-b1f9-4c2c-a46d-c9b559770b65';

-- Irene Tiberi: migrate 4adf9202 -> 135e0aa7
UPDATE event_participants SET contact_id = '135e0aa7-a714-4626-a192-c1a2799e13a8' WHERE contact_id = '4adf9202-7d6b-4c51-b23b-58af59e4e076' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = '135e0aa7-a714-4626-a192-c1a2799e13a8' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = '135e0aa7-a714-4626-a192-c1a2799e13a8' WHERE contact_id = '4adf9202-7d6b-4c51-b23b-58af59e4e076';
UPDATE event_trasporti SET contact_id = '135e0aa7-a714-4626-a192-c1a2799e13a8' WHERE contact_id = '4adf9202-7d6b-4c51-b23b-58af59e4e076';
UPDATE event_costs SET contact_id = '135e0aa7-a714-4626-a192-c1a2799e13a8' WHERE contact_id = '4adf9202-7d6b-4c51-b23b-58af59e4e076';
UPDATE events SET promotore_contact_id = '135e0aa7-a714-4626-a192-c1a2799e13a8' WHERE promotore_contact_id = '4adf9202-7d6b-4c51-b23b-58af59e4e076';
DELETE FROM event_participants WHERE contact_id = '4adf9202-7d6b-4c51-b23b-58af59e4e076';
DELETE FROM event_hotel WHERE contact_id = '4adf9202-7d6b-4c51-b23b-58af59e4e076';
DELETE FROM event_trasporti WHERE contact_id = '4adf9202-7d6b-4c51-b23b-58af59e4e076';
DELETE FROM contacts WHERE id = '4adf9202-7d6b-4c51-b23b-58af59e4e076';

-- Pietro Cecconi: migrate cc50d300 -> 6781d5fe
UPDATE event_participants SET contact_id = '6781d5fe-0505-405e-9696-93234cdb0413' WHERE contact_id = 'cc50d300-bb28-49f4-92f7-0d60673c1f0f' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = '6781d5fe-0505-405e-9696-93234cdb0413' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = '6781d5fe-0505-405e-9696-93234cdb0413' WHERE contact_id = 'cc50d300-bb28-49f4-92f7-0d60673c1f0f';
UPDATE event_trasporti SET contact_id = '6781d5fe-0505-405e-9696-93234cdb0413' WHERE contact_id = 'cc50d300-bb28-49f4-92f7-0d60673c1f0f';
UPDATE event_costs SET contact_id = '6781d5fe-0505-405e-9696-93234cdb0413' WHERE contact_id = 'cc50d300-bb28-49f4-92f7-0d60673c1f0f';
UPDATE events SET promotore_contact_id = '6781d5fe-0505-405e-9696-93234cdb0413' WHERE promotore_contact_id = 'cc50d300-bb28-49f4-92f7-0d60673c1f0f';
DELETE FROM event_participants WHERE contact_id = 'cc50d300-bb28-49f4-92f7-0d60673c1f0f';
DELETE FROM event_hotel WHERE contact_id = 'cc50d300-bb28-49f4-92f7-0d60673c1f0f';
DELETE FROM event_trasporti WHERE contact_id = 'cc50d300-bb28-49f4-92f7-0d60673c1f0f';
DELETE FROM contacts WHERE id = 'cc50d300-bb28-49f4-92f7-0d60673c1f0f';

-- Johnny Coco: migrate c4738b82 -> 9b5b26ed
UPDATE event_participants SET contact_id = '9b5b26ed-ca91-4b8a-9be1-a722f208350e' WHERE contact_id = 'c4738b82-8c63-4eb7-93a2-c0dc27986743' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = '9b5b26ed-ca91-4b8a-9be1-a722f208350e' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = '9b5b26ed-ca91-4b8a-9be1-a722f208350e' WHERE contact_id = 'c4738b82-8c63-4eb7-93a2-c0dc27986743';
UPDATE event_trasporti SET contact_id = '9b5b26ed-ca91-4b8a-9be1-a722f208350e' WHERE contact_id = 'c4738b82-8c63-4eb7-93a2-c0dc27986743';
UPDATE event_costs SET contact_id = '9b5b26ed-ca91-4b8a-9be1-a722f208350e' WHERE contact_id = 'c4738b82-8c63-4eb7-93a2-c0dc27986743';
UPDATE events SET promotore_contact_id = '9b5b26ed-ca91-4b8a-9be1-a722f208350e' WHERE promotore_contact_id = 'c4738b82-8c63-4eb7-93a2-c0dc27986743';
DELETE FROM event_participants WHERE contact_id = 'c4738b82-8c63-4eb7-93a2-c0dc27986743';
DELETE FROM event_hotel WHERE contact_id = 'c4738b82-8c63-4eb7-93a2-c0dc27986743';
DELETE FROM event_trasporti WHERE contact_id = 'c4738b82-8c63-4eb7-93a2-c0dc27986743';
DELETE FROM contacts WHERE id = 'c4738b82-8c63-4eb7-93a2-c0dc27986743';

-- Michele Malgarotti: migrate 6e16c651 -> 4c9be46c
UPDATE event_participants SET contact_id = '4c9be46c-650f-46c3-b900-b9be1dd2324a' WHERE contact_id = '6e16c651-f87b-477d-a395-8a5bfae2b453' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = '4c9be46c-650f-46c3-b900-b9be1dd2324a' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = '4c9be46c-650f-46c3-b900-b9be1dd2324a' WHERE contact_id = '6e16c651-f87b-477d-a395-8a5bfae2b453';
UPDATE event_trasporti SET contact_id = '4c9be46c-650f-46c3-b900-b9be1dd2324a' WHERE contact_id = '6e16c651-f87b-477d-a395-8a5bfae2b453';
UPDATE event_costs SET contact_id = '4c9be46c-650f-46c3-b900-b9be1dd2324a' WHERE contact_id = '6e16c651-f87b-477d-a395-8a5bfae2b453';
UPDATE events SET promotore_contact_id = '4c9be46c-650f-46c3-b900-b9be1dd2324a' WHERE promotore_contact_id = '6e16c651-f87b-477d-a395-8a5bfae2b453';
DELETE FROM event_participants WHERE contact_id = '6e16c651-f87b-477d-a395-8a5bfae2b453';
DELETE FROM event_hotel WHERE contact_id = '6e16c651-f87b-477d-a395-8a5bfae2b453';
DELETE FROM event_trasporti WHERE contact_id = '6e16c651-f87b-477d-a395-8a5bfae2b453';
DELETE FROM contacts WHERE id = '6e16c651-f87b-477d-a395-8a5bfae2b453';

-- Luigi Sacco: migrate 84960ba1 -> 1bdd1152
UPDATE event_participants SET contact_id = '1bdd1152-5fe0-4698-919f-c391f8204dc2' WHERE contact_id = '84960ba1-6c4d-477c-a4d0-e0918343196d' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = '1bdd1152-5fe0-4698-919f-c391f8204dc2' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = '1bdd1152-5fe0-4698-919f-c391f8204dc2' WHERE contact_id = '84960ba1-6c4d-477c-a4d0-e0918343196d';
UPDATE event_trasporti SET contact_id = '1bdd1152-5fe0-4698-919f-c391f8204dc2' WHERE contact_id = '84960ba1-6c4d-477c-a4d0-e0918343196d';
UPDATE event_costs SET contact_id = '1bdd1152-5fe0-4698-919f-c391f8204dc2' WHERE contact_id = '84960ba1-6c4d-477c-a4d0-e0918343196d';
UPDATE events SET promotore_contact_id = '1bdd1152-5fe0-4698-919f-c391f8204dc2' WHERE promotore_contact_id = '84960ba1-6c4d-477c-a4d0-e0918343196d';
DELETE FROM event_participants WHERE contact_id = '84960ba1-6c4d-477c-a4d0-e0918343196d';
DELETE FROM event_hotel WHERE contact_id = '84960ba1-6c4d-477c-a4d0-e0918343196d';
DELETE FROM event_trasporti WHERE contact_id = '84960ba1-6c4d-477c-a4d0-e0918343196d';
DELETE FROM contacts WHERE id = '84960ba1-6c4d-477c-a4d0-e0918343196d';

-- EXACT DUP Cadoni Francesco: keep 9fa64a83, delete 65d37c35
UPDATE event_participants SET contact_id = '9fa64a83-94be-4b14-ae95-d441c3cb12ab' WHERE contact_id = '65d37c35-44d9-4a34-82a1-af4b44e5fb61' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = '9fa64a83-94be-4b14-ae95-d441c3cb12ab' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = '9fa64a83-94be-4b14-ae95-d441c3cb12ab' WHERE contact_id = '65d37c35-44d9-4a34-82a1-af4b44e5fb61';
UPDATE event_trasporti SET contact_id = '9fa64a83-94be-4b14-ae95-d441c3cb12ab' WHERE contact_id = '65d37c35-44d9-4a34-82a1-af4b44e5fb61';
UPDATE event_costs SET contact_id = '9fa64a83-94be-4b14-ae95-d441c3cb12ab' WHERE contact_id = '65d37c35-44d9-4a34-82a1-af4b44e5fb61';
UPDATE events SET promotore_contact_id = '9fa64a83-94be-4b14-ae95-d441c3cb12ab' WHERE promotore_contact_id = '65d37c35-44d9-4a34-82a1-af4b44e5fb61';
DELETE FROM event_participants WHERE contact_id = '65d37c35-44d9-4a34-82a1-af4b44e5fb61';
DELETE FROM event_hotel WHERE contact_id = '65d37c35-44d9-4a34-82a1-af4b44e5fb61';
DELETE FROM event_trasporti WHERE contact_id = '65d37c35-44d9-4a34-82a1-af4b44e5fb61';
DELETE FROM contacts WHERE id = '65d37c35-44d9-4a34-82a1-af4b44e5fb61';

-- EXACT DUP Tramaglino Daniele: keep 30ec7d43, delete 4172000a
UPDATE event_participants SET contact_id = '30ec7d43-c2a3-4b77-9d33-826e5e0159e4' WHERE contact_id = '4172000a-cf55-43f9-85f3-20f36c9c61b3' AND NOT EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.contact_id = '30ec7d43-c2a3-4b77-9d33-826e5e0159e4' AND ep2.event_id = event_participants.event_id);
UPDATE event_hotel SET contact_id = '30ec7d43-c2a3-4b77-9d33-826e5e0159e4' WHERE contact_id = '4172000a-cf55-43f9-85f3-20f36c9c61b3';
UPDATE event_trasporti SET contact_id = '30ec7d43-c2a3-4b77-9d33-826e5e0159e4' WHERE contact_id = '4172000a-cf55-43f9-85f3-20f36c9c61b3';
UPDATE event_costs SET contact_id = '30ec7d43-c2a3-4b77-9d33-826e5e0159e4' WHERE contact_id = '4172000a-cf55-43f9-85f3-20f36c9c61b3';
UPDATE events SET promotore_contact_id = '30ec7d43-c2a3-4b77-9d33-826e5e0159e4' WHERE promotore_contact_id = '4172000a-cf55-43f9-85f3-20f36c9c61b3';
DELETE FROM event_participants WHERE contact_id = '4172000a-cf55-43f9-85f3-20f36c9c61b3';
DELETE FROM event_hotel WHERE contact_id = '4172000a-cf55-43f9-85f3-20f36c9c61b3';
DELETE FROM event_trasporti WHERE contact_id = '4172000a-cf55-43f9-85f3-20f36c9c61b3';
DELETE FROM contacts WHERE id = '4172000a-cf55-43f9-85f3-20f36c9c61b3';

-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;