-- Create cost consulting verticals table
CREATE TABLE IF NOT EXISTS public.cost_verticals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create cost consulting projects table
CREATE TABLE IF NOT EXISTS public.cost_consulting_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.advisor_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  client_name text,
  vertical_id uuid REFERENCES public.cost_verticals(id),
  status text NOT NULL DEFAULT 'draft',
  total_spend_analyzed numeric DEFAULT 0,
  total_savings_identified numeric DEFAULT 0,
  opportunities_count integer DEFAULT 0,
  contracts_count integer DEFAULT 0,
  invoices_count integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cost_verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_consulting_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for cost_verticals (public read)
CREATE POLICY "Anyone can read cost_verticals" ON public.cost_verticals
  FOR SELECT USING (true);

-- RLS policies for cost_consulting_projects
CREATE POLICY "Users can view their own projects" ON public.cost_consulting_projects
  FOR SELECT USING (user_id IN (SELECT id FROM public.advisor_users WHERE id = user_id));

CREATE POLICY "Users can insert their own projects" ON public.cost_consulting_projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own projects" ON public.cost_consulting_projects
  FOR UPDATE USING (user_id IN (SELECT id FROM public.advisor_users WHERE id = user_id));

CREATE POLICY "Users can delete their own projects" ON public.cost_consulting_projects
  FOR DELETE USING (user_id IN (SELECT id FROM public.advisor_users WHERE id = user_id));

-- Insert default verticals
INSERT INTO public.cost_verticals (name, icon, description) VALUES
  ('Alimentación y Bebidas', 'Utensils', 'Industria alimentaria y de bebidas'),
  ('Química y Farmacéutica', 'FlaskConical', 'Sector químico y farmacéutico'),
  ('Papelera', 'FileText', 'Industria papelera'),
  ('Textil', 'Shirt', 'Sector textil'),
  ('Metalurgia', 'Hammer', 'Industria metalúrgica'),
  ('Energía', 'Zap', 'Sector energético'),
  ('Municipal', 'Building2', 'Servicios municipales de agua')
ON CONFLICT DO NOTHING;