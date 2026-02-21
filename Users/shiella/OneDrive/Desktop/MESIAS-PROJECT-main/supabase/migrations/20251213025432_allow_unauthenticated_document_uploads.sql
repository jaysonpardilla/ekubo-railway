/*
  # Allow Unauthenticated Document Uploads

  ## Changes
  - Drop existing authenticated-only upload policy
  - Create new policy allowing anyone to upload documents during signup
  
  ## Security Note
  - This allows file uploads before user authentication (during signup)
  - File size is still limited to 5MB in the frontend
  - Files are stored in a public bucket
*/

DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;

CREATE POLICY "Anyone can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents');
