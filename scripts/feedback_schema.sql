-- Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  category    TEXT NOT NULL, -- 'bug', 'suggestion', 'complaint', 'other'
  content     TEXT NOT NULL,
  status      TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved'
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert own feedback" ON public.feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own feedback" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all feedback" ON public.feedback
  FOR SELECT USING ( public.is_admin() );

CREATE POLICY "Admins can update feedback status" ON public.feedback
  FOR UPDATE USING ( public.is_admin() );
