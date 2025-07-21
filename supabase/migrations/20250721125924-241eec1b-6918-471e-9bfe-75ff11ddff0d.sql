-- Create function to create user-specific storage buckets
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
    
    -- Create storage policies for the user bucket
    EXECUTE format('
      CREATE POLICY "User can manage their own bucket objects %s"
      ON storage.objects
      FOR ALL
      TO authenticated
      USING (bucket_id = %L AND auth.uid() = %L)
      WITH CHECK (bucket_id = %L AND auth.uid() = %L)
    ', bucket_name, bucket_name, user_id_param, bucket_name, user_id_param);
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