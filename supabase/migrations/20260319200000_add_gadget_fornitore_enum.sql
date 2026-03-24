-- Must be separate from policies referencing new values (PostgreSQL limitation)
ALTER TYPE product_tipo ADD VALUE 'gadget';
ALTER TYPE brand_tipo ADD VALUE 'fornitore';
