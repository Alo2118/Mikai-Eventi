-- Add 'non_necessario' to prenotazione_stato enum
-- Allows marking hotel/transport as not needed for specific people
ALTER TYPE prenotazione_stato ADD VALUE IF NOT EXISTS 'non_necessario';
