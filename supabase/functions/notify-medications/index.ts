// FibroVida — Edge Function: notify-medications
// Dispara a cada minuto via pg_cron e envia Web Push para lembretes de medicamentos.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT     = "mailto:nelsontcmagalhaes@gmail.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Autenticação: só aceita chamadas do próprio Supabase (cron) ou com a service key
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.includes(SUPABASE_SERVICE)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  // Horário atual em Brasília (UTC-3)
  const now        = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const brMinutes  = ((utcMinutes - 180) + 1440) % 1440;
  const hh         = String(Math.floor(brMinutes / 60)).padStart(2, "0");
  const mm         = String(brMinutes % 60).padStart(2, "0");
  const currentTime = `${hh}:${mm}`;

  console.log(`[notify] ${new Date().toISOString()} → Brasília: ${currentTime}`);

  // Busca todos medicamentos ativos com horário definido
  const { data: meds, error: medsErr } = await supabase
    .from("medications")
    .select("id, user_id, name, dosage, schedule_time")
    .eq("active", true)
    .not("schedule_time", "is", null);

  if (medsErr) {
    console.error("[notify] erro ao buscar medicamentos:", medsErr.message);
    return new Response(JSON.stringify({ error: medsErr.message }), { status: 500 });
  }

  // Filtra os que têm horário exato agora
  const dueMeds = (meds ?? []).filter(med => {
    const horarios = med.schedule_time.split(/[,;/ ]/).map((h: string) => h.trim().substring(0, 5));
    return horarios.includes(currentTime);
  });

  console.log(`[notify] ${dueMeds.length} medicamento(s) no horário ${currentTime}`);
  if (!dueMeds.length) {
    return new Response(JSON.stringify({ sent: 0, time: currentTime }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const med of dueMeds) {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("user_id", med.user_id);

    if (!subs?.length) continue;

    const payload = JSON.stringify({
      title: "💊 FibroVida — Medicamento",
      body:  `${med.name}${med.dosage ? " — " + med.dosage : ""}`,
      icon:  "/fibrovida/icons/icon-192.png",
      badge: "/fibrovida/icons/icon-72.png",
      tag:   `med-${med.id}`,
      url:   "/fibrovida/#medicamentos",
    });

    for (const { id, subscription } of subs) {
      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (e: unknown) {
        // Status 410 = subscription expirada — remove do banco
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", id);
          console.log(`[notify] subscription expirada removida: ${id}`);
        } else {
          errors.push(`${med.name}: ${String(e)}`);
        }
      }
    }
  }

  console.log(`[notify] enviadas: ${sent}, erros: ${errors.length}`);
  return new Response(JSON.stringify({ sent, errors, time: currentTime }), {
    headers: { "Content-Type": "application/json" },
  });
});
