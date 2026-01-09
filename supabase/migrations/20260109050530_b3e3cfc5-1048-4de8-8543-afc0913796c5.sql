-- Tabla de usuarios de AI Advisor (separada de auth.users)
CREATE TABLE public.advisor_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  company TEXT,
  role TEXT DEFAULT 'user',
  sector TEXT,
  credits_balance DECIMAL(10,2) DEFAULT 0,
  free_queries_used INTEGER DEFAULT 0,
  free_queries_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de transacciones de créditos
CREATE TABLE public.advisor_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.advisor_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'bonus', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  description TEXT,
  model_used TEXT,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de conversaciones
CREATE TABLE public.advisor_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.advisor_users(id) ON DELETE CASCADE,
  title TEXT,
  model_used TEXT,
  total_credits_used DECIMAL(10,2) DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de mensajes
CREATE TABLE public.advisor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.advisor_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_input INTEGER,
  tokens_output INTEGER,
  credits_used DECIMAL(10,4),
  sources JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de solicitudes de callback
CREATE TABLE public.advisor_callback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.advisor_users(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'consultation',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'scheduled', 'completed', 'cancelled')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  preferred_time TEXT,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_advisor_credits_user_id ON public.advisor_credits(user_id);
CREATE INDEX idx_advisor_chats_user_id ON public.advisor_chats(user_id);
CREATE INDEX idx_advisor_messages_chat_id ON public.advisor_messages(chat_id);
CREATE INDEX idx_advisor_callback_requests_user_id ON public.advisor_callback_requests(user_id);
CREATE INDEX idx_advisor_callback_requests_status ON public.advisor_callback_requests(status);

-- Trigger para actualizar updated_at en advisor_users
CREATE TRIGGER update_advisor_users_updated_at
BEFORE UPDATE ON public.advisor_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para actualizar updated_at en advisor_chats
CREATE TRIGGER update_advisor_chats_updated_at
BEFORE UPDATE ON public.advisor_chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: Las tablas advisor_* son accesibles públicamente ya que usan auth propia
-- El backend de Railway valida la autenticación

ALTER TABLE public.advisor_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_callback_requests ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para acceso desde el frontend (auth manejada por backend)
CREATE POLICY "Public access to advisor_users" ON public.advisor_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to advisor_credits" ON public.advisor_credits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to advisor_chats" ON public.advisor_chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to advisor_messages" ON public.advisor_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to advisor_callback_requests" ON public.advisor_callback_requests FOR ALL USING (true) WITH CHECK (true);