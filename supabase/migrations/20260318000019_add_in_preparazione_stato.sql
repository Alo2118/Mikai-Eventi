-- Add 'in_preparazione' to material_request_stato enum
ALTER TYPE material_request_stato ADD VALUE IF NOT EXISTS 'in_preparazione';
