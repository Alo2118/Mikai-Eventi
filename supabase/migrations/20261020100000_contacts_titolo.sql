-- Titolo di cortesia del contatto (Dott./Dott.ssa/Prof./Prof.ssa) — usato negli attestati di partecipazione.
-- NULL = non specificato: l'attestato usa la forma generica "Il Dott./La Dott.ssa".
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS titolo text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_titolo_check') THEN
    ALTER TABLE contacts ADD CONSTRAINT contacts_titolo_check
      CHECK (titolo IS NULL OR titolo IN ('dott', 'dott_ssa', 'prof', 'prof_ssa'));
  END IF;
END $$;
