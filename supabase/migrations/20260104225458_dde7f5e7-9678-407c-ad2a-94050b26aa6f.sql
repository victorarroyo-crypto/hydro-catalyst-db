-- Create function to sync status with review_status
CREATE OR REPLACE FUNCTION public.sync_technology_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When review_status changes to 'pending', set status to 'en_revision'
  IF NEW.review_status = 'pending' AND (OLD.review_status IS NULL OR OLD.review_status != 'pending') THEN
    NEW.status := 'en_revision';
  END IF;
  
  -- When review_status changes to 'completed', set status to 'active' (published)
  IF NEW.review_status = 'completed' AND (OLD.review_status IS NULL OR OLD.review_status != 'completed') THEN
    NEW.status := 'active';
  END IF;
  
  -- When status is manually set to 'active', clear review_status
  IF NEW.status = 'active' AND OLD.status != 'active' AND NEW.review_status != 'completed' THEN
    NEW.review_status := 'none';
  END IF;
  
  -- When status is set to 'inactive', clear review_status
  IF NEW.status = 'inactive' AND OLD.status != 'inactive' THEN
    NEW.review_status := 'none';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on technologies table
DROP TRIGGER IF EXISTS sync_technology_status_trigger ON technologies;
CREATE TRIGGER sync_technology_status_trigger
  BEFORE UPDATE ON technologies
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_technology_status();