-- Intervento 3 — Compliance: nuovo stato ToV 'rendicontato'.
-- Marca i trasferimenti di valore già pubblicati alla disclosure di un periodo,
-- per distinguerli dai 'verificato' ancora da rendicontare.
--
-- IMPORTANTE: questa migrazione contiene SOLO l'ALTER TYPE. Il nuovo valore enum
-- non può essere referenziato in altre DDL nella stessa transazione (limite Postgres):
-- ogni uso (policy, default, funzioni) deve stare in una migrazione successiva.
-- L'action closePeriod() e le label lato app usano il valore a runtime, non in DDL.

ALTER TYPE stato_tov ADD VALUE IF NOT EXISTS 'rendicontato';
