-- Mikai Eventi — Triggers (Spec ref: Section 8, O4)

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'contacts', 'events', 'event_templates',
      'materials', 'gadgets', 'event_sub_activities',
      'event_logistics', 'event_costs', 'event_tasks', 'documents'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION sync_material_position()
RETURNS TRIGGER AS $$
DECLARE
  new_pos material_posizione;
BEGIN
  new_pos := CASE lower(trim(NEW.a_posizione))
    WHEN 'magazzino' THEN 'magazzino'::material_posizione
    WHEN 'evento' THEN 'evento'::material_posizione
    WHEN 'agente' THEN 'agente'::material_posizione
    WHEN 'spedito' THEN 'spedito'::material_posizione
    WHEN 'manutenzione' THEN 'manutenzione'::material_posizione
    ELSE
      CASE NEW.tipo
        WHEN 'uscita' THEN 'spedito'::material_posizione
        WHEN 'rientro' THEN 'magazzino'::material_posizione
        ELSE 'magazzino'::material_posizione
      END
  END;

  UPDATE materials SET posizione_attuale = new_pos WHERE id = NEW.material_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_material_position
  AFTER INSERT ON material_movements
  FOR EACH ROW
  EXECUTE FUNCTION sync_material_position();

CREATE OR REPLACE FUNCTION set_event_manager()
RETURNS TRIGGER AS $$
DECLARE
  manager_id uuid;
BEGIN
  SELECT u.responsabile_id INTO manager_id
  FROM users u
  WHERE u.id = NEW.promotore_id AND u.ruolo = 'commerciale';

  IF manager_id IS NULL THEN
    WITH RECURSIVE hier AS (
      SELECT id, responsabile_id, ruolo FROM users WHERE id = NEW.promotore_id
      UNION ALL
      SELECT u.id, u.responsabile_id, u.ruolo FROM users u JOIN hier h ON u.id = h.responsabile_id
      WHERE h.ruolo != 'area_manager'
    )
    SELECT id INTO manager_id FROM hier WHERE ruolo = 'area_manager' LIMIT 1;
  END IF;

  IF manager_id IS NOT NULL THEN
    NEW.manager_user_id := manager_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_event_manager
  BEFORE INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_event_manager();
