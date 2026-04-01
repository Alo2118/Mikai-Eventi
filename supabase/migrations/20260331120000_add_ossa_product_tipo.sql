-- Add 'ossa' value to product_tipo enum
-- Must be in a separate migration from any DML that uses the new value
ALTER TYPE product_tipo ADD VALUE IF NOT EXISTS 'ossa';
