-- Extend Supabase auth.users
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          TEXT DEFAULT 'user',
  plan          TEXT DEFAULT 'free',
  credits_used  INT DEFAULT 0,
  credits_limit INT DEFAULT 3,
  reset_at      TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.generations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  prompt      TEXT NOT NULL,
  category    TEXT,
  output_vba  TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.users(id),
  plan        TEXT NOT NULL,
  amount      INT NOT NULL,
  status      TEXT DEFAULT 'pending',
  midtrans_id TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admin check function (bypasses RLS to avoid infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- users: users can read/update own row. Admin (role='admin') can read all.
CREATE POLICY "Users can read own row" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own row" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT USING ( public.is_admin() );

-- generations: users can read/insert own rows. Admin can read all.
CREATE POLICY "Users can insert own generation" ON public.generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own generation" ON public.generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all generations" ON public.generations
  FOR SELECT USING ( public.is_admin() );

-- payments: users can read own rows. Admin can read all.
CREATE POLICY "Users can read own payment" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all payments" ON public.payments
  FOR SELECT USING ( public.is_admin() );

-- Trigger to create public.user on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    new.id, 
    new.email,
    CASE WHEN new.email = 'boy.konsulkan@gmail.com' THEN 'admin' ELSE 'user' END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Allow users to update their own generation (needed for chat code updates)
CREATE POLICY "Users can update own generation" ON public.generations
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin settings: singleton row that controls AI config and usage limits
CREATE TABLE public.admin_settings (
  id                      INT PRIMARY KEY DEFAULT 1,
  ai_provider             TEXT DEFAULT 'openrouter',
  ai_model                TEXT DEFAULT 'anthropic/claude-3-5-sonnet',
  system_context          TEXT DEFAULT '',
  free_credits_limit      INT DEFAULT 3,
  max_chat_per_generation INT DEFAULT 10,
  payment_provider        TEXT DEFAULT 'midtrans',
  lynk_url_addon          TEXT DEFAULT '',
  lynk_url_starter        TEXT DEFAULT '',
  lynk_url_pro            TEXT DEFAULT '',
  updated_at              TIMESTAMP DEFAULT NOW()
);

INSERT INTO public.admin_settings (id) VALUES (1);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read settings" ON public.admin_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update settings" ON public.admin_settings
  FOR UPDATE USING ( public.is_admin() );

-- Generation chats: stores the refinement chat history per generated macro
CREATE TABLE public.generation_chats (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID REFERENCES public.generations(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content       TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.generation_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chats" ON public.generation_chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats" ON public.generation_chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all chats" ON public.generation_chats
  FOR SELECT USING ( public.is_admin() );

-- Plan settings: configuration per user plan (free, starter, pro)
CREATE TABLE public.plan_settings (
  plan                    TEXT PRIMARY KEY,
  ai_provider             TEXT DEFAULT 'openrouter',
  ai_model                TEXT DEFAULT 'anthropic/claude-3-5-sonnet',
  system_context          TEXT DEFAULT '',
  credits_limit           INT DEFAULT 3,
  max_chat_per_generation INT DEFAULT 10,
  updated_at              TIMESTAMP DEFAULT NOW()
);

-- Seed plan settings
INSERT INTO public.plan_settings (plan, credits_limit, max_chat_per_generation) VALUES 
('free', 3, 5),
('starter', 50, 10),
('pro', 9999, 999);

ALTER TABLE public.plan_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read plan settings" ON public.plan_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update plan settings" ON public.plan_settings
  FOR UPDATE USING ( public.is_admin() );
