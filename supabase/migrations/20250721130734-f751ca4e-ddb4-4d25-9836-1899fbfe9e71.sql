-- Drop the existing functions that have permission issues
DROP FUNCTION IF EXISTS public.create_user_bucket(uuid);
DROP FUNCTION IF EXISTS public.get_user_bucket(uuid);

-- Create function to create user-specific storage buckets without dynamic policies
CREATE OR REPLACE FUNCTION public.create_user_bucket(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bucket_name text;
BEGIN
  bucket_name := 'user-workflows-' || user_id_param::text;
  
  -- Check if bucket already exists
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = bucket_name) THEN
    -- Create the bucket
    INSERT INTO storage.buckets (id, name, public) 
    VALUES (bucket_name, bucket_name, false);
  END IF;
  
  RETURN bucket_name;
END;
$$;

-- Create function to get or create user bucket
CREATE OR REPLACE FUNCTION public.get_user_bucket(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bucket_name text;
BEGIN
  bucket_name := 'user-workflows-' || user_id_param::text;
  
  -- Check if bucket exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = bucket_name) THEN
    PERFORM public.create_user_bucket(user_id_param);
  END IF;
  
  RETURN bucket_name;
END;
$$;

-- Create storage policies for user workflow buckets
CREATE POLICY "Users can manage their own workflow bucket objects"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id LIKE 'user-workflows-%' AND auth.uid()::text = SUBSTRING(bucket_id FROM 16))
WITH CHECK (bucket_id LIKE 'user-workflows-%' AND auth.uid()::text = SUBSTRING(bucket_id FROM 16));