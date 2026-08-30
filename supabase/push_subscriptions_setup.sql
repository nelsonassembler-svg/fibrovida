-- ============================================================
-- FibroVida: Push Subscriptions + Cron para lembretes
-- Executar no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Tabela de subscriptions Web Push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription  jsonb NOT NULL,               -- { endpoint, keys: { p256dh, auth } }
  user_agent    text,
  created_at    timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_push_sub_user_id ON push_subscriptions(user_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: usuário só vê/grava suas próprias subscriptions
CREATE POLICY "push_sub_select" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_sub_insert" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_sub_delete" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Service role pode ler e deletar subscriptions expiradas (edge function)
CREATE POLICY "push_sub_service_select" ON push_subscriptions
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "push_sub_service_delete" ON push_subscriptions
  FOR DELETE USING (auth.role() = 'service_role');

-- ============================================================
-- 2. Adicionar secrets nas Edge Functions (Dashboard → Edge Functions → Secrets)
-- VAPID_PUBLIC_KEY  = BA60eg357_7vK2YuTUsLeZchdaTJebyQzVmg3NEWU80i4MJ09GtgHDvDbJtChcyfVAPc-m7VXztiAs-kFyFAbKU
-- VAPID_PRIVATE_KEY = Jc7GgI-wQv_LPN9RVtWvybVcSS-faXGXQsE7a-u3Qnk
-- SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtdXBzaG9kdnRkZGx6cm9odXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzUxNjYsImV4cCI6MjA5NDMxMTE2Nn0.2v3oQrkw9Lz5ZqjM2tftVBEZrbE7Gu86sUe9uzFrNm4
-- (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente)

-- ============================================================
-- 3. pg_cron: dispara a Edge Function a cada minuto
-- (requer extensão pg_cron — já ativa no Supabase)
-- ============================================================

-- URL da Edge Function (substitua <PROJECT_REF> pelo ref do projeto)
-- Projeto: pmupshodvtddlzrohuvi
SELECT cron.schedule(
  'fibrovida-med-notify',   -- nome do job (único)
  '* * * * *',              -- toda minuto
  $$
    SELECT net.http_post(
      url     := 'https://pmupshodvtddlzrohuvi.supabase.co/functions/v1/notify-medications',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- Para verificar se o cron foi criado:
-- SELECT * FROM cron.job WHERE jobname = 'fibrovida-med-notify';

-- Para pausar/remover o cron (se necessário):
-- SELECT cron.unschedule('fibrovida-med-notify');

-- ============================================================
-- 3. Tabela push_scheduled — notificações adiadas pelo usuário
-- ============================================================
CREATE TABLE IF NOT EXISTS push_scheduled (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  med_id      uuid NOT NULL,
  med_name    text NOT NULL,
  med_dosage  text,
  fire_at     timestamptz NOT NULL,
  sent        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_scheduled_fire_at ON push_scheduled(fire_at) WHERE sent = false;

ALTER TABLE push_scheduled ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_sched_service_all" ON push_scheduled
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 4. Tabela medication_intake_logs — histórico de doses tomadas
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_intake_logs (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  med_id    uuid NOT NULL,
  med_name  text NOT NULL,
  taken_at  timestamptz NOT NULL,
  source    text DEFAULT 'manual',   -- 'manual' | 'push_notification'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_med_intake_user ON medication_intake_logs(user_id, taken_at DESC);

ALTER TABLE medication_intake_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "med_intake_select" ON medication_intake_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "med_intake_insert" ON medication_intake_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role (edge function) pode inserir
CREATE POLICY "med_intake_service_insert" ON medication_intake_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "med_intake_service_select" ON medication_intake_logs
  FOR SELECT USING (auth.role() = 'service_role');
