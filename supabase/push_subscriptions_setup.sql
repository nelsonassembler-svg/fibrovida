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
-- 2. pg_cron: dispara a Edge Function a cada minuto
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
