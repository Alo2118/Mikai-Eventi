-- Migration: 20260330140000_fix_sub_activities_tipo_nullable.sql
-- Fix: event_sub_activities.tipo (old enum column) is still NOT NULL,
-- but the app now uses tipo_id (FK to sub_activity_types) exclusively.
-- INSERT fails with "null value in column tipo" because the frontend
-- only sends tipo_id, not the legacy tipo enum.
-- Solution: make tipo nullable since tipo_id is the authoritative column.

ALTER TABLE event_sub_activities ALTER COLUMN tipo DROP NOT NULL;
