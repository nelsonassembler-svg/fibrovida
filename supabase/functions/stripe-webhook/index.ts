// FibroVida — Stripe Webhook Handler
// Ativa/renova/cancela Premium automaticamente após pagamento

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

// Price ID → tipo do plano
const PRICE_PLAN_MAP: Record<string, string> = {
  "price_1Tb2EDR5OonznFInrezujJj2": "monthly",   // R$9,90/mês
  "price_1Tb2EER5OonznFInd83dCz5w": "annual",    // R$79,90/ano
  "price_1Tb2EER5OonznFInJI1xr6YF": "lifetime",  // R$149,90 único
};

const SUPABASE_URL         = Deno.env.get("SB_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SB_SERVICE_KEY")!;

async function updateProfile(filter: string, data: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${filter}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) console.error("Supabase error:", await res.text());
  return res;
}

function addMonths(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString();
}

function addYears(n: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + n);
  return d.toISOString();
}

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body      = await req.text();

  // 1. Verificar assinatura do webhook
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error("Assinatura inválida:", (err as Error).message);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  console.log(`📩 Evento recebido: ${event.type}`);

  try {
    // 2. Processar eventos
    switch (event.type) {

      // ── Checkout concluído (1ª compra ou plano único) ──
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId  = session.client_reference_id;
        const email   = session.customer_details?.email ?? "";

        // Descobrir o plano pelo price_id
        const items   = await stripe.checkout.sessions.listLineItems(session.id);
        const priceId = items.data[0]?.price?.id ?? "";
        const planType = PRICE_PLAN_MAP[priceId] ?? "monthly";

        const payload: Record<string, unknown> = {
          plan:               "premium",
          plan_type:          planType,
          courtesy:           false,
          stripe_customer_id: session.customer as string ?? null,
          updated_at:         new Date().toISOString(),
        };

        if (planType === "monthly")  payload.plan_expires_at = addMonths(1);
        if (planType === "annual")   payload.plan_expires_at = addYears(1);
        if (planType === "lifetime") payload.plan_expires_at = null; // nunca expira

        // Atualizar pelo userId (mais seguro) ou pelo email
        if (userId) {
          await updateProfile(`id=eq.${userId}`, payload);
          console.log(`✅ Premium ${planType} ativado para userId=${userId}`);
        } else if (email) {
          await updateProfile(`email=eq.${encodeURIComponent(email)}`, payload);
          console.log(`✅ Premium ${planType} ativado para email=${email}`);
        }
        break;
      }

      // ── Renovação de assinatura ──
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break; // ignorar cobranças avulsas

        const sub      = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const priceId  = sub.items.data[0]?.price?.id ?? "";
        const planType = PRICE_PLAN_MAP[priceId] ?? "monthly";
        const customerId = invoice.customer as string;

        const payload: Record<string, unknown> = {
          plan:             "premium",
          plan_type:        planType,
          plan_expires_at:  planType === "annual" ? addYears(1) : addMonths(1),
          updated_at:       new Date().toISOString(),
        };

        await updateProfile(`stripe_customer_id=eq.${customerId}`, payload);
        console.log(`🔄 Renovação ${planType} para customer=${customerId}`);
        break;
      }

      // ── Cancelamento de assinatura ──
      case "customer.subscription.deleted": {
        const sub        = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await updateProfile(`stripe_customer_id=eq.${customerId}`, {
          plan:             "free",
          plan_type:        null,
          plan_expires_at:  null,
          updated_at:       new Date().toISOString(),
        });
        console.log(`❌ Assinatura cancelada para customer=${customerId}`);
        break;
      }

      default:
        console.log(`⏭️ Evento ignorado: ${event.type}`);
    }
  } catch (err) {
    console.error("Erro no handler:", err);
    return new Response("Internal error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
