-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'analyst', 'client_basic', 'client_professional', 'client_enterprise');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  role app_role DEFAULT 'client_basic' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create technologies table with Spanish column names (as specified)
CREATE TABLE public.technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "Nombre de la tecnología" TEXT NOT NULL,
  "Proveedor / Empresa" TEXT,
  "País de origen" TEXT,
  "Web de la empresa" TEXT,
  "Email de contacto" TEXT,
  "Tipo de tecnología" TEXT NOT NULL,
  "Subcategoría" TEXT,
  "Sector y subsector" TEXT,
  "Aplicación principal" TEXT,
  "Descripción técnica breve" TEXT,
  "Ventaja competitiva clave" TEXT,
  "Porque es innovadora" TEXT,
  "Casos de referencia" TEXT,
  "Paises donde actua" TEXT,
  "Comentarios del analista" TEXT,
  "Fecha de scouting" DATE,
  "Estado del seguimiento" TEXT,
  "Grado de madurez (TRL)" INTEGER CHECK ("Grado de madurez (TRL)" >= 1 AND "Grado de madurez (TRL)" <= 9),
  status TEXT DEFAULT 'active',
  quality_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.technologies ENABLE ROW LEVEL SECURITY;

-- Technologies policies - read for all authenticated users
CREATE POLICY "Authenticated users can view technologies"
ON public.technologies FOR SELECT
TO authenticated
USING (true);

-- Technologies policies - insert/update for analysts and above
CREATE POLICY "Analysts and above can insert technologies"
ON public.technologies FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor') OR 
  public.has_role(auth.uid(), 'analyst')
);

CREATE POLICY "Analysts and above can update technologies"
ON public.technologies FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor') OR 
  public.has_role(auth.uid(), 'analyst')
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects"
ON public.projects FOR SELECT
TO authenticated
USING (client_id = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Users can create projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Create project_technologies junction table
CREATE TABLE public.project_technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  technology_id UUID REFERENCES public.technologies(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  added_by UUID REFERENCES auth.users(id),
  UNIQUE (project_id, technology_id)
);

ALTER TABLE public.project_technologies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project technologies"
ON public.project_technologies FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (client_id = auth.uid() OR created_by = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'supervisor')
);

CREATE POLICY "Users can add technologies to projects"
ON public.project_technologies FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (client_id = auth.uid() OR created_by = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'supervisor')
);

-- Create user_favorites table
CREATE TABLE public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  technology_id UUID REFERENCES public.technologies(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, technology_id)
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
ON public.user_favorites FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can add favorites"
ON public.user_favorites FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove favorites"
ON public.user_favorites FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', 'client_basic');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client_basic');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technologies_updated_at
  BEFORE UPDATE ON public.technologies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();