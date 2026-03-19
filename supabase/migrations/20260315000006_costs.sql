-- Mikai Eventi — Costs Table (Spec ref: Section 4.6)
CREATE TYPE cost_source AS ENUM ('sub_activity', 'logistics', 'materiale', 'sponsorizzazione', 'iscrizioni', 'desk', 'gadget', 'altro');
CREATE TYPE payment_stato AS ENUM ('da_pagare', 'pagato', 'parzialmente_pagato');

CREATE TABLE event_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_tipo cost_source NOT NULL,
  source_id uuid,
  contact_id uuid REFERENCES contacts(id),
  descrizione text,
  importo_previsto decimal,
  importo_effettivo decimal,
  fornitore text,
  n_fattura text,
  stato_pagamento payment_stato NOT NULL DEFAULT 'da_pagare',
  approvato_da uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_costs_event ON event_costs(event_id);
CREATE INDEX idx_costs_contact ON event_costs(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_costs_pagamento ON event_costs(stato_pagamento);
