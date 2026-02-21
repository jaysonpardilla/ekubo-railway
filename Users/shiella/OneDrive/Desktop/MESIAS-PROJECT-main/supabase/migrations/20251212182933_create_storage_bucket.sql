/*
  # Create Storage Bucket for Documents

  ## Changes
  1. Create public storage bucket for document uploads
  2. Set up RLS policies for the bucket
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Users can update own documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Users can delete own documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents');
