-- Create a new storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public access to logos
CREATE POLICY "Public Access Logos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'logos' );

-- Policy to allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'logos' );

-- Policy to allow authenticated users to update their own logos
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'logos' );
