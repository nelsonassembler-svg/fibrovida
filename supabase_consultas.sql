-- ============================================================
--  FibroVida — Módulo Consultas Médicas
--  Executar no Supabase Dashboard → SQL Editor
-- ============================================================

-- Tabela principal de consultas
CREATE TABLE IF NOT EXISTS public.consultations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_name      TEXT        NOT NULL,
  specialty        TEXT,
  location         TEXT,
  date             DATE        NOT NULL,
  time             TIME,
  notes            TEXT,
  exams_requested  TEXT,
  prescriptions    TEXT,
  next_date        DATE,
  next_alert       BOOLEAN     DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Tabela de anexos (solicitações, receitas, resultados)
CREATE TABLE IF NOT EXISTS public.consultation_attachments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id  UUID        NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL CHECK (type IN ('solicitacao','receita','resultado','outro')),
  filename         TEXT        NOT NULL,
  storage_path     TEXT        NOT NULL,
  url              TEXT        NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_consultations_user_date
  ON public.consultations(user_id, date);

CREATE INDEX IF NOT EXISTS idx_consultation_attachments_consultation
  ON public.consultation_attachments(consultation_id);

-- ── RLS: cada usuário só vê seus próprios dados ──────────────

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_attachments ENABLE ROW LEVEL SECURITY;

-- Policies para consultations
CREATE POLICY "Users can view own consultations"
  ON public.consultations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consultations"
  ON public.consultations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consultations"
  ON public.consultations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own consultations"
  ON public.consultations FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para consultation_attachments
CREATE POLICY "Users can view own attachments"
  ON public.consultation_attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attachments"
  ON public.consultation_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments"
  ON public.consultation_attachments FOR DELETE
  USING (auth.uid() = user_id);

-- ── Storage: garantir que health-docs existe ─────────────────
-- (bucket já criado anteriormente — este INSERT é ignorado se já existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('health-docs', 'health-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Policy de storage para a pasta consultas (caso não exista ainda)
CREATE POLICY "Users can upload consultas"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'health-docs'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can read own consultas"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'health-docs'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can delete own consultas"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'health-docs'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );
