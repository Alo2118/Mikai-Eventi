-- Add new contact types: specializzando, infermiere
ALTER TYPE contact_tipo ADD VALUE IF NOT EXISTS 'specializzando';
ALTER TYPE contact_tipo ADD VALUE IF NOT EXISTS 'infermiere';
