-- Create status enum for edit proposals
CREATE TYPE public.edit_status AS ENUM ('pending', 'approved', 'rejected');

-- Create technology_edits table for edit proposals
CREATE TABLE public.technology_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technology_id UUID REFERENCES public.technologies(id) ON DELETE CASCADE NOT NULL,
  proposed_changes JSONB NOT NULL,
  original_data JSONB,
  status edit_status DEFAULT 'pending' NOT NULL,
  comments TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_comments TEXT
);

-- Enable RLS
ALTER TABLE public.technology_edits ENABLE ROW LEVEL SECURITY;

-- Analysts can view their own edits
CREATE POLICY "Users can view their own edits"
ON public.technology_edits FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Supervisors and admins can view all edits
CREATE POLICY "Supervisors and admins can view all edits"
ON public.technology_edits FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor')
);

-- Analysts, supervisors, and admins can create edits
CREATE POLICY "Internal users can create edits"
ON public.technology_edits FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor') OR 
  public.has_role(auth.uid(), 'analyst')
);

-- Supervisors and admins can update edits (for approval/rejection)
CREATE POLICY "Supervisors and admins can update edits"
ON public.technology_edits FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor')
);

-- Index for faster queries
CREATE INDEX idx_technology_edits_status ON public.technology_edits(status);
CREATE INDEX idx_technology_edits_technology ON public.technology_edits(technology_id);