-- ============================================================
--  FibroVida — Módulos: Divã Digital + Exercício & Academia
--  Executar no Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Tabela: diva_recordings ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diva_recordings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT,
  mood          SMALLINT    DEFAULT 0,
  duration      INTEGER     DEFAULT 0,
  storage_path  TEXT        NOT NULL,
  url           TEXT        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diva_recordings_user
  ON public.diva_recordings(user_id, created_at DESC);

ALTER TABLE public.diva_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diva_select" ON public.diva_recordings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "diva_insert" ON public.diva_recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "diva_delete" ON public.diva_recordings
  FOR DELETE USING (auth.uid() = user_id);

-- ── Tabela: exercicios ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exercicios (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo         TEXT        NOT NULL,
  data         DATE        NOT NULL,
  duracao      INTEGER,
  intensidade  TEXT        DEFAULT 'moderada',
  dor_nivel    SMALLINT    DEFAULT 0,
  obs          TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercicios_user_data
  ON public.exercicios(user_id, data DESC);

ALTER TABLE public.exercicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercicios_select" ON public.exercicios
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "exercicios_insert" ON public.exercicios
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exercicios_update" ON public.exercicios
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "exercicios_delete" ON public.exercicios
  FOR DELETE USING (auth.uid() = user_id);

-- ── Storage: garantir que health-docs existe ─────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('health-docs', 'health-docs', true)
ON CONFLICT (id) DO NOTHING;
