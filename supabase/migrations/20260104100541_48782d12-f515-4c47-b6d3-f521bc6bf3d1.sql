-- Add review tracking columns to technologies table
ALTER TABLE public.technologies
ADD COLUMN review_status text DEFAULT 'none' CHECK (review_status IN ('none', 'pending', 'in_review', 'completed')),
ADD COLUMN reviewer_id uuid REFERENCES auth.users(id),
ADD COLUMN review_requested_at timestamp with time zone,
ADD COLUMN review_requested_by uuid REFERENCES auth.users(id);

-- Create index for faster queries on review status
CREATE INDEX idx_technologies_review_status ON public.technologies(review_status) WHERE review_status != 'none';

-- Update RLS to allow analysts and above to update review fields
-- The existing update policy already allows this for analysts+