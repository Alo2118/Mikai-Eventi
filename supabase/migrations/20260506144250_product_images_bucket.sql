-- Public bucket for product images. Read open to anyone (used in PWA + emails),
-- write restricted to users with gestione_catalogo permission.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Read: public (no auth required)
DROP POLICY IF EXISTS product_images_read ON storage.objects;
CREATE POLICY product_images_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-images');

-- Write: only gestione_catalogo
DROP POLICY IF EXISTS product_images_upload ON storage.objects;
CREATE POLICY product_images_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND has_permission('gestione_catalogo'::permission_type));

DROP POLICY IF EXISTS product_images_update ON storage.objects;
CREATE POLICY product_images_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND has_permission('gestione_catalogo'::permission_type))
  WITH CHECK (bucket_id = 'product-images' AND has_permission('gestione_catalogo'::permission_type));

DROP POLICY IF EXISTS product_images_delete ON storage.objects;
CREATE POLICY product_images_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND has_permission('gestione_catalogo'::permission_type));
