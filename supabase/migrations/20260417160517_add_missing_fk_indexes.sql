-- Add missing indexes on FK columns that are used in joins/filters
-- PostgreSQL does not auto-create indexes on FK columns

-- event_staff.user_id: joined in fetchEventStaff
CREATE INDEX IF NOT EXISTS idx_event_staff_user_id ON event_staff(user_id);

-- event_activities.template_item_id: joined in post_evento backfill and could be used in future queries
CREATE INDEX IF NOT EXISTS idx_activities_template_item ON event_activities(template_item_id);

-- event_materials.product_id: joined in material queries (product catalog lookup)
CREATE INDEX IF NOT EXISTS idx_event_materials_product ON event_materials(product_id);
