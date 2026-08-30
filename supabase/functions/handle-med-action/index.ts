// FibroVida — Edge Function: handle-med-action
// Chamada pelo Service Worker quando o usuário clica em "Tomei" ou "Adiar"
// nas notificações push — funciona mesmo com o app fechado.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("ANON_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  // Aceita a anon key (pública, usada pelo SW) ou a service key
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/, "");
  if (token !== SUPABASE_ANON_KEY && token !== SUPABASE_SERVICE) {
    return new Response("Unauthorized", { status: 401, headers: CORS });
  }

  let body: { action?: string; med_id?: string; user_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: CORS });
  }

  const { action, med_id, user_id } = body;

  if (!action || !med_id || !user_id) {
    return new Response(JSON.stringify({ error: "action, med_id e user_id são obrigatórios" }), {
      status: 400, headers: CORS,
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  // ── TOMEI ─────────────────────────────────────────────────────
  if (action === "tomei") {
    // Busca o medicamento para verificar estoque
    const { data: med, error: fetchErr } = await supabase
      .from("medications")
      .select("id, name, stock, user_id")
      .eq("id", med_id)
      .eq("user_id", user_id)
      .single();

    if (fetchErr || !med) {
      return new Response(JSON.stringify({ error: "Medicamento não encontrado" }), {
        status: 404, headers: CORS,
      });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Decrementa estoque se houver controle de estoque
    if (typeof med.stock === "number" && med.stock > 0) {
      updates.stock = med.stock - 1;
    }

    const { error: updateErr } = await supabase
      .from("medications")
      .update(updates)
      .eq("id", med_id);

    if (updateErr) {
      console.error("[handle-med-action] erro ao atualizar estoque:", updateErr.message);
    }

    // Registra log de dose tomada
    await supabase.from("medication_intake_logs").insert({
      user_id,
      med_id,
      med_name: med.name,
      taken_at: new Date().toISOString(),
      source:   "push_notification",
    });

    console.log(`[handle-med-action] tomei: ${med.name} (user ${user_id})`);
    return new Response(JSON.stringify({ ok: true, action: "tomei", med: med.name }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // ── ADIAR ─────────────────────────────────────────────────────
  if (action === "adiar") {
    const { data: med } = await supabase
      .from("medications")
      .select("id, name, dosage, user_id")
      .eq("id", med_id)
      .eq("user_id", user_id)
      .single();

    if (!med) {
      return new Response(JSON.stringify({ error: "Medicamento não encontrado" }), {
        status: 404, headers: CORS,
      });
    }

    // Agenda re-disparo para 10 minutos no futuro
    const fireAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: schedErr } = await supabase.from("push_scheduled").insert({
      user_id,
      med_id,
      med_name:   med.name,
      med_dosage: med.dosage ?? null,
      fire_at:    fireAt,
      sent:       false,
    });

    if (schedErr) {
      console.error("[handle-med-action] erro ao agendar:", schedErr.message);
      return new Response(JSON.stringify({ error: schedErr.message }), { status: 500, headers: CORS });
    }

    console.log(`[handle-med-action] adiar: ${med.name} → ${fireAt}`);
    return new Response(JSON.stringify({ ok: true, action: "adiar", fire_at: fireAt }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
    status: 400, headers: CORS,
  });
});
