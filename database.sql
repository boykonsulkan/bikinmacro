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
  mayar_ref   TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- users: users can read/update own row. Admin (role='admin') can read all.
CREATE POLICY "Users can read own row" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own row" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- generations: users can read/insert own rows. Admin can read all.
CREATE POLICY "Users can insert own generation" ON public.generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own generation" ON public.generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all generations" ON public.generations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- payments: users can read own rows. Admin can read all.
CREATE POLICY "Users can read own payment" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all payments" ON public.payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

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
