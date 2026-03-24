-- Seed all permissions for admin user nicola@mikai.it
-- This fixes the chicken-and-egg problem: admin needs gestione_utenti to write permissions,
-- but has no permissions at all yet.
INSERT INTO user_permissions (user_id, permission)
VALUES
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_utenti'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_catalogo'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'approva_eventi'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'approva_materiale'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_costi'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'compliance'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_magazzino'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_spedizioni'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_gadget'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_sedi'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_contatti'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_staff_evento'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_logistica'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'approva_preventivi'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'richiedi_materiale'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_marketing'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_organizzazione'::permission_type)
ON CONFLICT (user_id, permission) DO NOTHING;
