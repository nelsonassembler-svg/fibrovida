/* ============================================================
   FibroVida — app.js
   Supabase backend | pt-BR | dd/mm/aaaa
   ============================================================ */

// ── CONFIGURAÇÃO SUPABASE ────────────────────────────────────
const SUPABASE_URL      = "https://pmupshodvtddlzrohuvi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtdXBzaG9kdnRkZGx6cm9odXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzUxNjYsImV4cCI6MjA5NDMxMTE2Nn0.2v3oQrkw9Lz5ZqjM2tftVBEZrbE7Gu86sUe9uzFrNm4";
const ADMIN_EMAIL       = "nelsontcmagalhaes@gmail.com";

// ── STRIPE (LIVE) ─────────────────────────────────────────────
// Produtos e Payment Links criados via API em 25/mai/2026
const STRIPE_LINKS = {
  monthly:  "https://buy.stripe.com/3cI6oJ73t5joeDgdtXgIo00",  // R$9,90/mês
  annual:   "https://buy.stripe.com/5kQ3cxbjJ3bg8eS75zgIo01",  // R$79,90/ano
  lifetime: "https://buy.stripe.com/8x28wRcnN4fkdzc9dHgIo02",  // R$149,90 único
};

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── ESTADO ───────────────────────────────────────────────────
let currentUser      = null;
let currentProfile   = null;
let isAdmin          = false;
let isPremium        = false;
let allTasks         = [];
let allRecipes       = [];
let currentRecipeCat = "all";

const TRIAL_DAYS     = 7;   // dias de trial gratuito

// ── FRASES MOTIVACIONAIS ─────────────────────────────────────
const motivations = [
  '"Cada pequeno passo conta. Você está indo bem!" 🌿',
  '"Seu corpo merece cuidado e gentileza. Respeite seu ritmo." 💚',
  '"A força não está em nunca sentir dor, mas em continuar mesmo assim." 🌸',
  '"Hoje é um novo começo. Cuide-se com carinho." ✨',
  '"Você é mais forte do que a fibromialgia. Acredite nisso!" 💪',
  '"Pequenas conquistas merecem grandes celebrações." 🎉',
  '"Descansar também é progredir. Ouça seu corpo." 🌙',
  '"Você não está sozinho(a) nessa jornada." 🤝',
  '"A gratidão transforma o que temos em suficiente." 🙏',
  '"Um dia de cada vez. Um respiro de cada vez." 🌬️',
  '"Seu descanso é tão importante quanto seu tratamento." 🛌',
  '"Gentileza consigo mesma é o melhor remédio." 💜',
  '"A fibromialgia não define quem você é. Você é muito mais." 🌟',
  '"Você fez tudo que podia hoje. Isso é suficiente." 🌺',
  '"Cada registro que você faz é um ato de amor por você mesma." 📊',
  '"O progresso não é linear. Ter dias difíceis faz parte." 🌊',
  '"Cuide da sua mente tanto quanto cuida do seu corpo." 🧘',
  '"Você merece uma vida com qualidade e bem-estar." 🦋',
  '"Pequenos momentos de paz também são vitórias." ☮️',
  '"Seu corpo faz o melhor que pode. Agradeça a ele." 🙌',
];
let _motivIdx = Math.floor(Math.random() * motivations.length);

// ── MODO ESCURO ──────────────────────────────────────────────
function toggleDarkMode() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("fibrovida-dark", isDark ? "1" : "0");
  const btn = document.getElementById("dark-toggle-btn");
  if (btn) btn.textContent = isDark ? "☀️" : "🌙";
}

function applyDarkMode() {
  const saved = localStorage.getItem("fibrovida-dark");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const dark = saved !== null ? saved === "1" : prefersDark;
  if (dark) document.body.classList.add("dark");
  const btn = document.getElementById("dark-toggle-btn");
  if (btn) btn.textContent = dark ? "☀️" : "🌙";
}

// ── UTILIDADES ───────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

function fmtMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getInitials(name) {
  if (!name) return "?";
  return name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function moodEmoji(m) {
  return { muito_bem:"😄", bem:"🙂", neutro:"😐", mal:"😔", muito_mal:"😢" }[m] || "—";
}

function moodLabel(m) {
  return { muito_bem:"Muito bem", bem:"Bem", neutro:"Neutro", mal:"Mal", muito_mal:"Muito mal" }[m] || "—";
}

function catLabel(c) {
  return { cafe:"☕ Café da manhã", almoco:"🍽️ Almoço", jantar:"🌙 Jantar",
           lanche:"🥜 Lanche", sobremesa:"🍓 Sobremesa", suco:"🥤 Suco" }[c] || c;
}

function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function starsText(n, max=5) {
  let s=""; for(let i=1;i<=max;i++) s+=i<=n?"⭐":"☆"; return s;
}

// ── LOADING / TOAST ──────────────────────────────────────────
function showLoad() { document.getElementById("loadingOverlay").classList.add("on"); }
function hideLoad() { document.getElementById("loadingOverlay").classList.remove("on"); }

function toast(msg, type="s") {
  const c = document.getElementById("toastContainer");
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3400);
}

// ── NAVEGAÇÃO ────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
}

function showTab(name, navEl) {
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.getElementById("tab-" + name)?.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  if (navEl) {
    navEl.classList.add("active");
  } else {
    document.querySelector(`.nav-item[data-tab="${name}"]`)?.classList.add("active");
  }

  const loaders = {
    inicio:        loadHome,
    saude:         loadHealthRecords,
    tarefas:       loadTasks,
    terapias:      loadTreatments,
    bemestar:      loadGratitude,
    profissionais: loadProfessionals,
    medicamentos:  loadMedications,
    receitas:      loadRecipes,
    relatorios:    loadReports,
    assistente:    loadAssistente,
    config:        () => { renderConfig(); loadAchievements(); loadEmergencyContacts(); },
  };
  loaders[name]?.();
}

// ── MODAIS ───────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add("open"); }
function closeModal(id) { document.getElementById(id)?.classList.remove("open"); }

// Fechar ao clicar fora
document.addEventListener("click", e => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("open");
  }
});

// ── AUTH PANELS ──────────────────────────────────────────────
function showPanel(id) {
  document.querySelectorAll(".auth-panel").forEach(p => p.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
}

function togglePass(inputId, btn) {
  const el = document.getElementById(inputId);
  el.type = el.type === "password" ? "text" : "password";
  btn.textContent = el.type === "password" ? "👁️" : "🙈";
}

function showLGPD() { openModal("modal-lgpd"); }
function openAdminModal() { openModal("modal-admin"); }

// ── SLIDER ───────────────────────────────────────────────────
function updateRange(input, valId, max) {
  document.getElementById(valId).textContent = input.value;
  input.style.setProperty("--pct", (input.value / max * 100) + "%");
}

// ── LOGIN ────────────────────────────────────────────────────
async function doLogin() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  if (!email || !password) { toast("Preencha e-mail e senha.", "e"); return; }
  showLoad();
  try {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await afterLogin(data.user);
  } catch(e) {
    toast(translateErr(e.message), "e");
  } finally { hideLoad(); }
}

// ── CADASTRO ─────────────────────────────────────────────────
async function doRegister() {
  const name     = document.getElementById("reg-name").value.trim();
  const email    = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const lgpd     = document.getElementById("lgpd-check").checked;

  if (!name || !email || !password) { toast("Preencha todos os campos.", "e"); return; }
  if (password.length < 6)          { toast("Senha: mínimo 6 caracteres.", "e"); return; }
  if (!lgpd)                        { toast("Aceite a Política de Privacidade (LGPD).", "w"); return; }

  showLoad();
  try {
    const { data, error } = await db.auth.signUp({
      email, password, options: { data: { name } }
    });
    if (error) throw error;

    // Se confirmação de e-mail está DESATIVADA no Supabase,
    // o usuário já fica confirmado e logado na hora.
    if (data.session) {
      toast("Conta criada com sucesso! Bem-vindo(a)! 🌿", "s");
      await afterLogin(data.user);
    } else {
      // Confirmação de e-mail ainda está ATIVADA
      toast("Conta criada! Verifique seu e-mail para confirmar.", "i");
      showPanel("panel-confirm");
    }
  } catch(e) {
    toast(translateErr(e.message), "e");
  } finally { hideLoad(); }
}

// ── RECUPERAÇÃO ──────────────────────────────────────────────
async function doRecovery() {
  const email = document.getElementById("recovery-email").value.trim();
  if (!email) { toast("Digite seu e-mail.", "e"); return; }
  showLoad();
  try {
    const { error } = await db.auth.resetPasswordForEmail(email);
    if (error) throw error;
    toast("Link enviado! Verifique sua caixa de entrada.", "s");
    showPanel("panel-login");
  } catch(e) {
    toast(translateErr(e.message), "e");
  } finally { hideLoad(); }
}

// ── LOGOUT ───────────────────────────────────────────────────
async function doLogout() {
  if (!confirm("Deseja sair do FibroVida?")) return;
  await db.auth.signOut();
  currentUser = null; currentProfile = null; isAdmin = false; isPremium = false;
  showScreen("auth-screen");
  showPanel("panel-login");
  toast("Até logo! 🌿", "i");
}

// ── EXCLUIR CONTA ────────────────────────────────────────────
async function confirmDeleteAccount() {
  const pw = prompt("Para confirmar a exclusão, digite sua senha:");
  if (!pw) return;
  showLoad();
  try {
    const { error } = await db.auth.signInWithPassword({ email: currentUser.email, password: pw });
    if (error) throw new Error("Senha incorreta.");
    await db.auth.signOut();
    toast("Conta excluída. Até logo.", "i");
    showScreen("auth-screen");
  } catch(e) {
    toast(e.message || "Erro ao excluir conta.", "e");
  } finally { hideLoad(); }
}

function translateErr(msg) {
  if (!msg) return "Erro desconhecido.";
  if (msg.includes("Invalid login"))           return "E-mail ou senha incorretos.";
  if (msg.includes("Email not confirmed"))     return "Confirme seu e-mail antes de entrar.";
  if (msg.includes("already registered"))      return "E-mail já cadastrado. Faça login.";
  if (msg.includes("User already registered")) return "E-mail já cadastrado. Faça login.";
  if (msg.includes("Password should be"))      return "Senha: mínimo 6 caracteres.";
  if (msg.includes("rate limit"))              return "Muitas tentativas. Aguarde alguns minutos.";
  if (msg.includes("Unable to validate"))      return "E-mail inválido.";
  if (msg.includes("signup is disabled"))      return "Cadastro desativado. Contate o administrador.";
  return msg;
}

// ── ESTATÍSTICAS ADMIN ───────────────────────────────────────
let _statsInterval = null;

async function loadAdminStats() {
  if (!isAdmin) return;

  try {
    const agora     = new Date();
    const dez       = new Date(agora - 10 * 60 * 1000).toISOString();          // 10 min atrás
    const hojeStart = new Date(agora); hojeStart.setHours(0,0,0,0);

    const [
      { count: total   },
      { count: online  },
      { count: hoje    },
      { count: premium }
    ] = await Promise.all([
      db.from("profiles").select("*", { count:"exact", head:true }),
      db.from("profiles").select("*", { count:"exact", head:true }).gte("last_seen", dez),
      db.from("profiles").select("*", { count:"exact", head:true }).gte("last_seen", hojeStart.toISOString()),
      db.from("profiles").select("*", { count:"exact", head:true }).eq("plan","premium"),
    ]);

    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v ?? "—"; };
    set("stat-total",   total   ?? 0);
    set("stat-online",  online  ?? 0);
    set("stat-today",   hoje    ?? 0);
    set("stat-premium", premium ?? 0);

    const upd = document.getElementById("stat-updated");
    if (upd) upd.textContent = `Atualizado às ${agora.toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit",second:"2-digit"})}`;

  } catch(e) { console.warn("Erro ao carregar stats:", e); }
}

function startStatsAutoRefresh() {
  if (!isAdmin) return;
  loadAdminStats();
  clearInterval(_statsInterval);
  _statsInterval = setInterval(loadAdminStats, 60_000);
}

// ── GERENCIADOR DE USUÁRIOS (ADMIN) ──────────────────────────

let _adminUsersCache = [];

function toggleAdminUsers() {
  const body = document.getElementById("auw-body");
  const btn  = document.getElementById("auw-toggle-btn");
  if (!body) return;
  const open = body.style.display === "none";
  body.style.display = open ? "block" : "none";
  btn.textContent = open ? "▲ Recolher" : "▼ Expandir";
  if (open && _adminUsersCache.length === 0) loadAdminUsers();
}

async function loadAdminUsers(search = "") {
  if (!isAdmin) return;
  const list = document.getElementById("admin-users-list");
  if (!list) return;
  list.innerHTML = `<div class="auw-loading">⏳ Carregando usuários...</div>`;

  try {
    let q = db.from("profiles")
      .select("id, name, email, plan, courtesy, is_admin, last_seen, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (search.trim()) {
      q = q.or(`email.ilike.%${search.trim()}%,name.ilike.%${search.trim()}%`);
    }

    const { data, error } = await q;
    if (error) throw error;

    _adminUsersCache = data || [];
    renderAdminUsers(_adminUsersCache);
  } catch(e) {
    list.innerHTML = `<div class="auw-empty">❌ Erro ao carregar: ${e.message}</div>`;
  }
}

function searchAdminUsers(val) {
  clearTimeout(window._adminSearchTimer);
  window._adminSearchTimer = setTimeout(() => loadAdminUsers(val), 400);
}

function renderAdminUsers(users) {
  const list   = document.getElementById("admin-users-list");
  const footer = document.getElementById("auw-footer");
  const count  = document.getElementById("auw-count");
  if (!list) return;

  if (!users.length) {
    list.innerHTML = `<div class="auw-empty">Nenhum usuário encontrado.</div>`;
    if (footer) footer.style.display = "none";
    return;
  }

  const agora = new Date();

  list.innerHTML = users.map(u => {
    const isMe      = u.email === ADMIN_EMAIL;
    const plan      = u.plan || "free";
    const courtesy  = u.courtesy || false;
    const lastSeen  = u.last_seen ? tempoRelativo(new Date(u.last_seen)) : "nunca";
    const criadoEm  = u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—";
    const diasTrial = u.created_at ? Math.floor((agora - new Date(u.created_at)) / 86400000) : 0;

    let badgeHtml = "";
    if (isMe)              badgeHtml = `<span class="auw-badge auw-badge-admin">👑 Admin</span>`;
    else if (plan === "premium" && courtesy) badgeHtml = `<span class="auw-badge auw-badge-courtesy">🎁 Cortesia</span>`;
    else if (plan === "premium")             badgeHtml = `<span class="auw-badge auw-badge-premium">⭐ Premium</span>`;
    else if (diasTrial <= 7)                 badgeHtml = `<span class="auw-badge auw-badge-trial">🕐 Trial (${Math.max(0, 7 - diasTrial)}d)</span>`;
    else                                     badgeHtml = `<span class="auw-badge auw-badge-free">🔒 Free</span>`;

    const acoesBtns = isMe ? "" : `
      <div class="auw-actions">
        ${plan !== "premium" ? `
          <button class="auw-btn auw-btn-premium" onclick="setUserPlan('${u.id}','${u.email}','premium',false)">⭐ Ativar Premium</button>
          <button class="auw-btn auw-btn-courtesy" onclick="setUserPlan('${u.id}','${u.email}','premium',true)">🎁 Cortesia</button>
        ` : `
          <button class="auw-btn auw-btn-revoke" onclick="setUserPlan('${u.id}','${u.email}','free',false)">🔒 Revogar</button>
        `}
      </div>`;

    return `
      <div class="auw-card ${plan === "premium" ? "auw-card-premium" : ""}" id="auw-card-${u.id}">
        <div class="auw-card-top">
          <div class="auw-user-info">
            <div class="auw-user-name">${u.name || "Sem nome"} ${badgeHtml}</div>
            <div class="auw-user-email">${u.email || "—"}</div>
          </div>
          <div class="auw-user-meta">
            <div class="auw-meta-item">🕐 ${lastSeen}</div>
            <div class="auw-meta-item">📅 ${criadoEm}</div>
          </div>
        </div>
        ${acoesBtns}
      </div>`;
  }).join("");

  if (footer) { footer.style.display = "block"; }
  if (count)  { count.textContent = `${users.length} usuário(s) encontrado(s)`; }
}

async function setUserPlan(userId, email, plan, courtesy) {
  if (!isAdmin) return;
  const acao = plan === "premium"
    ? (courtesy ? `conceder cortesia para ${email}` : `ativar premium para ${email}`)
    : `revogar acesso de ${email}`;

  if (!confirm(`Confirma: ${acao}?`)) return;

  try {
    const { error } = await db.from("profiles")
      .update({ plan, courtesy: courtesy || false })
      .eq("id", userId);

    if (error) throw error;

    toast(plan === "premium"
      ? `✅ ${email} ativado como ${courtesy ? "cortesia" : "premium"}!`
      : `🔒 Acesso de ${email} revogado.`, "s");

    // atualiza cache local e re-renderiza
    _adminUsersCache = _adminUsersCache.map(u =>
      u.id === userId ? { ...u, plan, courtesy: courtesy || false } : u
    );
    renderAdminUsers(_adminUsersCache);
    loadAdminStats();
  } catch(e) {
    toast("Erro ao atualizar: " + e.message, "e");
  }
}

function tempoRelativo(date) {
  const diff = Math.floor((new Date() - date) / 1000);
  if (diff < 60)   return "agora mesmo";
  if (diff < 3600) return `${Math.floor(diff/60)}min atrás`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h atrás`;
  return `${Math.floor(diff/86400)}d atrás`;
}

async function updateLastSeen() {
  if (!currentUser) return;
  try {
    await db.from("profiles")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", currentUser.id);
  } catch(e) { /* silencioso */ }
}

// ── PÓS-LOGIN ────────────────────────────────────────────────
async function afterLogin(user) {
  currentUser = user;
  await loadProfile();

  // Admin/Premium = acesso total sempre
  if (isPremium || isAdmin) {
    showScreen("main-screen");
    showTab("inicio");
    checkLowStock();
    updateLastSeen();
    setInterval(updateLastSeen, 5 * 60 * 1000);
    startMedScheduler();
    if (isAdmin) {
      const panel = document.getElementById("admin-stats-panel");
      if (panel) panel.style.display = "block";
      startStatsAutoRefresh();
    }
    return;
  }

  // Calcula dias restantes de trial
  const criadoEm    = currentProfile?.created_at ? new Date(currentProfile.created_at) : new Date();
  const agora       = new Date();
  const diasPassados = Math.floor((agora - criadoEm) / (1000 * 60 * 60 * 24));
  const diasRestantes = TRIAL_DAYS - diasPassados;

  if (diasRestantes <= 0) {
    showPaywall();
    return;
  }

  if (diasRestantes <= 2) {
    toast(`⚠️ Seu período gratuito termina em ${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}! Assine o Premium para não perder o acesso.`, "w");
  } else {
    toast(`🌿 Trial gratuito: ${diasRestantes} dia${diasRestantes > 1 ? "s" : ""} restante${diasRestantes > 1 ? "s" : ""}`, "i");
  }

  showScreen("main-screen");
  showTab("inicio");
  checkLowStock();

  // Atualiza last_seen imediatamente e depois a cada 5 minutos
  updateLastSeen();
  setInterval(updateLastSeen, 5 * 60 * 1000);

  // Inicia verificador de horário dos medicamentos
  startMedScheduler();

  // Painel admin
  if (isAdmin) {
    const panel = document.getElementById("admin-stats-panel");
    if (panel) panel.style.display = "block";
    startStatsAutoRefresh();
  }
}

function showPaywall() {
  showScreen("paywall-screen");
}

// ── STRIPE: REDIRECIONAR PARA CHECKOUT ───────────────────────
function assinarPlano(tipo) {
  const link = STRIPE_LINKS[tipo];
  if (!link || link.includes("SUBSTITUA")) {
    toast("Link de pagamento ainda não configurado. Contate o suporte.", "e");
    return;
  }
  const email  = encodeURIComponent(currentUser?.email || "");
  const userId = currentUser?.id || "";
  const url    = `${link}?prefilled_email=${email}&client_reference_id=${userId}`;
  window.open(url, "_blank");
}

// ── STRIPE: VERIFICAR RETORNO APÓS PAGAMENTO ─────────────────
function checkPaymentSuccess() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("payment") === "success") {
    const plano = params.get("plan") || "premium";
    // Limpa os parâmetros da URL sem recarregar
    window.history.replaceState({}, document.title, window.location.pathname);
    // Aguarda o login e mostra mensagem
    setTimeout(() => {
      toast("✅ Pagamento confirmado! Fazendo login para ativar sua conta...", "s");
    }, 800);
  }
}

// ── PERFIL ───────────────────────────────────────────────────
async function loadProfile() {
  try {
    const { data } = await db.from("profiles").select("*").eq("id", currentUser.id).single();
    if (data) {
      currentProfile = data;
      isAdmin   = data.is_admin || currentUser.email === ADMIN_EMAIL;
      isPremium = data.plan === "premium" || isAdmin;
    } else {
      isAdmin   = currentUser.email === ADMIN_EMAIL;
      isPremium = isAdmin;
    }
  } catch(e) {
    isAdmin   = currentUser.email === ADMIN_EMAIL;
    isPremium = isAdmin;
  }
}

// Chamada pelo admin para ativar premium de um usuário
async function ativarPremium(email) {
  if (!isAdmin) return;
  showLoad();
  try {
    const { data: prof } = await db.from("profiles").select("id").eq("email", email).single();
    if (!prof) { toast("Usuário não encontrado.", "e"); return; }
    const { error } = await db.from("profiles")
      .update({ plan: "premium", trial_uses: 0, updated_at: new Date().toISOString() })
      .eq("id", prof.id);
    if (error) throw error;
    toast(`Premium ativado para ${email} ✅`, "s");
  } catch(e) {
    toast("Erro ao ativar premium: " + e.message, "e");
  } finally { hideLoad(); }
}

function renderConfig() {
  const name  = currentProfile?.name || currentUser?.email?.split("@")[0] || "Usuário";
  const email = currentUser?.email || "—";
  document.getElementById("config-name").textContent  = name;
  document.getElementById("config-email").textContent = email;
  document.getElementById("avatar-initials").textContent = getInitials(name);
  if (isAdmin) {
    document.getElementById("config-admin-badge").style.display = "inline-block";
    document.getElementById("admin-section").style.display      = "block";
    document.getElementById("admin-banner-strip").style.display = "block";
  }
}

function openProfileModal() {
  document.getElementById("profile-name").value = currentProfile?.name || "";
  openModal("modal-profile");
}

async function saveProfile() {
  const name = document.getElementById("profile-name").value.trim();
  if (!name) { toast("Digite seu nome.", "e"); return; }
  showLoad();
  try {
    const { error } = await db.from("profiles").upsert({
      id: currentUser.id, name, email: currentUser.email,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    if (currentProfile) currentProfile.name = name;
    else currentProfile = { name };
    closeModal("modal-profile");
    renderConfig();
    toast("Perfil atualizado! ✅", "s");
  } catch(e) {
    toast("Erro ao salvar perfil.", "e");
  } finally { hideLoad(); }
}

// ── TELA INICIAL ─────────────────────────────────────────────
async function loadHome() {
  const name  = currentProfile?.name?.split(" ")[0] || currentUser?.email?.split("@")[0] || "Amigo";
  const hour  = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const emoji = hour < 6 ? "🌙" : hour < 12 ? "☀️" : hour < 18 ? "🌤️" : "🌙";

  document.getElementById("greeting-text").textContent = `${greet}, ${name}!`;
  const emojiEl = document.getElementById("greeting-emoji");
  if (emojiEl) emojiEl.textContent = emoji;

  document.getElementById("greeting-date").textContent = new Date().toLocaleDateString("pt-BR", {
    weekday:"long", day:"2-digit", month:"long"
  });
  // Frase motivacional rotativa
  const motEl = document.getElementById("motivation-text");
  if (motEl) motEl.textContent = motivations[_motivIdx % motivations.length];
  if (!window._motivTimer) {
    window._motivTimer = setInterval(() => {
      _motivIdx = (_motivIdx + 1) % motivations.length;
      const el = document.getElementById("motivation-text");
      if (el) { el.style.opacity = "0"; setTimeout(() => { el.textContent = motivations[_motivIdx]; el.style.opacity = "1"; }, 400); }
    }, 30000);
  }

  // Data no Índice FibroVida
  const ficDate = document.getElementById("fic-date");
  if (ficDate) ficDate.textContent = new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"short" });

  // Saúde de hoje (inclui novos campos)
  try {
    const { data } = await db.from("health_records")
      .select("pain_level,sleep_quality,mood,fatigue_level,energy_level")
      .eq("user_id", currentUser.id).eq("record_date", todayISO())
      .order("created_at", { ascending: false }).limit(1);

    if (data?.[0]) {
      const r = data[0];
      // ── Summary strip ──
      const painEl  = document.getElementById("sum-pain");
      const sleepEl = document.getElementById("sum-sleep");
      if (r.pain_level  != null) { painEl.textContent  = r.pain_level;  document.getElementById("sum-pain-unit").textContent  = "/10"; painEl.style.color  = r.pain_level  <= 3 ? "var(--success)" : r.pain_level  <= 6 ? "var(--warning)" : "var(--danger)"; }
      if (r.sleep_quality != null) { sleepEl.textContent = r.sleep_quality; document.getElementById("sum-sleep-unit").textContent = "/5";  sleepEl.style.color = r.sleep_quality >= 4 ? "var(--success)" : r.sleep_quality >= 2 ? "var(--warning)" : "var(--danger)"; }

      // ── Home mini ──
      document.getElementById("home-health-mini").innerHTML =
        `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
           <span style="font-size:12px;color:var(--text2)">Dor: <strong style="color:${r.pain_level<=3?'var(--success)':r.pain_level<=6?'var(--warning)':'var(--danger)'}">${r.pain_level ?? "—"}/10</strong></span>
           <span style="font-size:12px;color:var(--text2)">Sono: <strong>${r.sleep_quality ?? "—"}/5</strong></span>
           <span style="font-size:12px;color:var(--text2)">Energia: <strong>${r.energy_level ?? "—"}/10</strong></span>
           <span style="font-size:12px;color:var(--text2)">Humor: <strong>${moodEmoji(r.mood)}</strong></span>
         </div>`;

      // ── Índice FibroVida ──
      renderFibroIndex(r);

      // ── Marca humor no seletor rápido ──
      if (r.mood) setMoodQuickActive(r.mood);

    } else {
      document.getElementById("home-health-mini").innerHTML =
        `<div class="hgc-empty" style="cursor:pointer" onclick="showTab('saude')">Ainda não há registro hoje. Toque para registrar 💚</div>`;
      renderFibroIndex(null);
    }
  } catch(e) { console.error(e); renderFibroIndex(null); }

  // Tarefas de hoje
  try {
    const { data } = await db.from("tasks")
      .select("id,completed").eq("user_id", currentUser.id).eq("task_date", todayISO());
    if (data) {
      document.getElementById("sum-tasks").textContent = `${data.filter(t=>t.completed).length}/${data.length}`;
    }
  } catch(e) { console.error(e); }

  // Conquistas (mini no home)
  loadAchievements();

  // Evangelho do dia
  loadEvangelhoDodia();
}

// ── EVANGELHO DO DIA ──────────────────────────────────────────
async function loadEvangelhoDodia() {
  const el = document.getElementById("evangelho-card");
  if (!el) return;

  // Cache por dia
  const cacheKey = `fibrovida-evang-${todayISO()}`;
  const cached   = localStorage.getItem(cacheKey);
  if (cached) { renderEvangelho(JSON.parse(cached), el); return; }

  el.innerHTML = `<div class="evang-loading"><span>🙏</span> Carregando Evangelho do Dia...</div>`;

  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent("https://liturgia.cancaonova.com/pb/")}`;
    const res  = await fetch(proxyUrl);
    const json = await res.json();
    const html = json.contents || "";

    const parser = new DOMParser();
    const doc    = parser.parseFromString(html, "text/html");

    // Extrai texto limpo de todo o body
    const fullText = doc.body?.innerText || doc.body?.textContent || "";

    // Localiza seção Evangelho
    let ref = "", texto = "", homilia = "";
    const linhas = fullText.split("\n").map(l => l.trim()).filter(Boolean);

    let modo = null, evangelhoLinhas = [], homiliaLinhas = [];
    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i];
      if (/^Evangelho\b/i.test(l))         { modo = "ref";      ref   = l; continue; }
      if (/^Homilia\b/i.test(l))           { modo = "homilia";  continue; }
      if (/^(1[ªa]?\s*Leitura|Salmo|Antífona|Oração)/i.test(l)) { if (modo === "evangelho") break; }
      if (modo === "ref")                  { modo = "evangelho"; }
      if (modo === "evangelho")            { evangelhoLinhas.push(l); if (evangelhoLinhas.length > 40) break; }
      if (modo === "homilia")              { homiliaLinhas.push(l);  if (homiliaLinhas.length > 12) break; }
    }

    texto   = evangelhoLinhas.slice(0, 20).join(" ").trim();
    homilia = homiliaLinhas.slice(0, 5).join(" ").trim();

    // Tenta achar referência bíblica (Mt, Mc, Lc, Jo)
    const matchRef = fullText.match(/(Evangelho.*?(?:Mt|Mc|Lc|Jo)\s[\d,\.\-a-z]+)/i);
    if (matchRef) ref = matchRef[1].trim();

    if (!texto) throw new Error("Texto não encontrado");

    const dados = { ref, texto: texto.substring(0, 800), homilia: homilia.substring(0, 400) };
    localStorage.setItem(cacheKey, JSON.stringify(dados));
    renderEvangelho(dados, el);

  } catch(e) {
    console.warn("Evangelho:", e);
    el.innerHTML = `
      <div class="evang-header">
        <span class="evang-icon">✝️</span>
        <div>
          <div class="evang-title">Evangelho do Dia</div>
          <div class="evang-ref">Cancão Nova</div>
        </div>
      </div>
      <p class="evang-texto" style="color:var(--text-muted);font-style:italic">
        Não foi possível carregar automaticamente.
      </p>
      <a class="evang-link" href="https://liturgia.cancaonova.com/pb/" target="_blank">
        📖 Ler o Evangelho do Dia →
      </a>`;
  }
}

function renderEvangelho(dados, el) {
  if (!el) el = document.getElementById("evangelho-card");
  if (!el) return;
  const textoPreview = dados.texto.length > 320
    ? dados.texto.substring(0, 320) + "…"
    : dados.texto;
  el.innerHTML = `
    <div class="evang-header">
      <span class="evang-icon">✝️</span>
      <div>
        <div class="evang-title">Evangelho do Dia</div>
        ${dados.ref ? `<div class="evang-ref">${esc(dados.ref)}</div>` : ""}
      </div>
    </div>
    <p class="evang-texto">${esc(textoPreview)}</p>
    ${dados.homilia ? `
      <div class="evang-homilia-title">📿 Homilia</div>
      <p class="evang-homilia-texto">${esc(dados.homilia.substring(0,200))}…</p>` : ""}
    <a class="evang-link" href="https://liturgia.cancaonova.com/pb/" target="_blank">
      📖 Ler completo no site da Cancão Nova →
    </a>`;
}

// ── SAÚDE ─────────────────────────────────────────────────────

// Salva o formulário inline da aba Saúde
async function saveHealthInline() {
  const pain    = parseInt(document.getElementById("pain-slider").value);
  const sleep   = parseInt(document.getElementById("sleep-slider").value);
  const humor   = document.getElementById("humor-select").value;
  const notes   = document.getElementById("health-notes").value.trim();
  const locais  = getSelectedLocais();

  // Novos campos FibroVida 2.0
  const fatigue = parseInt(document.getElementById("fatigue-slider")?.value) || null;
  const energy  = parseInt(document.getElementById("energy-slider")?.value)  || null;
  const triggers = [];
  document.querySelectorAll(".health-trigger:checked").forEach(cb => triggers.push(cb.value));

  showLoad();
  try {
    const { error } = await db.from("health_records").insert({
      user_id:        currentUser.id,
      record_date:    todayISO(),
      pain_level:     pain,
      sleep_quality:  sleep,
      mood:           humor || null,
      notes:          notes || null,
      body_locations: locais.length ? locais : null,
      fatigue_level:  fatigue,
      energy_level:   energy,
      triggers:       triggers.length ? triggers : [],
    });
    if (error) throw error;

    // Reset sliders principais
    ["pain-slider","sleep-slider"].forEach(id => {
      const el = document.getElementById(id);
      el.value = "0";
      el.style.setProperty("--pct","0%");
    });
    document.getElementById("pain-val").textContent  = "0";
    document.getElementById("sleep-val").textContent = "0";

    // Reset novos sliders
    const fatEl = document.getElementById("fatigue-slider");
    if (fatEl) { fatEl.value = "0"; fatEl.style.setProperty("--pct","0%"); }
    const fatValEl = document.getElementById("fatigue-val");
    if (fatValEl) fatValEl.textContent = "0";

    const engEl = document.getElementById("energy-slider");
    if (engEl) { engEl.value = "5"; engEl.style.setProperty("--pct","50%"); }
    const engValEl = document.getElementById("energy-val");
    if (engValEl) engValEl.textContent = "5";

    // Desmarca gatilhos
    document.querySelectorAll(".health-trigger:checked").forEach(cb => { cb.checked = false; });

    document.getElementById("humor-select").value = "";
    document.getElementById("health-notes").value = "";
    clearBodyLocations();

    toast("Registro salvo! 🌿", "s");
    loadHealthRecords();
    loadHome(); // atualiza resumo no início
  } catch(e) {
    toast("Erro ao salvar registro.", "e");
  } finally { hideLoad(); }
}

// Abre modal de edição (a partir da lista)
function openHealthModal(record = null) {
  const today = todayISO();
  document.getElementById("mh-title").textContent = record ? "✏️ Editar Registro" : "❤️ Novo Registro";
  document.getElementById("health-edit-id").value   = record?.id || "";
  document.getElementById("health-edit-date").value = record?.record_date || today;

  const pain  = record?.pain_level ?? 0;
  const sleep = record?.sleep_quality ?? 0;
  document.getElementById("mh-pain-slider").value  = pain;
  document.getElementById("mh-sleep-slider").value = sleep;
  document.getElementById("mh-pain-val").textContent  = pain;
  document.getElementById("mh-sleep-val").textContent = sleep;
  document.getElementById("mh-pain-slider").style.setProperty("--pct", (pain/10*100)+"%");
  document.getElementById("mh-sleep-slider").style.setProperty("--pct", (sleep/5*100)+"%");
  document.getElementById("mh-humor").value  = record?.mood || "";
  document.getElementById("mh-notes").value  = record?.notes || "";
  openModal("modal-health");
}

async function saveHealthModal() {
  const id    = document.getElementById("health-edit-id").value;
  const date  = document.getElementById("health-edit-date").value;
  const pain  = parseInt(document.getElementById("mh-pain-slider").value);
  const sleep = parseInt(document.getElementById("mh-sleep-slider").value);
  const humor = document.getElementById("mh-humor").value;
  const notes = document.getElementById("mh-notes").value.trim();

  const payload = {
    user_id: currentUser.id, record_date: date,
    pain_level: pain, sleep_quality: sleep,
    mood: humor || null, notes: notes || null,
    updated_at: new Date().toISOString()
  };

  showLoad();
  try {
    if (id) {
      const { error } = await db.from("health_records").update(payload).eq("id", id);
      if (error) throw error;
      toast("Registro atualizado! ✅", "s");
    } else {
      const { error } = await db.from("health_records").insert(payload);
      if (error) throw error;
      toast("Registro salvo! 🌿", "s");
    }
    closeModal("modal-health");
    loadHealthRecords();
  } catch(e) {
    toast("Erro ao salvar.", "e");
  } finally { hideLoad(); }
}

async function loadHealthRecords() {
  showLoad();
  try {
    let q = db.from("health_records").select("*").order("record_date", { ascending: false });
    if (!isAdmin) q = q.eq("user_id", currentUser.id);
    const { data, error } = await q;
    if (error) throw error;
    renderHealthList(data || []);
  } catch(e) { console.error(e); } finally { hideLoad(); }
  // Carrega vitais, documentos e histórico de crises em paralelo
  loadVitals();
  loadDocs();
  loadCrisisHistory();
}

function renderHealthList(list) {
  const el = document.getElementById("health-list");
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><div class="ei">📅</div><p>Seus registros aparecerão aqui</p></div>`;
    return;
  }
  el.innerHTML = list.map(r => `
    <div class="list-card">
      <div style="font-size:26px;line-height:1">${moodEmoji(r.mood)}</div>
      <div class="lc-body">
        <div class="lc-name">${fmtDate(r.record_date)}</div>
        <div class="lc-sub">
          Dor: ${r.pain_level ?? "—"}/10 &nbsp;·&nbsp; Sono: ${r.sleep_quality ?? "—"}/5
          ${r.mood ? ` &nbsp;·&nbsp; ${moodLabel(r.mood)}` : ""}
        </div>
        ${r.body_locations?.length ? `<div class="lc-sub" style="margin-top:2px;color:var(--green-dark)">📍 ${r.body_locations.slice(0,3).join(', ')}${r.body_locations.length>3?' …':''}</div>` : ""}
        ${r.notes ? `<div class="lc-sub" style="margin-top:2px">${esc(r.notes).substring(0,60)}${r.notes.length>60?"…":""}</div>` : ""}
      </div>
      <div class="lc-actions">
        <button class="ia-btn edit" onclick='openHealthModal(${JSON.stringify(r)})' title="Editar">✏️</button>
        <button class="ia-btn del"  onclick="deleteHealth('${r.id}')" title="Excluir">🗑️</button>
      </div>
    </div>`).join("");
}

async function deleteHealth(id) {
  if (!confirm("Excluir este registro?")) return;
  showLoad();
  try {
    const { error } = await db.from("health_records").delete().eq("id", id);
    if (error) throw error;
    toast("Registro excluído.", "i");
    loadHealthRecords();
  } catch(e) { toast("Erro ao excluir.", "e"); } finally { hideLoad(); }
}

// ── TAREFAS ──────────────────────────────────────────────────
function openTaskModal(task = null) {
  document.getElementById("mt-title").textContent = task ? "✏️ Editar Tarefa" : "✅ Nova Tarefa";
  document.getElementById("task-id").value     = task?.id || "";
  document.getElementById("task-title").value  = task?.title || "";
  document.getElementById("task-desc").value   = task?.description || "";
  document.getElementById("task-period").value = task?.period || "manha";
  document.getElementById("task-date").value   = task?.task_date || todayISO();
  openModal("modal-task");
}

async function saveTask() {
  const id    = document.getElementById("task-id").value;
  const title = document.getElementById("task-title").value.trim();
  if (!title) { toast("Digite o título da tarefa.", "e"); return; }

  const payload = {
    user_id:     currentUser.id,
    title,
    description: document.getElementById("task-desc").value.trim() || null,
    period:      document.getElementById("task-period").value,
    task_date:   document.getElementById("task-date").value,
    updated_at:  new Date().toISOString()
  };
  showLoad();
  try {
    if (id) {
      const { error } = await db.from("tasks").update(payload).eq("id", id);
      if (error) throw error;
      toast("Tarefa atualizada! ✅", "s");
    } else {
      const { error } = await db.from("tasks").insert(payload);
      if (error) throw error;
      toast("Tarefa criada! ✅", "s");
    }
    closeModal("modal-task");
    loadTasks();
  } catch(e) { toast("Erro ao salvar.", "e"); } finally { hideLoad(); }
}

async function loadTasks() {
  showLoad();
  try {
    let q = db.from("tasks").select("*").order("task_date",{ascending:false}).order("period",{ascending:true});
    if (!isAdmin) q = q.eq("user_id", currentUser.id);
    const { data, error } = await q;
    if (error) throw error;
    allTasks = data || [];
    renderTasksByPeriod(allTasks.filter(t => t.task_date === todayISO()));
  } catch(e) { console.error(e); } finally { hideLoad(); }
}

function renderTasksByPeriod(tasks) {
  ["manha","tarde","noite"].forEach(period => {
    const el   = document.getElementById("tasks-" + period);
    const list = tasks.filter(t => t.period === period);
    if (!list.length) {
      el.innerHTML = `<div class="period-empty">Nenhuma tarefa para este período</div>`;
      return;
    }
    el.innerHTML = list.map(t => `
      <div class="task-item ${t.completed ? "done" : ""}">
        <button class="task-cb ${t.completed ? "checked" : ""}"
          onclick="toggleTask('${t.id}',${t.completed})">${t.completed ? "✓" : ""}</button>
        <div class="task-body">
          <div class="task-title">${esc(t.title)}</div>
          ${t.description ? `<div class="task-desc">${esc(t.description)}</div>` : ""}
        </div>
        <div class="task-actions">
          <button class="ia-btn edit" onclick='openTaskModal(${JSON.stringify(t)})'>✏️</button>
          <button class="ia-btn del"  onclick="deleteTask('${t.id}')">🗑️</button>
        </div>
      </div>`).join("");
  });
}

async function toggleTask(id, done) {
  try {
    await db.from("tasks").update({
      completed:    !done,
      completed_at: !done ? new Date().toISOString() : null
    }).eq("id", id);
    loadTasks();
  } catch(e) { toast("Erro ao atualizar.", "e"); }
}

async function deleteTask(id) {
  if (!confirm("Excluir esta tarefa?")) return;
  showLoad();
  try {
    const { error } = await db.from("tasks").delete().eq("id", id);
    if (error) throw error;
    toast("Tarefa excluída.", "i");
    loadTasks();
  } catch(e) { toast("Erro ao excluir.", "e"); } finally { hideLoad(); }
}

// ── TRATAMENTOS ──────────────────────────────────────────────
function openTreatmentModal(t = null) {
  document.getElementById("mtr-title").textContent       = t ? "✏️ Editar Tratamento" : "💉 Novo Tratamento";
  document.getElementById("treatment-id").value          = t?.id || "";
  document.getElementById("treatment-name").value        = t?.name || "";
  document.getElementById("treatment-desc").value        = t?.description || "";
  document.getElementById("treatment-freq").value        = t?.frequency || "";
  document.getElementById("treatment-notes").value       = t?.notes || "";
  document.getElementById("treatment-active").value      = t ? String(t.active) : "true";
  openModal("modal-treatment");
}

async function saveTreatment() {
  const id   = document.getElementById("treatment-id").value;
  const name = document.getElementById("treatment-name").value.trim();
  if (!name) { toast("Digite o nome do tratamento.", "e"); return; }

  const payload = {
    user_id:     currentUser.id, name,
    description: document.getElementById("treatment-desc").value.trim() || null,
    frequency:   document.getElementById("treatment-freq").value.trim() || null,
    notes:       document.getElementById("treatment-notes").value.trim() || null,
    active:      document.getElementById("treatment-active").value === "true",
    updated_at:  new Date().toISOString()
  };
  showLoad();
  try {
    if (id) {
      const { error } = await db.from("treatments").update(payload).eq("id", id);
      if (error) throw error;
      toast("Tratamento atualizado! ✅", "s");
    } else {
      const { error } = await db.from("treatments").insert(payload);
      if (error) throw error;
      toast("Tratamento cadastrado!", "s");
    }
    closeModal("modal-treatment");
    loadTreatments();
  } catch(e) { toast("Erro ao salvar.", "e"); } finally { hideLoad(); }
}

async function loadTreatments() {
  showLoad();
  try {
    let q = db.from("treatments").select("*").order("created_at",{ascending:false});
    if (!isAdmin) q = q.eq("user_id", currentUser.id);
    const { data, error } = await q;
    if (error) throw error;
    renderTreatments(data || []);
  } catch(e) { console.error(e); } finally { hideLoad(); }
  loadTherapyNotes();
  loadNotepad();
}

// ── NOTAS DE SESSÃO DE TERAPIA ────────────────────────────────
async function openTherapyNoteModal(n = null) {
  document.getElementById("mtn-title").textContent = n ? "✏️ Editar Nota" : "📋 Nova Nota de Sessão";
  document.getElementById("tn-id").value        = n?.id || "";
  document.getElementById("tn-date").value      = n?.session_date || todayISO();
  document.getElementById("tn-discussed").value = n?.discussed || "";
  document.getElementById("tn-bring-next").value= n?.bring_next || "";

  // Carrega profissionais
  const sel = document.getElementById("tn-professional");
  sel.innerHTML = '<option value="">— Selecione o profissional —</option>';
  try {
    const { data: profs } = await db.from("professionals")
      .select("id,name,specialty").eq("user_id", currentUser.id).order("name");
    (profs || []).forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name + (p.specialty ? ` (${p.specialty})` : "");
      if (n?.professional_id === p.id) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch(e) { /* ignora */ }
  openModal("modal-therapy-note");
}

async function saveTherapyNote() {
  const id   = document.getElementById("tn-id").value;
  const date = document.getElementById("tn-date").value;
  if (!date) { toast("Selecione a data da sessão.", "e"); return; }
  const payload = {
    user_id:        currentUser.id,
    session_date:   date,
    professional_id: document.getElementById("tn-professional").value || null,
    discussed:      document.getElementById("tn-discussed").value.trim() || null,
    bring_next:     document.getElementById("tn-bring-next").value.trim() || null,
    updated_at:     new Date().toISOString()
  };
  showLoad();
  try {
    if (id) {
      const { error } = await db.from("therapy_notes").update(payload).eq("id", id);
      if (error) throw error;
      toast("Nota atualizada! ✅", "s");
    } else {
      const { error } = await db.from("therapy_notes").insert(payload);
      if (error) throw error;
      toast("Nota salva! 📋", "s");
    }
    closeModal("modal-therapy-note");
    loadTherapyNotes();
  } catch(e) { toast("Erro ao salvar nota.", "e"); console.error(e); } finally { hideLoad(); }
}

async function loadTherapyNotes() {
  try {
    const { data } = await db.from("therapy_notes")
      .select("*, professionals(name,specialty)")
      .eq("user_id", currentUser.id)
      .order("session_date", { ascending: false });
    renderTherapyNotes(data || []);
  } catch(e) { console.error(e); }
}

function renderTherapyNotes(list) {
  const el = document.getElementById("therapy-notes-list");
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div class="card"><div class="card-body">
      <div class="empty-state" style="padding:6px 0">
        <div class="ei">📋</div>
        <p>Nenhuma nota de sessão ainda.<br>Registre o que foi discutido e o que precisa falar!</p>
      </div></div></div>`;
    return;
  }
  el.innerHTML = list.map(n => {
    const prof = n.professionals ? `<span class="tn-badge">👨‍⚕️ ${esc(n.professionals.name)}</span>` : "";
    const dateStr = n.session_date ? new Date(n.session_date + "T12:00:00").toLocaleDateString("pt-BR") : "";
    return `<div class="tn-card">
      <div class="tn-card-header">
        <div>
          <span class="tn-date">📅 ${dateStr}</span>
          ${prof}
        </div>
        <div style="display:flex;gap:6px">
          <button class="ia-btn edit" onclick='openTherapyNoteModal(${JSON.stringify(n).replace(/'/g,"&#39;")})'>✏️</button>
          <button class="ia-btn del"  onclick="deleteTherapyNote('${n.id}')">🗑️</button>
        </div>
      </div>
      ${n.discussed ? `<div class="tn-section"><div class="tn-label">💬 O que foi discutido</div><div class="tn-text">${esc(n.discussed)}</div></div>` : ""}
      ${n.bring_next ? `<div class="tn-section"><div class="tn-label">📌 O que devo falar/fazer</div><div class="tn-text tn-text-highlight">${esc(n.bring_next)}</div></div>` : ""}
    </div>`;
  }).join("");
}

async function deleteTherapyNote(id) {
  if (!confirm("Excluir esta nota de sessão?")) return;
  showLoad();
  try {
    const { error } = await db.from("therapy_notes").delete().eq("id", id);
    if (error) throw error;
    toast("Nota excluída.", "i");
    loadTherapyNotes();
  } catch(e) { toast("Erro ao excluir.", "e"); } finally { hideLoad(); }
}

// ── BLOCO DE NOTAS ────────────────────────────────────────────
let _notepadTimer = null;

async function loadNotepad() {
  try {
    const { data } = await db.from("user_notes")
      .select("content").eq("user_id", currentUser.id).single();
    const ta = document.getElementById("notepad-content");
    if (ta) ta.value = data?.content || "";
  } catch(e) { /* tabela pode não existir ainda */ }
}

function onNotepadChange() {
  const status = document.getElementById("notepad-status");
  if (status) status.textContent = "digitando...";
  clearTimeout(_notepadTimer);
  _notepadTimer = setTimeout(saveNotepad, 1800);
}

async function saveNotepad() {
  const content = document.getElementById("notepad-content")?.value || "";
  const status  = document.getElementById("notepad-status");
  try {
    await db.from("user_notes").upsert(
      { user_id: currentUser.id, content, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (status) { status.textContent = "✅ Salvo"; setTimeout(() => { if(status) status.textContent = ""; }, 2000); }
  } catch(e) { if (status) status.textContent = "⚠️ Erro ao salvar"; }
}

function renderTreatments(list) {
  const el = document.getElementById("treatments-list");
  if (!list.length) {
    el.innerHTML = `<div class="card"><div class="card-body"><div class="empty-state" style="padding:8px 0">
      <div class="ei">💉</div>
      <p>Você ainda não cadastrou nenhum tratamento.<br>Adicione os tratamentos que você está realizando!</p>
    </div></div></div>`;
    return;
  }
  el.innerHTML = list.map(t => `
    <div class="list-card">
      <div style="font-size:24px">💉</div>
      <div class="lc-body">
        <div class="lc-name">${esc(t.name)}</div>
        <div class="lc-sub">${t.frequency ? "🔁 " + esc(t.frequency) : ""}</div>
        ${t.description ? `<div class="lc-sub">${esc(t.description).substring(0,60)}</div>` : ""}
        <span class="lc-badge ${t.active ? "badge-active" : "badge-inactive"}">${t.active ? "Ativo" : "Inativo"}</span>
      </div>
      <div class="lc-actions">
        <button class="ia-btn edit" onclick='openTreatmentModal(${JSON.stringify(t)})'>✏️</button>
        <button class="ia-btn del"  onclick="deleteTreatment('${t.id}')">🗑️</button>
      </div>
    </div>`).join("");
}

async function deleteTreatment(id) {
  if (!confirm("Excluir este tratamento?")) return;
  showLoad();
  try {
    const { error } = await db.from("treatments").delete().eq("id", id);
    if (error) throw error;
    toast("Tratamento excluído.", "i");
    loadTreatments();
  } catch(e) { toast("Erro ao excluir.", "e"); } finally { hideLoad(); }
}

// ── PROFISSIONAIS ────────────────────────────────────────────
function openProfModal(p = null) {
  document.getElementById("mp-title").textContent  = p ? "✏️ Editar Profissional" : "👨‍⚕️ Novo Profissional";
  document.getElementById("prof-id").value         = p?.id || "";
  document.getElementById("prof-name").value       = p?.name || "";
  document.getElementById("prof-specialty").value  = p?.specialty || "";
  document.getElementById("prof-registry").value   = p?.registry || "";
  document.getElementById("prof-phone").value      = p?.phone || "";
  document.getElementById("prof-email").value      = p?.email || "";
  document.getElementById("prof-notes").value      = p?.notes || "";
  openModal("modal-prof");
}

async function saveProf() {
  const id   = document.getElementById("prof-id").value;
  const name = document.getElementById("prof-name").value.trim();
  if (!name) { toast("Digite o nome.", "e"); return; }

  const payload = {
    user_id:   currentUser.id, name,
    specialty: document.getElementById("prof-specialty").value.trim() || null,
    registry:  document.getElementById("prof-registry").value.trim() || null,
    phone:     document.getElementById("prof-phone").value.trim() || null,
    email:     document.getElementById("prof-email").value.trim() || null,
    notes:     document.getElementById("prof-notes").value.trim() || null,
    updated_at: new Date().toISOString()
  };
  showLoad();
  try {
    if (id) {
      const { error } = await db.from("professionals").update(payload).eq("id", id);
      if (error) throw error;
      toast("Profissional atualizado! ✅", "s");
    } else {
      const { error } = await db.from("professionals").insert(payload);
      if (error) throw error;
      toast("Profissional cadastrado!", "s");
    }
    closeModal("modal-prof");
    loadProfessionals();
  } catch(e) { toast("Erro ao salvar.", "e"); } finally { hideLoad(); }
}

async function loadProfessionals() {
  showLoad();
  try {
    let q = db.from("professionals").select("*").order("name",{ascending:true});
    if (!isAdmin) q = q.eq("user_id", currentUser.id);
    const { data, error } = await q;
    if (error) throw error;
    renderProfessionals(data || []);
  } catch(e) { console.error(e); } finally { hideLoad(); }
}

function renderProfessionals(list) {
  const el = document.getElementById("professionals-list");
  if (!list.length) {
    el.innerHTML = `<div class="card"><div class="card-body"><div class="empty-state" style="padding:8px 0">
      <div class="ei">👩‍⚕️</div><p>Nenhum profissional cadastrado.<br>Adicione médicos e terapeutas.</p>
    </div></div></div>`;
    return;
  }
  el.innerHTML = list.map(p => `
    <div class="list-card">
      <div style="font-size:24px">👨‍⚕️</div>
      <div class="lc-body">
        <div class="lc-name">${esc(p.name)}</div>
        <div class="lc-sub">${p.specialty ? esc(p.specialty) : "—"}</div>
        ${p.registry ? `<div class="lc-sub"><strong>CRM:</strong> ${esc(p.registry)}</div>` : ""}
        ${p.phone    ? `<div class="lc-sub">📞 ${esc(p.phone)}</div>` : ""}
        ${p.email    ? `<div class="lc-sub">📧 ${esc(p.email)}</div>` : ""}
      </div>
      <div class="lc-actions">
        <button class="ia-btn edit" onclick='openProfModal(${JSON.stringify(p)})'>✏️</button>
        <button class="ia-btn del"  onclick="deleteProf('${p.id}')">🗑️</button>
      </div>
    </div>`).join("");
}

async function deleteProf(id) {
  if (!confirm("Excluir este profissional?")) return;
  showLoad();
  try {
    const { error } = await db.from("professionals").delete().eq("id", id);
    if (error) throw error;
    toast("Profissional excluído.", "i");
    loadProfessionals();
  } catch(e) { toast("Erro ao excluir.", "e"); } finally { hideLoad(); }
}

// ── SONS DE ALERTA ────────────────────────────────────────────
function playMedAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // ♪ Assinatura sonora FibroVida — arpejo Fá maior ascendente + sino final
    // Fá4 → Lá4 → Dó5 → Fá5 → Dó5 → Lá4 → (gong Fá5 longo)
    const melodia = [
      { freq: 349.23, t: 0.00, amp: 0.18, dur: 0.22, type: "sine"     }, // Fá4
      { freq: 440.00, t: 0.18, amp: 0.22, dur: 0.22, type: "sine"     }, // Lá4
      { freq: 523.25, t: 0.36, amp: 0.26, dur: 0.22, type: "sine"     }, // Dó5
      { freq: 698.46, t: 0.56, amp: 0.32, dur: 0.30, type: "sine"     }, // Fá5 ↑ pico
      { freq: 523.25, t: 0.82, amp: 0.22, dur: 0.20, type: "sine"     }, // Dó5 ↓
      { freq: 440.00, t: 1.00, amp: 0.18, dur: 0.20, type: "sine"     }, // Lá4 ↓
      { freq: 698.46, t: 1.24, amp: 0.38, dur: 1.20, type: "triangle" }, // Fá5 sino final
    ];

    melodia.forEach(({ freq, t, amp, dur, type }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = freq;
      const s = ctx.currentTime + t;
      gain.gain.setValueAtTime(0, s);
      gain.gain.linearRampToValueAtTime(amp, s + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, s + dur);
      osc.start(s);
      osc.stop(s + dur + 0.05);
    });

    // Vibração exclusiva: dois pulsos curtos + um longo (padrão FibroVida)
    if (navigator.vibrate) navigator.vibrate([150, 80, 150, 80, 600]);

  } catch(e) { console.warn("Áudio não disponível:", e); }
}

function playStockAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const freqs = [220, 185, 220]; // tom grave de atenção
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sawtooth"; osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.28;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(t); osc.stop(t + 0.55);
    });
  } catch(e) { console.warn("Áudio não disponível:", e); }
}

// ── SCHEDULER DE MEDICAMENTOS (setTimeout exato) ──────────────
const _medTimers = {}; // guarda timers por chave para evitar duplicatas

function startMedScheduler() {
  if (Notification.permission === "default") Notification.requestPermission();
  agendarTodosMedicamentos();
}

async function agendarTodosMedicamentos() {
  if (!currentUser) return;
  try {
    const { data, error } = await db.from("medications")
      .select("id,name,dosage,schedule_time,stock")
      .eq("user_id", currentUser.id);
    if (error || !data?.length) return;
    data.forEach(m => {
      if (!m.schedule_time) return;
      // Supabase pode retornar "21:30:00" ou "21:30" — normaliza para HH:MM
      const horarios = m.schedule_time.split(/[,;/]/).map(h => h.trim().substring(0, 5));
      horarios.forEach(hNorm => agendarUmMedicamento(m, hNorm));
    });
  } catch(e) {
    console.error("Erro ao agendar medicamentos:", e);
    setTimeout(agendarTodosMedicamentos, 60_000);
  }
}

function agendarUmMedicamento(m, hNorm) {
  const partes = hNorm.split(":");
  const hh = parseInt(partes[0]);
  const mm = parseInt(partes[1] || "0");
  if (isNaN(hh) || isNaN(mm)) return;

  const chave = `${m.id}-${hNorm}`;
  if (_medTimers[chave]) return; // já agendado

  const agora = new Date();
  const alvo  = new Date();
  alvo.setHours(hh, mm, 0, 0);

  // Se o horário já passou hoje, agenda para amanhã
  if (alvo <= agora) alvo.setDate(alvo.getDate() + 1);

  const delay = alvo - agora;

  _medTimers[chave] = setTimeout(() => {
    delete _medTimers[chave];
    dispararAlerta(m, hNorm);
    // Reagenda para amanhã
    setTimeout(() => agendarUmMedicamento(m, hNorm), 60_000);
  }, delay);
}

function dispararAlerta(m, hNorm) {
  playMedAlert();
  showMedAlert(m, `${m.id}-${hNorm}-${Date.now()}`);
  if (Notification.permission === "granted") {
    new Notification("💊 FibroVida — Medicamento", {
      body: `Hora de tomar: ${m.name}${m.dosage ? " — " + m.dosage : ""}`,
      icon: "/icons/icon-192.png"
    });
  }
}

function testarAlertaMedicamento() {
  if (!currentUser) { toast("Faça login primeiro.", "e"); return; }
  db.from("medications").select("id,name,dosage,stock")
    .eq("user_id", currentUser.id).limit(1)
    .then(({ data }) => {
      if (!data?.length) { toast("Nenhum medicamento cadastrado.", "w"); return; }
      const m = data[0];
      playMedAlert();
      showMedAlert(m, `teste-${m.id}-${Date.now()}`);
      toast("✅ Alerta de teste disparado!", "s");
    });
}

function showMedAlert(m, chave) {
  // Cria alerta fixo com botão "Tomei ✓"
  const id = "med-alert-" + chave.replace(/[^a-z0-9]/gi, "_");
  const div = document.createElement("div");
  div.id = id;
  div.className = "med-alert-toast";
  div.innerHTML = `
    <div class="med-alert-ico">💊</div>
    <div class="med-alert-txt">
      <strong>Hora do medicamento!</strong><br>
      ${m.name}${m.dosage ? " — " + m.dosage : ""}
    </div>
    <button class="med-alert-btn" onclick="marcarMedTomado('${m.id}','${id}')">Tomei ✓</button>
  `;
  document.body.appendChild(div);
  // Remove automaticamente após 5 minutos
  setTimeout(() => div.remove(), 300_000);
}

async function marcarMedTomado(medId, alertId) {
  document.getElementById(alertId)?.remove();
  try {
    // Deduz 1 unidade do estoque
    const { data } = await db.from("medications").select("stock,name").eq("id", medId).single();
    if (data && (data.stock || 0) > 0) {
      const novoEstoque = data.stock - 1;
      await db.from("medications").update({ stock: novoEstoque, updated_at: new Date().toISOString() }).eq("id", medId);
      toast(`✅ ${data.name} marcado como tomado. Estoque: ${novoEstoque} un.`, "s");
      checkLowStock();
    } else {
      toast(`✅ Medicamento marcado como tomado.`, "s");
    }
  } catch(e) { toast("✅ Medicamento marcado como tomado.", "s"); }
}

// ── MEDICAMENTOS ─────────────────────────────────────────────
function onMedFileSelected(input) {
  const nameEl = document.getElementById("med-file-name");
  const areaEl = document.getElementById("med-file-area");
  if (input.files[0]) {
    nameEl.textContent = "📎 " + input.files[0].name;
    nameEl.style.display = "flex";
    areaEl.style.display = "none";
  } else {
    nameEl.style.display = "none";
    areaEl.style.display = "block";
  }
}

function removeMedReceita() {
  document.getElementById("med-receita-url").value = "";
  document.getElementById("med-receita-atual").style.display = "none";
  document.getElementById("med-file-area").style.display = "block";
}

let _medFilter = "fibro"; // "fibro" | "extra" | "all"

function setMedFilter(f) {
  _medFilter = f;
  ["fibro","extra","all"].forEach(id => {
    document.getElementById("mft-" + id)?.classList.toggle("active", id === f);
  });
  loadMedications();
}

/* ── Accordion: Entenda a Fibromialgia ── */
function toggleEdu(card) {
  card.classList.toggle('open');
}

function toggleMedType(cb) {
  const lbl = document.getElementById("med-type-label");
  const profFg = document.getElementById("fg-med-professional");
  if (cb.checked) {
    lbl.textContent = "🏠 Outro medicamento (uso geral)";
    if (profFg) profFg.style.display = "none";
  } else {
    lbl.textContent = "💊 Medicamento para fibromialgia";
    if (profFg) profFg.style.display = "";
  }
}

async function openMedModal(m = null) {
  document.getElementById("mm-title").textContent = m ? "✏️ Editar Medicamento" : "💊 Novo Medicamento";
  document.getElementById("med-id").value          = m?.id || "";
  document.getElementById("med-name").value        = m?.name || "";
  document.getElementById("med-dosage").value      = m?.dosage || "";
  document.getElementById("med-time").value        = m?.schedule_time || "";
  document.getElementById("med-freq").value        = m?.frequency || "";
  document.getElementById("med-stock").value       = m?.stock ?? 0;
  document.getElementById("med-alert").value       = m?.low_stock_alert ?? 5;
  document.getElementById("med-notes").value       = m?.notes || "";
  document.getElementById("med-unit-price").value  = m?.unit_price || "";
  document.getElementById("med-qty-pkg").value     = m?.qty_per_package || "";
  document.getElementById("med-daily-units").value = m?.daily_units || 0;
  document.getElementById("med-receita-url").value = m?.receita_url || "";
  document.getElementById("med-file-input").value  = "";
  document.getElementById("med-file-name").style.display = "none";
  const isExtraCb = document.getElementById("med-is-extra");
  isExtraCb.checked = m?.is_extra || false;
  toggleMedType(isExtraCb);

  // Carrega profissionais no dropdown
  const profSel = document.getElementById("med-professional");
  if (profSel) {
    profSel.innerHTML = '<option value="">— Sem prescrição vinculada —</option>';
    try {
      const { data: profs } = await db.from("professionals")
        .select("id,name,specialty").eq("user_id", currentUser.id).order("name");
      (profs || []).forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name + (p.specialty ? ` (${p.specialty})` : "");
        if (m?.professional_id === p.id) opt.selected = true;
        profSel.appendChild(opt);
      });
    } catch(e) { /* ignora */ }
  }

  const atualDiv  = document.getElementById("med-receita-atual");
  const atualLink = document.getElementById("med-receita-link");
  const fileArea  = document.getElementById("med-file-area");
  if (m?.receita_url) {
    atualLink.href = m.receita_url;
    atualLink.textContent = "📎 Ver receita atual" + (m.receita_name ? ": " + m.receita_name : "");
    atualDiv.style.display = "block";
    fileArea.style.display = "none";
  } else {
    atualDiv.style.display = "none";
    fileArea.style.display = "block";
  }
  openModal("modal-med");
}

async function saveMed() {
  const id   = document.getElementById("med-id").value;
  const name = document.getElementById("med-name").value.trim();
  if (!name) { toast("Digite o nome do medicamento.", "e"); return; }

  showLoad();
  try {
    // Upload da receita (se houver arquivo novo)
    let receitaUrl  = document.getElementById("med-receita-url").value || null;
    let receitaName = null;
    const arquivo   = document.getElementById("med-file-input").files[0];
    if (arquivo) {
      if (arquivo.size > 10 * 1024 * 1024) { toast("Arquivo muito grande. Máximo 10 MB.", "e"); return; }
      const ext  = arquivo.name.split(".").pop().toLowerCase();
      const path = `${currentUser.id}/receitas/${Date.now()}.${ext}`;
      const { error: upErr } = await db.storage.from("health-docs").upload(path, arquivo);
      if (upErr) throw upErr;
      const { data: urlData } = db.storage.from("health-docs").getPublicUrl(path);
      receitaUrl  = urlData.publicUrl;
      receitaName = arquivo.name;
    }

    const payload = {
      user_id:         currentUser.id, name,
      dosage:          document.getElementById("med-dosage").value.trim() || null,
      schedule_time:   document.getElementById("med-time").value.trim() || null,
      frequency:       document.getElementById("med-freq").value.trim() || null,
      stock:           parseInt(document.getElementById("med-stock").value) || 0,
      low_stock_alert: parseInt(document.getElementById("med-alert").value) || 5,
      notes:           document.getElementById("med-notes").value.trim() || null,
      professional_id: document.getElementById("med-professional")?.value || null,
      unit_price:      parseFloat(document.getElementById("med-unit-price").value) || 0,
      qty_per_package: parseInt(document.getElementById("med-qty-pkg").value) || 0,
      daily_units:     parseInt(document.getElementById("med-daily-units").value) || 0,
      is_extra:        document.getElementById("med-is-extra")?.checked || false,
      receita_url:     receitaUrl,
      receita_name:    receitaName,
      updated_at:      new Date().toISOString()
    };

    if (id) {
      const { error } = await db.from("medications").update(payload).eq("id", id);
      if (error) throw error;
      toast("Medicamento atualizado! ✅", "s");
    } else {
      const { error } = await db.from("medications").insert(payload);
      if (error) throw error;
      toast("Medicamento cadastrado! 💊", "s");
    }
    closeModal("modal-med");
    loadMedications();
    checkLowStock();
  } catch(e) { toast("Erro ao salvar: " + (e.message || ""), "e"); console.error(e); } finally { hideLoad(); }
}

async function loadMedications() {
  showLoad();
  try {
    let q = db.from("medications")
      .select("*, professionals(name,specialty)")
      .order("name", {ascending: true});
    if (!isAdmin) q = q.eq("user_id", currentUser.id);
    if (_medFilter === "fibro") q = q.eq("is_extra", false);
    else if (_medFilter === "extra") q = q.eq("is_extra", true);
    const { data, error } = await q;
    if (error) throw error;
    await performDailyStockDeduction(data || []);
    renderMedications(data || []);
  } catch(e) { console.error(e); } finally { hideLoad(); }
}

async function performDailyStockDeduction(meds) {
  const today = todayISO();
  const toDeduct = meds.filter(m =>
    m.active !== false && m.daily_units > 0 && m.last_deduction_date !== today
  );
  if (!toDeduct.length) return;
  for (const m of toDeduct) {
    const newStock = Math.max(0, (m.stock || 0) - m.daily_units);
    await db.from("medications")
      .update({ stock: newStock, last_deduction_date: today, updated_at: new Date().toISOString() })
      .eq("id", m.id);
    m.stock = newStock;
    m.last_deduction_date = today;
  }
  toast(`📦 Estoque deduzido: ${toDeduct.length} medicamento(s) atualizados`, "i");
  checkLowStock();
}

function renderMedications(list) {
  const el = document.getElementById("medications-list");
  if (!list.length) {
    const msg = _medFilter === "extra" ? "Nenhum medicamento de uso geral cadastrado." : "Nenhum medicamento cadastrado.";
    el.innerHTML = `<div class="card"><div class="card-body"><div class="empty-state" style="padding:8px 0">
      <div class="ei">${_medFilter === "extra" ? "🏠" : "💊"}</div><p>${msg}</p>
    </div></div></div>`;
    return;
  }
  el.innerHTML = list.map(m => {
    const low   = m.stock <= m.low_stock_alert;
    const empty = m.stock <= 0;
    const badgeClass = empty ? "badge-out" : low ? "badge-low" : "badge-ok";
    const badgeTxt   = empty ? "⚠️ Sem estoque" : low ? `⚠️ ${m.stock} un.` : `✅ ${m.stock} un.`;
    const totalVal   = (m.unit_price || 0) * (m.stock || 0);
    const profName   = m.professionals?.name;
    const safeM      = JSON.stringify({...m, professionals: undefined}).replace(/'/g,"&#39;");
    return `
      <div class="list-card ${m.is_extra ? "med-extra-card" : ""}">
        <div style="font-size:24px">${m.is_extra ? "🏠" : "💊"}</div>
        <div class="lc-body">
          <div class="lc-name">${esc(m.name)}</div>
          <div class="lc-sub">
            ${m.dosage        ? esc(m.dosage) : ""}
            ${m.schedule_time ? " · ⏰ " + esc(m.schedule_time) : ""}
            ${m.frequency     ? " · " + esc(m.frequency) : ""}
          </div>
          ${profName ? `<div class="lc-sub">👨‍⚕️ <em>${esc(profName)}</em></div>` : ""}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
            <span class="lc-badge ${badgeClass}">${badgeTxt}</span>
            ${m.unit_price ? `<span class="lc-badge badge-info">R$ ${fmtMoeda(m.unit_price)}/un</span>` : ""}
            ${totalVal > 0 ? `<span class="lc-badge badge-info">R$ ${fmtMoeda(totalVal)}</span>` : ""}
            ${m.daily_units > 0 ? `<span class="lc-badge badge-info">📅 ${m.daily_units}/dia</span>` : ""}
            ${m.qty_per_package > 0 ? `<span class="lc-badge badge-neutral">${m.qty_per_package} un/cx</span>` : ""}
          </div>
          ${m.receita_url ? `<a href="${m.receita_url}" target="_blank" class="med-receita-link">📄 Ver receita</a>` : ""}
        </div>
        <div class="lc-actions">
          <button class="ia-btn edit" onclick='openMedModal(${safeM})'>✏️</button>
          <button class="ia-btn del"  onclick="deleteMed('${m.id}')">🗑️</button>
        </div>
      </div>`;
  }).join("");
}

let _stockAlertadoHoje = false;

async function checkLowStock() {
  if (!currentUser) return;
  try {
    const { data } = await db.from("medications")
      .select("name,stock,low_stock_alert").eq("user_id", currentUser.id);
    const low   = (data || []).filter(m => m.stock > 0 && m.stock <= m.low_stock_alert);
    const empty = (data || []).filter(m => m.stock <= 0);
    const todos = [...empty, ...low];
    const bar   = document.getElementById("stock-alert");

    if (todos.length) {
      bar.style.display = "block";
      document.getElementById("stock-alert-names").textContent =
        todos.map(m => `${m.name} (${m.stock <= 0 ? "sem estoque" : m.stock + " un."})`).join(", ");

      // Toca alerta sonoro uma vez por sessão
      if (!_stockAlertadoHoje) {
        _stockAlertadoHoje = true;
        setTimeout(() => {
          playStockAlert();
          toast(`⚠️ Estoque baixo: ${todos.map(m => m.name).join(", ")}. Hora de repor!`, "w");
        }, 2000);
      }
    } else {
      bar.style.display = "none";
    }
  } catch(e) { console.error(e); }
}

async function gerarRelatorioMedicamentos() {
  if (!window.jspdf) { toast("Biblioteca PDF não carregada. Aguarde e tente novamente.", "e"); return; }
  showLoad();
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const now = new Date();

    // ── Cabeçalho ──
    doc.setFillColor(122, 155, 87);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont(undefined, "bold");
    doc.text("FibroVida — Relatório de Medicamentos", 14, 13);
    doc.setFontSize(9); doc.setFont(undefined, "normal");
    doc.text(`${currentProfile?.name || ""}  ·  Gerado em: ${now.toLocaleString("pt-BR")}`, 14, 22);

    // ── Busca todos os medicamentos ──
    const { data: meds } = await db.from("medications")
      .select("*, professionals(name)")
      .eq("user_id", currentUser.id)
      .order("is_extra").order("name");

    const fibro = (meds || []).filter(m => !m.is_extra);
    const extra = (meds || []).filter(m => m.is_extra);

    const drawTable = (list, titulo, startY) => {
      let y = startY;
      // Título da seção
      doc.setFontSize(11); doc.setFont(undefined, "bold");
      doc.setTextColor(122, 155, 87);
      doc.text(titulo, 14, y); y += 7;

      // Header da tabela
      const cols = [14, 54, 86, 112, 130, 150, 175];
      const hdrs = ["Medicamento","Dosagem/Freq.","Estoque","Vlr/un","Total R$","Un/cx","Prescrito por"];
      doc.setFillColor(237, 245, 228);
      doc.rect(12, y - 4, 186, 7, "F");
      doc.setFontSize(7.5); doc.setFont(undefined, "bold");
      doc.setTextColor(60, 80, 30);
      hdrs.forEach((h, i) => doc.text(h, cols[i], y));
      y += 6;

      let totalGeral = 0;
      list.forEach((m, idx) => {
        if (y > 272) { doc.addPage(); y = 20; }
        if (idx % 2 === 0) {
          doc.setFillColor(252, 254, 249);
          doc.rect(12, y - 4, 186, 7, "F");
        }
        const totalVal = (m.unit_price || 0) * (m.stock || 0);
        totalGeral += totalVal;
        const low = m.stock <= (m.low_stock_alert || 5);
        doc.setFont(undefined, "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(low ? 180 : 40, low ? 40 : 40, 40);
        doc.text((m.name || "").substring(0, 20), cols[0], y);
        doc.setTextColor(40, 40, 40);
        const freqStr = ((m.dosage || "") + " " + (m.frequency || "")).trim().substring(0, 18);
        doc.text(freqStr, cols[1], y);
        doc.setTextColor(low ? 180 : 40, 40, 40);
        doc.text(`${m.stock || 0} un.`, cols[2], y);
        doc.setTextColor(40, 40, 40);
        doc.text(m.unit_price ? `R$ ${fmtMoeda(m.unit_price)}` : "—", cols[3], y);
        doc.text(totalVal > 0 ? `R$ ${fmtMoeda(totalVal)}` : "—", cols[4], y);
        doc.text(m.qty_per_package ? `${m.qty_per_package}` : "—", cols[5], y);
        doc.text((m.professionals?.name || "—").substring(0, 18), cols[6], y);
        y += 7;
      });

      // Total da seção
      y += 2;
      doc.setDrawColor(200, 220, 180);
      doc.line(12, y, 198, y); y += 5;
      doc.setFontSize(9); doc.setFont(undefined, "bold");
      doc.setTextColor(90, 120, 50);
      doc.text(`Total em estoque: R$ ${fmtMoeda(totalGeral)}  ·  ${list.length} medicamento(s)`, 14, y);
      return y + 10;
    };

    let y = 38;
    if (fibro.length) y = drawTable(fibro, "💊 Medicamentos para Fibromialgia", y);
    if (extra.length) drawTable(extra, "🏠 Outros Medicamentos (uso geral)", y);

    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setFont(undefined, "normal");
      doc.setTextColor(160, 160, 160);
      doc.text(`FibroVida · Página ${i}/${pageCount}`, 14, 292);
    }

    doc.save(`fibrovida-medicamentos-${todayISO()}.pdf`);
    toast("📄 Relatório gerado com sucesso!", "s");
  } catch(e) { toast("Erro ao gerar relatório: " + (e.message || ""), "e"); console.error(e); } finally { hideLoad(); }
}

async function deleteMed(id) {
  if (!confirm("Excluir este medicamento?")) return;
  showLoad();
  try {
    const { error } = await db.from("medications").delete().eq("id", id);
    if (error) throw error;
    toast("Medicamento excluído.", "i");
    loadMedications();
  } catch(e) { toast("Erro ao excluir.", "e"); } finally { hideLoad(); }
}

// ── GRATIDÃO ─────────────────────────────────────────────────
async function saveGratitude() {
  const g1 = document.getElementById("gratitude-1").value.trim();
  const g2 = document.getElementById("gratitude-2").value.trim();
  const g3 = document.getElementById("gratitude-3").value.trim();
  if (!g1 && !g2 && !g3) { toast("Escreva ao menos uma gratidão. 🙏", "w"); return; }

  showLoad();
  try {
    const { error } = await db.from("gratitude_entries").insert({
      user_id:    currentUser.id,
      entry_date: todayISO(),
      gratitude_1: g1 || null,
      gratitude_2: g2 || null,
      gratitude_3: g3 || null,
    });
    if (error) throw error;
    document.getElementById("gratitude-1").value = "";
    document.getElementById("gratitude-2").value = "";
    document.getElementById("gratitude-3").value = "";
    toast("Gratidão salva! 🙏", "s");
    loadGratitude();
  } catch(e) { toast("Erro ao salvar.", "e"); } finally { hideLoad(); }
}

async function loadGratitude() {
  try {
    let q = db.from("gratitude_entries").select("*")
      .order("entry_date",{ascending:false}).limit(20);
    if (!isAdmin) q = q.eq("user_id", currentUser.id);
    const { data } = await q;
    renderGratitude(data || []);
  } catch(e) { console.error(e); }
}

function renderGratitude(list) {
  const el = document.getElementById("gratitude-list");
  if (!list.length) {
    el.innerHTML = `<div class="empty-state" style="padding:8px 0"><p>Seus diários aparecerão aqui</p></div>`;
    return;
  }
  el.innerHTML = list.map(g => {
    const gData = JSON.stringify(g).replace(/"/g,"&quot;");
    return `
    <div class="grat-hist-item">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div class="grat-hist-date">${fmtDate(g.entry_date)}</div>
        <div style="display:flex;gap:4px">
          <button class="ia-btn edit" onclick="openGratitudeModal(${gData})" title="Editar">&#x270F;&#xFE0F;</button>
          <button class="ia-btn del"  onclick="deleteGratitude('${g.id}')" title="Excluir">&#x1F5D1;&#xFE0F;</button>
        </div>
      </div>
      ${g.gratitude_1 ? `<div class="grat-hist-line">&#x1F31F; ${esc(g.gratitude_1)}</div>` : ""}
      ${g.gratitude_2 ? `<div class="grat-hist-line">&#x1F49B; ${esc(g.gratitude_2)}</div>` : ""}
      ${g.gratitude_3 ? `<div class="grat-hist-line">&#x1F33A; ${esc(g.gratitude_3)}</div>` : ""}
    </div>`;
  }).join("");
}

function openGratitudeModal(g) {
  document.getElementById("ge-id").value         = g.id;
  document.getElementById("ge-1").value          = g.gratitude_1 || "";
  document.getElementById("ge-2").value          = g.gratitude_2 || "";
  document.getElementById("ge-3").value          = g.gratitude_3 || "";
  document.getElementById("ge-date").textContent = fmtDate(g.entry_date);
  openModal("modal-gratitude-edit");
}

async function saveGratitudeEdit() {
  const id = document.getElementById("ge-id").value;
  const g1 = document.getElementById("ge-1").value.trim();
  const g2 = document.getElementById("ge-2").value.trim();
  const g3 = document.getElementById("ge-3").value.trim();
  if (!g1 && !g2 && !g3) { toast("Escreva ao menos uma gratidão.", "w"); return; }
  showLoad();
  try {
    const { error } = await db.from("gratitude_entries").update({
      gratitude_1: g1 || null, gratitude_2: g2 || null, gratitude_3: g3 || null,
      updated_at: new Date().toISOString()
    }).eq("id", id);
    if (error) throw error;
    toast("Gratidão atualizada! 🙏", "s");
    closeModal("modal-gratitude-edit");
    loadGratitude();
  } catch(e) { toast("Erro ao salvar.", "e"); } finally { hideLoad(); }
}

async function deleteGratitude(id) {
  if (!confirm("Excluir este registro de gratidão?")) return;
  showLoad();
  try {
    const { error } = await db.from("gratitude_entries").delete().eq("id", id);
    if (error) throw error;
    toast("Registro excluído.", "i");
    loadGratitude();
  } catch(e) { toast("Erro ao excluir.", "e"); } finally { hideLoad(); }
}

// ── RECEITAS ─────────────────────────────────────────────────
function openRecipeModal(r = null) {
  document.getElementById("mr-title").textContent       = r ? "✏️ Editar Receita" : "🥗 Nova Receita";
  document.getElementById("recipe-id").value            = r?.id || "";
  document.getElementById("recipe-name").value          = r?.name || "";
  document.getElementById("recipe-category").value      = r?.category || "cafe";
  document.getElementById("recipe-image").value         = r?.image_url || "";
  document.getElementById("recipe-time").value          = r?.prep_time || "";
  document.getElementById("recipe-servings").value      = r?.servings || "";
  document.getElementById("recipe-calories").value      = r?.calories || "";
  document.getElementById("recipe-tags").value          = r?.tags ? r.tags.join(", ") : "";
  document.getElementById("recipe-ingredients").value   = r?.ingredients || "";
  document.getElementById("recipe-instructions").value  = r?.instructions || "";
  const descEl = document.getElementById("recipe-desc");
  if (descEl) descEl.value = r?.description || "";
  openModal("modal-recipe");
}

async function saveRecipe() {
  const id   = document.getElementById("recipe-id").value;
  const name = document.getElementById("recipe-name").value.trim();
  if (!name) { toast("Digite o nome da receita.", "e"); return; }

  const tagsRaw = document.getElementById("recipe-tags").value;
  const tags    = tagsRaw ? tagsRaw.split(",").map(t=>t.trim()).filter(Boolean) : [];

  const descEl = document.getElementById("recipe-desc");
  const payload = {
    user_id:      currentUser.id, name,
    category:     document.getElementById("recipe-category").value,
    image_url:    document.getElementById("recipe-image").value.trim() || null,
    prep_time:    parseInt(document.getElementById("recipe-time").value) || null,
    servings:     parseInt(document.getElementById("recipe-servings").value) || null,
    calories:     parseInt(document.getElementById("recipe-calories").value) || null,
    tags:         tags.length ? tags : null,
    description:  descEl ? (descEl.value.trim() || null) : null,
    ingredients:  document.getElementById("recipe-ingredients").value.trim() || null,
    instructions: document.getElementById("recipe-instructions").value.trim() || null,
    updated_at:   new Date().toISOString()
  };
  showLoad();
  try {
    if (id) {
      const { error } = await db.from("recipes").update(payload).eq("id", id);
      if (error) throw error;
      toast("Receita atualizada! ✅", "s");
    } else {
      const { error } = await db.from("recipes").insert(payload);
      if (error) throw error;
      toast("Receita cadastrada! 🥗", "s");
    }
    closeModal("modal-recipe");
    loadRecipes();
  } catch(e) { toast("Erro ao salvar.", "e"); } finally { hideLoad(); }
}

async function loadRecipes() {
  showLoad();
  try {
    let q = db.from("recipes").select("*").order("created_at",{ascending:false});
    if (!isAdmin) q = q.eq("user_id", currentUser.id);
    const { data, error } = await q;
    if (error) throw error;
    allRecipes = data || [];
    renderRecipes();
  } catch(e) { console.error(e); } finally { hideLoad(); }
}

function filterRecipeCat(cat, btn) {
  currentRecipeCat = cat;
  document.querySelectorAll("#tab-receitas .ftab").forEach(b => b.classList.remove("active"));
  btn?.classList.add("active");
  renderRecipes();
}

function filterRecipes() { renderRecipes(); }

const catEmoji = { cafe:"☕", almoco:"🍽️", jantar:"🌙", lanche:"🥜", sobremesa:"🍓", suco:"🥤" };

function renderRecipes() {
  const search   = document.getElementById("recipe-search").value.toLowerCase();
  const filtered = allRecipes.filter(r => {
    const matchCat  = currentRecipeCat === "all" || r.category === currentRecipeCat;
    const matchSrch = !search || r.name.toLowerCase().includes(search) ||
      (r.tags || []).some(t => t.toLowerCase().includes(search));
    return matchCat && matchSrch;
  });

  const el = document.getElementById("recipes-grid");
  if (!filtered.length) {
    const isSearching = search || currentRecipeCat !== "all";
    el.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="ei">🥗</div>
        <p>${isSearching ? "Nenhuma receita encontrada para este filtro." : "Nenhuma receita cadastrada ainda.<br>Adicione suas receitas saudáveis!"}</p>
        ${!isSearching ? `<button class="btn btn-secondary" style="margin-top:14px;font-size:13px" onclick="loadSampleRecipes()">
          🌿 Carregar receitas de exemplo
        </button>` : ""}
      </div>`;
    return;
  }

  el.innerHTML = filtered.map(r => {
    const isEmoji = r.image_url && r.image_url.length <= 4;
    const thumb   = isEmoji || !r.image_url
      ? `<div class="recipe-thumb-emoji">${r.image_url || catEmoji[r.category] || "🍴"}</div>`
      : `<img class="recipe-thumb" src="${esc(r.image_url)}" alt="${esc(r.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'recipe-thumb-emoji\\'>${catEmoji[r.category]||'🍴'}</div>'" />`;

    const desc = r.description
      ? `<div class="recipe-desc">${esc(r.description)}</div>`
      : (r.ingredients ? `<div class="recipe-desc">${esc(r.ingredients).substring(0,80)}…</div>` : "");

    const stats = [
      r.prep_time ? `⏱️ ${r.prep_time}min` : null,
      r.servings  ? `🍽️ ${r.servings} p.` : null,
      r.calories  ? `🔥 ${r.calories}kcal` : null,
    ].filter(Boolean).map(s => `<span>${s}</span>`).join("");

    const rData = JSON.stringify(r).replace(/"/g,"&quot;");

    return `
      <div class="recipe-card" onclick="viewRecipe('${r.id}')">
        <div class="recipe-thumb-wrap">
          ${thumb}
          <span class="recipe-cat-badge">${catLabel(r.category)}</span>
        </div>
        <button class="recipe-edit-btn"
          onclick="event.stopPropagation();openRecipeModal(${rData})"
          title="Editar receita">✏️</button>
        <div class="recipe-info">
          <div class="recipe-name">${esc(r.name)}</div>
          ${desc}
          ${stats ? `<div class="recipe-stats">${stats}</div>` : ""}
          ${r.tags?.length ? `<div class="recipe-tags">${r.tags.slice(0,3).map(t=>`<span class="rtag">${esc(t)}</span>`).join("")}</div>` : ""}
          <button class="recipe-ver-btn" onclick="event.stopPropagation();viewRecipe('${r.id}')">Ver receita</button>
        </div>
      </div>`;
  }).join("");
}

function viewRecipe(id) {
  const r = allRecipes.find(x => x.id === id);
  if (!r) return;
  document.getElementById("rv-title").textContent = r.name;
  document.getElementById("rv-content").innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">
      <span style="background:var(--green-pale);color:var(--green-dark);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">${catLabel(r.category)}</span>
      ${r.prep_time ? `<span style="background:var(--info-bg);color:var(--info);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">⏱️ ${r.prep_time} min</span>` : ""}
      ${r.servings  ? `<span style="background:var(--bg2);color:var(--text2);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">🍽️ ${r.servings} porções</span>` : ""}
      ${r.calories  ? `<span style="background:var(--warning-bg);color:var(--warning);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">🔥 ${r.calories} kcal</span>` : ""}
    </div>
    ${r.tags?.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:14px">${r.tags.map(t=>`<span class="rtag">${esc(t)}</span>`).join("")}</div>` : ""}
    ${r.ingredients ? `<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px">🥬 Ingredientes</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.7;white-space:pre-wrap;background:var(--bg);padding:12px;border-radius:var(--radius-sm);margin-bottom:14px">${esc(r.ingredients)}</div>` : ""}
    ${r.instructions ? `<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px">👨‍🍳 Modo de preparo</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.7;white-space:pre-wrap;background:var(--bg);padding:12px;border-radius:var(--radius-sm)">${esc(r.instructions)}</div>` : ""}
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-secondary btn-sm" onclick="openRecipeModal(${JSON.stringify(r).replace(/"/g,"&quot;")});closeModal('modal-recipe-view')">✏️ Editar</button>
      <button class="btn btn-danger-soft btn-sm" onclick="deleteRecipe('${r.id}');closeModal('modal-recipe-view')">🗑️ Excluir</button>
    </div>`;
  openModal("modal-recipe-view");
}

async function deleteRecipe(id) {
  if (!confirm("Excluir esta receita?")) return;
  showLoad();
  try {
    const { error } = await db.from("recipes").delete().eq("id", id);
    if (error) throw error;
    toast("Receita excluída.", "i");
    loadRecipes();
  } catch(e) { toast("Erro ao excluir.", "e"); } finally { hideLoad(); }
}

async function loadSampleRecipes() {
  if (!confirm("Carregar 10 receitas anti-inflamatórias de exemplo? Elas serão adicionadas à sua lista.")) return;
  showLoad();

  const samples = [
    {
      name: "Smoothie Verde Anti-inflamatório",
      category: "suco",
      description: "Combinação poderosa de espinafre, gengibre e cúrcuma para reduzir inflamações e dar energia no início do dia.",
      image_url: "https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=600&q=80",
      prep_time: 5, servings: 2, calories: 120,
      tags: ["anti-inflamatório","sem glúten","vegan","fácil"],
      ingredients: "1 xícara de espinafre fresco\n1 banana madura\n1 cm de gengibre fresco\n1/2 colher de chá de cúrcuma\n1 colher de sopa de mel\n200 ml de leite de amêndoas\nGelo a gosto",
      instructions: "Bata todos os ingredientes no liquidificador até obter consistência homogênea. Sirva imediatamente gelado."
    },
    {
      name: "Salmão Assado com Ervas",
      category: "almoco",
      description: "Salmão rico em ômega-3, assado com ervas aromáticas e limão, ideal para combater a inflamação crônica.",
      image_url: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80",
      prep_time: 30, servings: 2, calories: 380,
      tags: ["ômega-3","sem glúten","proteína","anti-inflamatório"],
      ingredients: "2 filés de salmão (200g cada)\n2 colheres de sopa de azeite\nSuco de 1 limão\n2 dentes de alho picados\n1 colher de chá de alecrim seco\n1 colher de chá de tomilho seco\nSal e pimenta a gosto",
      instructions: "Pré-aqueça o forno a 200°C. Misture azeite, limão, alho e ervas. Cubra o salmão com a mistura e leve ao forno por 20 minutos. Sirva com legumes no vapor."
    },
    {
      name: "Tigela de Açaí com Granola",
      category: "cafe",
      description: "Açaí antioxidante com frutas vermelhas e granola artesanal — café da manhã nutritivo e energizante.",
      image_url: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&q=80",
      prep_time: 10, servings: 1, calories: 310,
      tags: ["antioxidante","fibras","energético","vegan"],
      ingredients: "200g de polpa de açaí\n1/2 banana\n100g de morangos\n50g de mirtilo\n3 colheres de sopa de granola sem açúcar\n1 colher de sopa de mel\nFolhas de hortelã para decorar",
      instructions: "Bata o açaí com a banana até cremoso. Coloque em tigela e decore com os demais ingredientes. Sirva imediatamente."
    },
    {
      name: "Sopa de Lentilha com Cúrcuma",
      category: "jantar",
      description: "Sopa reconfortante de lentilha com cúrcuma e gengibre, rica em proteínas vegetais e com ação anti-inflamatória.",
      image_url: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
      prep_time: 40, servings: 4, calories: 220,
      tags: ["vegan","proteína vegetal","anti-inflamatório","reconfortante"],
      ingredients: "1 xícara de lentilha vermelha\n1 cebola picada\n3 dentes de alho\n1 colher de chá de cúrcuma\n1 cm de gengibre\n1 lata de tomate pelado\n1 litro de caldo de legumes\nSal, pimenta e coentro a gosto",
      instructions: "Refogue cebola e alho no azeite. Adicione cúrcuma e gengibre, frite por 1 minuto. Acrescente lentilha, tomate e caldo. Cozinhe 30 minutos. Bata metade da sopa e misture. Sirva com coentro."
    },
    {
      name: "Salada de Quinoa com Abacate",
      category: "almoco",
      description: "Salada colorida e nutritiva com quinoa, abacate cremoso e romã — alta em proteínas e gorduras boas.",
      image_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
      prep_time: 20, servings: 2, calories: 340,
      tags: ["sem glúten","proteína","gorduras boas","colorida"],
      ingredients: "1 xícara de quinoa cozida\n1 abacate maduro\n1/2 xícara de grãos de romã\nFolhas de rúcula\nSuco de 1 limão\n2 colheres de sopa de azeite\nSal, pimenta e hortelã",
      instructions: "Cozinhe a quinoa e deixe esfriar. Misture com rúcula, abacate em cubos e romã. Tempere com limão, azeite, sal e pimenta. Sirva fresca."
    },
    {
      name: "Chá de Gengibre e Cúrcuma",
      category: "suco",
      description: "Chá quente anti-inflamatório com gengibre, cúrcuma, mel e pimenta-do-reino — alívio natural para as dores.",
      image_url: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&q=80",
      prep_time: 10, servings: 2, calories: 35,
      tags: ["anti-inflamatório","calmante","quente","fácil"],
      ingredients: "500ml de água\n2 cm de gengibre fresco fatiado\n1 colher de chá de cúrcuma em pó\n1/4 colher de chá de pimenta-do-reino\n1 colher de sopa de mel\nSuco de 1/2 limão",
      instructions: "Ferva a água com gengibre por 5 minutos. Retire do fogo, adicione cúrcuma, pimenta e mel. Coe e adicione o limão. Sirva quente."
    },
    {
      name: "Frango Grelhado com Legumes",
      category: "almoco",
      description: "Peito de frango magro grelhado com legumes coloridos temperados com ervas mediterrâneas.",
      image_url: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80",
      prep_time: 25, servings: 2, calories: 290,
      tags: ["proteína","baixo carboidrato","sem glúten","mediterrâneo"],
      ingredients: "2 peitos de frango\n1 abobrinha\n1 pimentão vermelho\n1 pimentão amarelo\n1 cebola roxa\n3 colheres de sopa de azeite\nOrégano, alecrim, alho, sal e pimenta",
      instructions: "Marine o frango em azeite, alho e ervas por 15 minutos. Grelhe 6-8 minutos de cada lado. Refogue os legumes com azeite e temperos. Sirva juntos."
    },
    {
      name: "Pudim de Chia com Frutas",
      category: "sobremesa",
      description: "Sobremesa saudável de semente de chia com leite de coco e frutas vermelhas — rica em ômega-3 e fibras.",
      image_url: "https://images.unsplash.com/photo-1546039907-7fa05f864c02?w=600&q=80",
      prep_time: 5, servings: 2, calories: 190,
      tags: ["ômega-3","sem glúten","vegan","fibras"],
      ingredients: "4 colheres de sopa de semente de chia\n400ml de leite de coco\n1 colher de sopa de mel\n1/2 colher de chá de extrato de baunilha\nMorangos e mirtilo para servir",
      instructions: "Misture chia, leite de coco, mel e baunilha. Refrigere por pelo menos 4 horas (ou de um dia para o outro). Sirva com as frutas por cima."
    },
    {
      name: "Aveia com Mirtilo e Canela",
      category: "cafe",
      description: "Porridge de aveia integral com mirtilos antioxidantes e canela anti-inflamatória — café da manhã completo.",
      image_url: "https://images.unsplash.com/photo-1571748982800-fa51082c2224?w=600&q=80",
      prep_time: 10, servings: 1, calories: 280,
      tags: ["fibras","antioxidante","energético","simples"],
      ingredients: "1/2 xícara de aveia em flocos\n1 xícara de leite de amêndoas\n100g de mirtilo\n1/2 colher de chá de canela em pó\n1 colher de sopa de mel\n1 colher de sopa de sementes de linhaça",
      instructions: "Cozinhe a aveia no leite de amêndoas em fogo baixo mexendo sempre. Desligue, junte a canela e o mel. Cubra com mirtilo e linhaça. Sirva quente."
    },
    {
      name: "Wrap de Alface com Atum",
      category: "lanche",
      description: "Lanche leve e prático com folhas de alface crocante, atum rico em ômega-3, e vegetais frescos.",
      image_url: "https://images.unsplash.com/photo-1607532941433-304659e8198a?w=600&q=80",
      prep_time: 10, servings: 1, calories: 180,
      tags: ["ômega-3","baixas calorias","sem glúten","prático"],
      ingredients: "4 folhas grandes de alface americana\n1 lata de atum em água\n1/4 abacate amassado\n1 tomate picado\n1/4 cebola roxa picada\nSuco de limão, sal e pimenta a gosto\nSalsinha picada",
      instructions: "Misture atum, abacate, tomate, cebola e temperos. Distribua nas folhas de alface. Enrole como wrap e sirva imediatamente."
    }
  ];

  try {
    let ok = 0, primeiroErro = null;

    // Testa com a primeira receita para capturar o erro real
    const teste = samples[0];
    const payload = {
      user_id:      currentUser.id,
      name:         teste.name,
      category:     teste.category,
      description:  teste.description || null,
      image_url:    teste.image_url || null,
      prep_time:    teste.prep_time || null,
      servings:     teste.servings || null,
      calories:     teste.calories || null,
      tags:         teste.tags || null,
      ingredients:  teste.ingredients || null,
      instructions: teste.instructions || null,
    };

    const { error: erroTeste } = await db.from("recipes").insert(payload);
    if (erroTeste) {
      toast(`Erro: ${erroTeste.message}`, "e");
      console.error("Detalhe do erro:", erroTeste);
      return;
    }
    ok++;

    // Insere o restante
    for (const s of samples.slice(1)) {
      const { error } = await db.from("recipes").insert({
        user_id:      currentUser.id,
        name:         s.name,
        category:     s.category,
        description:  s.description || null,
        image_url:    s.image_url || null,
        prep_time:    s.prep_time || null,
        servings:     s.servings || null,
        calories:     s.calories || null,
        tags:         s.tags || null,
        ingredients:  s.ingredients || null,
        instructions: s.instructions || null,
      });
      if (error) { console.warn("Erro:", s.name, error.message); }
      else ok++;
    }

    toast(`${ok} receitas de exemplo carregadas! 🥗`, "s");
    loadRecipes();
  } catch(e) {
    console.error(e);
    toast("Erro: " + (e.message || "verifique o console F12"), "e");
  } finally { hideLoad(); }
}

// ── RELATÓRIOS ────────────────────────────────────────────────
let repPeriodDias = 7;

function setRepPeriod(dias, btn) {
  repPeriodDias = dias;
  document.querySelectorAll(".botao-periodo").forEach(b => b.classList.remove("ativo"));
  if (btn) btn.classList.add("ativo");
  loadReports();
}

async function loadReports() {
  showLoad();
  try {
    const now  = new Date();
    const prev = new Date(now); prev.setDate(prev.getDate() - (repPeriodDias - 1));
    const start = prev.toISOString().split("T")[0];
    const end   = todayISO();
    document.getElementById("report-range").textContent = `${fmtDate(start)} — ${fmtDate(end)}`;

    const { data: hd } = await db.from("health_records").select("*")
      .eq("user_id", currentUser.id)
      .gte("record_date", start).lte("record_date", end)
      .order("record_date", { ascending: true });

    if (hd?.length) {
      const avgPain  = (hd.reduce((s,r)=>s+(r.pain_level||0),0)/hd.length).toFixed(1);
      const avgSleep = (hd.reduce((s,r)=>s+(r.sleep_quality||0),0)/hd.length).toFixed(1);
      document.getElementById("rep-pain").textContent  = avgPain;
      document.getElementById("rep-sleep").textContent = avgSleep;

      // Fadiga e Energia médias
      const hdFat = hd.filter(r=>r.fatigue_level!=null);
      const hdEng = hd.filter(r=>r.energy_level!=null);
      const fatEl = document.getElementById("rep-fatigue");
      const engEl = document.getElementById("rep-energy");
      if (fatEl) fatEl.textContent = hdFat.length ? (hdFat.reduce((s,r)=>s+r.fatigue_level,0)/hdFat.length).toFixed(1) : "—";
      if (engEl) engEl.textContent = hdEng.length ? (hdEng.reduce((s,r)=>s+r.energy_level,0)/hdEng.length).toFixed(1) : "—";

      const moods = hd.filter(r=>r.mood).map(r=>r.mood);
      if (moods.length) {
        const freq = {};
        moods.forEach(m => freq[m] = (freq[m]||0)+1);
        const top = Object.keys(freq).sort((a,b)=>freq[b]-freq[a])[0];
        document.getElementById("rep-mood").textContent     = moodEmoji(top);
        document.getElementById("rep-mood-lbl").textContent = moodLabel(top);
      }

      // Locais de dor mais frequentes
      const contagem = {};
      hd.forEach(r => { (r.body_locations||[]).forEach(l => { contagem[l]=(contagem[l]||0)+1; }); });
      const locaisEl = document.getElementById("rep-locais");
      if (locaisEl) {
        const topLocais = Object.keys(contagem).sort((a,b)=>contagem[b]-contagem[a]).slice(0,6);
        if (topLocais.length) {
          locaisEl.innerHTML = topLocais.map(l =>
            `<span class="local-chip">${l} <span class="chip-count">(${contagem[l]}x)</span></span>`
          ).join("");
        } else {
          locaisEl.innerHTML = `<p class="text-muted" style="font-size:12px">Nenhum local registrado ainda.</p>`;
        }
      }

      // Gatilhos mais frequentes
      const trigCount = {};
      hd.forEach(r => { (r.triggers||[]).forEach(t => { trigCount[t]=(trigCount[t]||0)+1; }); });
      const trigEl = document.getElementById("rep-triggers");
      if (trigEl) {
        const topTrigs = Object.keys(trigCount).sort((a,b)=>trigCount[b]-trigCount[a]).slice(0,8);
        if (topTrigs.length) {
          trigEl.innerHTML = topTrigs.map(t =>
            `<span class="trig-report-chip">${triggerLabels[t]||t}<span class="trig-count">${trigCount[t]}x</span></span>`
          ).join("");
        } else {
          trigEl.innerHTML = `<p class="text-muted" style="font-size:12px">Sem gatilhos registrados no período.</p>`;
        }
      }

      // Gráfico SVG de evolução da dor
      renderSVGPainChart(hd, repPeriodDias);

      renderBarChart("rep-pain-chart",  hd.map(r=>({ label: fmtDate(r.record_date).slice(0,5), value: r.pain_level||0, max:10 })));
      renderBarChart("rep-sleep-chart", hd.map(r=>({ label: fmtDate(r.record_date).slice(0,5), value: r.sleep_quality||0, max:5 })));
    } else {
      document.getElementById("rep-pain").textContent  = "—";
      document.getElementById("rep-sleep").textContent = "—";
      const fatEl = document.getElementById("rep-fatigue"); if(fatEl) fatEl.textContent = "—";
      const engEl = document.getElementById("rep-energy");  if(engEl) engEl.textContent = "—";
      const locaisEl = document.getElementById("rep-locais");
      if (locaisEl) locaisEl.innerHTML = `<p class="text-muted" style="font-size:12px">Sem registros no período selecionado.</p>`;
      const trigEl = document.getElementById("rep-triggers");
      if (trigEl) trigEl.innerHTML = `<p class="text-muted" style="font-size:12px">Sem dados no período.</p>`;
      const svgEl = document.getElementById("rep-svg-chart");
      if (svgEl) svgEl.innerHTML = `<p class="text-muted" style="text-align:center;padding:20px 0">Sem dados para exibir</p>`;
    }

    const { data: td } = await db.from("tasks").select("id").eq("user_id",currentUser.id).eq("completed",true).gte("task_date",start);
    document.getElementById("rep-tasks").textContent = td?.length || 0;

    const { data: md } = await db.from("medications").select("id").eq("user_id",currentUser.id);
    document.getElementById("rep-meds").textContent = md?.length || 0;

  } catch(e) { toast("Erro ao carregar relatórios.", "e"); console.error(e); }
  finally { hideLoad(); }
}

function renderBarChart(id, items) {
  const el = document.getElementById(id);
  if (!items.length) { el.innerHTML = `<p class="text-muted">Sem dados</p>`; return; }
  el.innerHTML = items.map(i => `
    <div class="bar-row">
      <span class="bar-lbl">${i.label}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(i.value/i.max*100)}%"></div></div>
      <span class="bar-val">${i.value}</span>
    </div>`).join("");
}

// ── SINAIS VITAIS ─────────────────────────────────────────────

async function saveVitals() {
  const weight    = parseFloat(document.getElementById("vitals-weight").value)    || null;
  const waist     = parseFloat(document.getElementById("vitals-waist").value)     || null;
  const systolic  = parseInt(document.getElementById("vitals-systolic").value)    || null;
  const diastolic = parseInt(document.getElementById("vitals-diastolic").value)   || null;
  const pulse     = parseInt(document.getElementById("vitals-pulse").value)       || null;
  const glucose   = parseFloat(document.getElementById("vitals-glucose").value)   || null;
  const gType     = document.getElementById("vitals-glucose-type").value;

  if (!weight && !waist && !systolic && !diastolic && !pulse && !glucose) {
    toast("Preencha ao menos um campo de sinais vitais.", "w"); return;
  }
  if ((systolic && !diastolic) || (!systolic && diastolic)) {
    toast("Informe SIS e DIA para pressão arterial.", "w"); return;
  }

  showLoad();
  try {
    const { error } = await db.from("vitals_records").insert({
      user_id:      currentUser.id,
      record_date:  todayISO(),
      weight, waist,
      bp_systolic:  systolic,
      bp_diastolic: diastolic,
      pulse,
      glucose,
      glucose_type: glucose ? gType : null,
    });
    if (error) throw error;

    ["vitals-weight","vitals-waist","vitals-systolic","vitals-diastolic","vitals-pulse","vitals-glucose"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    toast("Sinais vitais salvos! 📊", "s");
    loadVitals();
  } catch(e) {
    toast("Erro ao salvar sinais vitais.", "e");
    console.error(e);
  } finally { hideLoad(); }
}

function openVitalsModal(r = null) {
  document.getElementById("mv-title").textContent = r ? "✏️ Editar Sinais Vitais" : "📊 Novo Registro";
  document.getElementById("vitals-edit-id").value   = r?.id || "";
  document.getElementById("vitals-edit-date").value = r?.record_date || todayISO();
  document.getElementById("ve-weight").value         = r?.weight || "";
  document.getElementById("ve-waist").value          = r?.waist || "";
  document.getElementById("ve-systolic").value       = r?.bp_systolic || "";
  document.getElementById("ve-diastolic").value      = r?.bp_diastolic || "";
  document.getElementById("ve-pulse").value          = r?.pulse || "";
  document.getElementById("ve-glucose").value        = r?.glucose || "";
  document.getElementById("ve-glucose-type").value   = r?.glucose_type || "jejum";
  document.getElementById("ve-notes").value          = r?.notes || "";
  openModal("modal-vitals");
}

async function saveVitalsModal() {
  const id        = document.getElementById("vitals-edit-id").value;
  const date      = document.getElementById("vitals-edit-date").value;
  const weight    = parseFloat(document.getElementById("ve-weight").value)    || null;
  const waist     = parseFloat(document.getElementById("ve-waist").value)     || null;
  const systolic  = parseInt(document.getElementById("ve-systolic").value)    || null;
  const diastolic = parseInt(document.getElementById("ve-diastolic").value)   || null;
  const pulse     = parseInt(document.getElementById("ve-pulse").value)       || null;
  const glucose   = parseFloat(document.getElementById("ve-glucose").value)   || null;
  const gType     = document.getElementById("ve-glucose-type").value;
  const notes     = document.getElementById("ve-notes").value.trim();

  const payload = {
    user_id: currentUser.id, record_date: date,
    weight, waist, bp_systolic: systolic, bp_diastolic: diastolic, pulse,
    glucose, glucose_type: glucose ? gType : null,
    notes: notes || null,
    updated_at: new Date().toISOString()
  };

  showLoad();
  try {
    if (id) {
      const { error } = await db.from("vitals_records").update(payload).eq("id", id);
      if (error) throw error;
      toast("Registro atualizado! ✅", "s");
    } else {
      const { error } = await db.from("vitals_records").insert(payload);
      if (error) throw error;
      toast("Sinais vitais salvos! 📊", "s");
    }
    closeModal("modal-vitals");
    loadVitals();
  } catch(e) {
    toast("Erro ao salvar.", "e"); console.error(e);
  } finally { hideLoad(); }
}

async function loadVitals() {
  try {
    const { data } = await db.from("vitals_records")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("record_date", { ascending: false })
      .limit(30);
    renderVitalsList(data || []);
  } catch(e) { console.error(e); }
}

function bpClass(s) {
  if (!s) return "";
  if (s < 120) return "color:var(--success)";
  if (s < 130) return "color:var(--green)";
  if (s < 140) return "color:var(--warning)";
  return "color:var(--danger)";
}

function glucoseClass(g) {
  if (!g) return "";
  if (g < 100) return "color:var(--success)";
  if (g < 126) return "color:var(--warning)";
  return "color:var(--danger)";
}

function renderVitalsList(list) {
  const el = document.getElementById("vitals-list");
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><div class="ei">📊</div><p>Seus sinais vitais aparecerão aqui</p></div>`;
    return;
  }
  el.innerHTML = list.map(r => {
    const bp = (r.bp_systolic && r.bp_diastolic)
      ? `<div class="vhc-item"><span class="vi-lbl">🩺 Pressão</span><span class="vi-val pressure" style="${bpClass(r.bp_systolic)}">
          <span title="Sistólica">SIS ${r.bp_systolic}</span> / <span title="Diastólica">DIA ${r.bp_diastolic}</span>
          <small style="font-size:10px;font-weight:500">mmHg</small>
          ${r.pulse ? `· <span title="Pulso" style="color:var(--text2)">PUL ${r.pulse} <small style="font-size:10px">bpm</small></span>` : ""}
         </span></div>`
      : (r.pulse ? `<div class="vhc-item"><span class="vi-lbl">💓 Pulso</span><span class="vi-val">${r.pulse} <small style="font-size:10px;font-weight:500">bpm</small></span></div>` : "");
    const glu = r.glucose
      ? `<div class="vhc-item"><span class="vi-lbl">🩸 Glicemia (${r.glucose_type === "pos_prandial" ? "pós" : r.glucose_type || "jejum"})</span><span class="vi-val glucose" style="${glucoseClass(r.glucose)}">${r.glucose} <small style="font-size:10px;font-weight:500">mg/dL</small></span></div>`
      : "";
    const wt  = r.weight
      ? `<div class="vhc-item"><span class="vi-lbl">⚖️ Peso</span><span class="vi-val weight">${r.weight} <small style="font-size:10px;font-weight:500">kg</small></span></div>`
      : "";
    const wa  = r.waist
      ? `<div class="vhc-item"><span class="vi-lbl">📏 Cintura</span><span class="vi-val waist">${r.waist} <small style="font-size:10px;font-weight:500">cm</small></span></div>`
      : "";

    return `<div class="vitals-history-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div class="vhc-date">📅 ${fmtDate(r.record_date)}</div>
        <div class="vhc-actions">
          <button class="ia-btn edit" onclick='openVitalsModal(${JSON.stringify(r)})' title="Editar">✏️</button>
          <button class="ia-btn del"  onclick="deleteVitals('${r.id}')" title="Excluir">🗑️</button>
        </div>
      </div>
      <div class="vhc-grid">${bp}${glu}${wt}${wa}</div>
      ${r.notes ? `<div style="font-size:11px;color:var(--text-muted);margin-top:8px">📝 ${esc(r.notes)}</div>` : ""}
    </div>`;
  }).join("");
}

async function deleteVitals(id) {
  if (!confirm("Excluir este registro de sinais vitais?")) return;
  showLoad();
  try {
    const { error } = await db.from("vitals_records").delete().eq("id", id);
    if (error) throw error;
    toast("Registro excluído.", "i");
    loadVitals();
  } catch(e) { toast("Erro ao excluir.", "e"); } finally { hideLoad(); }
}

// ── DOCUMENTOS DE SAÚDE ────────────────────────────────────────

function docTypeLabel(t) {
  return { receita_medica:"💊 Receita Médica", solicitacao_exame:"🔬 Solicitação de Exame", resultado_exame:"📋 Resultado de Exame" }[t] || t;
}
function docTypeClass(t) {
  return { receita_medica:"receita", solicitacao_exame:"solicitacao", resultado_exame:"resultado" }[t] || "";
}
function docTypeIcon(t) {
  return { receita_medica:"💊", solicitacao_exame:"🔬", resultado_exame:"📋" }[t] || "📄";
}

function onFileSelected(input) {
  const nameEl = document.getElementById("doc-file-name");
  const areaEl = document.getElementById("file-upload-area");
  if (input.files[0]) {
    nameEl.textContent = "📎 " + input.files[0].name;
    nameEl.style.display = "flex";
    areaEl.style.display = "none";
  } else {
    nameEl.style.display = "none";
    areaEl.style.display = "block";
  }
}

function openDocModal(doc = null) {
  document.getElementById("mdoc-title").textContent = doc ? "✏️ Editar Documento" : "📎 Novo Documento";
  document.getElementById("doc-id").value     = doc?.id    || "";
  document.getElementById("doc-type").value   = doc?.doc_type || "receita_medica";
  document.getElementById("doc-title").value  = doc?.title   || "";
  document.getElementById("doc-date").value   = doc?.doc_date || todayISO();
  document.getElementById("doc-notes").value  = doc?.notes   || "";
  document.getElementById("doc-file-input").value = "";
  document.getElementById("doc-file-name").style.display = "none";
  document.getElementById("file-upload-area").style.display = "block";
  openModal("modal-doc");
}

async function saveDoc() {
  const id    = document.getElementById("doc-id").value;
  const title = document.getElementById("doc-title").value.trim();
  const type  = document.getElementById("doc-type").value;
  const date  = document.getElementById("doc-date").value;
  const notes = document.getElementById("doc-notes").value.trim();
  const file  = document.getElementById("doc-file-input").files[0];

  if (!title) { toast("Digite um título para o documento.", "e"); return; }

  showLoad();
  try {
    let fileUrl  = null;
    let fileName = null;

    if (file) {
      const maxSize = 10 * 1024 * 1024; // 10 MB
      if (file.size > maxSize) { toast("Arquivo muito grande. Máximo 10 MB.", "e"); return; }
      const ext  = file.name.split(".").pop().toLowerCase();
      const path = `${currentUser.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await db.storage.from("health-docs").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = db.storage.from("health-docs").getPublicUrl(path);
      fileUrl  = urlData.publicUrl;
      fileName = file.name;
    }

    const payload = {
      user_id:  currentUser.id,
      title, doc_type: type, doc_date: date,
      notes:    notes || null,
    };
    if (fileUrl)  { payload.file_url  = fileUrl;  }
    if (fileName) { payload.file_name = fileName; }

    if (id) {
      const { error } = await db.from("health_documents").update(payload).eq("id", id);
      if (error) throw error;
      toast("Documento atualizado! ✅", "s");
    } else {
      const { error } = await db.from("health_documents").insert(payload);
      if (error) throw error;
      toast("Documento salvo! 📎", "s");
    }
    closeModal("modal-doc");
    loadDocs();
  } catch(e) {
    toast("Erro ao salvar documento: " + (e.message || "tente novamente"), "e");
    console.error(e);
  } finally { hideLoad(); }
}

async function loadDocs() {
  try {
    const { data } = await db.from("health_documents")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("doc_date", { ascending: false });
    renderDocsList(data || []);
  } catch(e) { console.error(e); }
}

function renderDocsList(list) {
  const el = document.getElementById("docs-list");
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><div class="ei">📄</div><p>Nenhum documento cadastrado.<br>Adicione receitas, solicitações e resultados.</p></div>`;
    return;
  }
  el.innerHTML = list.map(d => `
    <div class="doc-card">
      <div class="doc-icon ${docTypeClass(d.doc_type)}">${docTypeIcon(d.doc_type)}</div>
      <div class="doc-body">
        <div class="doc-title">${esc(d.title)}</div>
        <div class="doc-meta">${docTypeLabel(d.doc_type)} · ${fmtDate(d.doc_date)}</div>
        ${d.notes ? `<div class="doc-notes">${esc(d.notes).substring(0,80)}${d.notes.length>80?"…":""}</div>` : ""}
        ${d.file_url ? `<a href="${d.file_url}" target="_blank" style="font-size:11px;color:var(--green);font-weight:600;display:inline-flex;align-items:center;gap:4px;margin-top:4px">📎 Abrir arquivo</a>` : ""}
      </div>
      <div class="doc-actions">
        <button class="ia-btn edit" onclick='openDocModal(${JSON.stringify(d)})' title="Editar">✏️</button>
        <button class="ia-btn del"  onclick="deleteDoc('${d.id}','${d.file_url||''}')" title="Excluir">🗑️</button>
      </div>
    </div>`).join("");
}

async function deleteDoc(id, fileUrl) {
  if (!confirm("Excluir este documento? O arquivo também será removido.")) return;
  showLoad();
  try {
    if (fileUrl) {
      const parts = fileUrl.split("/health-docs/");
      if (parts[1]) await db.storage.from("health-docs").remove([decodeURIComponent(parts[1])]);
    }
    const { error } = await db.from("health_documents").delete().eq("id", id);
    if (error) throw error;
    toast("Documento excluído.", "i");
    loadDocs();
  } catch(e) { toast("Erro ao excluir.", "e"); } finally { hideLoad(); }
}

// ── DIÁRIO DA DOR — LOCAIS DE DOR ────────────────────────────
const LOCAIS_DOR = [
  "Cabeça","Pescoço","Ombros","Braços",
  "Mãos","Costas","Lombar","Quadril",
  "Pernas","Joelhos","Pés","Corpo todo"
];

function initBodyLocations() {
  const grade = document.getElementById("inline-locais-grid");
  if (!grade) return;
  grade.innerHTML = "";
  LOCAIS_DOR.forEach(local => {
    const b = document.createElement("button");
    b.className = "botao-local";
    b.textContent = local;
    b.dataset.local = local;
    b.type = "button";
    b.addEventListener("click", function() { this.classList.toggle("ativo"); });
    grade.appendChild(b);
  });
}

function getSelectedLocais() {
  const locais = [];
  document.querySelectorAll("#inline-locais-grid .botao-local.ativo").forEach(b => locais.push(b.dataset.local));
  return locais;
}

function clearBodyLocations() {
  document.querySelectorAll("#inline-locais-grid .botao-local.ativo").forEach(b => b.classList.remove("ativo"));
}

function corPorNivel(n) {
  if (n <= 3) return "#8ab060";   // verde — leve
  if (n <= 6) return "#c4a030";   // amarelo — moderado
  if (n <= 8) return "#c07020";   // laranja — forte
  return "#c04030";               // vermelho — intenso
}

// ── SVG CHART — EVOLUÇÃO DA DOR ──────────────────────────────
function renderSVGPainChart(records, dias) {
  const container = document.getElementById("rep-svg-chart");
  if (!container) return;

  if (!records || !records.length) {
    container.innerHTML = `<p class="text-muted" style="text-align:center;padding:20px 0">Sem dados para exibir</p>`;
    return;
  }

  // Montar array de dias
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const diasArr = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    diasArr.push({ date: d.toISOString().split("T")[0], val: null, count: 0 });
  }

  records.forEach(r => {
    const entry = diasArr.find(d => d.date === r.record_date);
    if (entry && r.pain_level != null) {
      if (entry.val === null) { entry.val = r.pain_level; entry.count = 1; }
      else { entry.val = (entry.val * entry.count + r.pain_level) / (entry.count + 1); entry.count++; }
    }
  });

  const W = 440, H = 160, mT = 10, mB = 26;
  const bW = W / diasArr.length;
  const bFill = bW * 0.65;
  const aUtil = H - mT - mB;

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">`;

  // Linhas de referência
  [3, 6, 9].forEach(n => {
    const y = mT + aUtil - (n / 10) * aUtil;
    svg += `<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="#deded0" stroke-width="1" stroke-dasharray="3,3"/>`;
    svg += `<text x="${W-2}" y="${(y-2).toFixed(1)}" font-size="8" fill="#9a9a80" text-anchor="end" font-family="sans-serif">${n}</text>`;
  });

  // Barras
  diasArr.forEach((d, i) => {
    const x = i * bW + (bW - bFill) / 2;
    if (d.val !== null) {
      const h = Math.max((d.val / 10) * aUtil, 2);
      const y = mT + aUtil - h;
      svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bFill.toFixed(1)}" height="${h.toFixed(1)}" fill="${corPorNivel(Math.round(d.val))}" rx="3"/>`;
      if (h > 12) {
        svg += `<text x="${(x+bFill/2).toFixed(1)}" y="${(y-2).toFixed(1)}" font-size="8" fill="#5a5a40" text-anchor="middle" font-family="sans-serif">${Math.round(d.val)}</text>`;
      }
    }
    // Rótulo de data (a cada 2 dias ou último)
    if (i % 2 === 0 || i === diasArr.length - 1) {
      const labelX = x + bFill / 2;
      const [, mm, dd] = d.date.split("-");
      svg += `<text x="${labelX.toFixed(1)}" y="${H - 6}" font-size="9" fill="#757050" text-anchor="middle" font-family="sans-serif">${dd}/${mm}</text>`;
    }
  });

  svg += "</svg>";
  container.innerHTML = svg;
}

// ── GERAR PDF — FIBROVIDA ─────────────────────────────────────
async function gerarPDFFibroVida() {
  if (!window.jspdf) { toast("Biblioteca PDF não carregada. Tente novamente.", "e"); return; }
  showLoad();
  try {
    const now  = new Date();
    const prev = new Date(now); prev.setDate(prev.getDate() - (repPeriodDias - 1));
    const start = prev.toISOString().split("T")[0];
    const end   = todayISO();

    const { data: records } = await db.from("health_records")
      .select("*")
      .eq("user_id", currentUser.id)
      .gte("record_date", start)
      .lte("record_date", end)
      .order("record_date", { ascending: true });

    if (!records || !records.length) {
      toast("Sem registros no período selecionado.", "w");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const marg = 15;
    let y = marg;

    // ── Cabeçalho ──
    doc.setFillColor(90, 122, 48);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("FibroVida", marg, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Diário da Dor — Relatório de Acompanhamento", marg, 22);
    y = 40;
    doc.setTextColor(42, 42, 26);

    // ── Dados do paciente ──
    const nome   = currentProfile?.name || currentUser?.email?.split("@")[0] || "(não informado)";
    const medico = document.getElementById("rep-medico")?.value.trim() || "";

    const addLinha = (label, valor) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text(label, marg, y);
      doc.setFont("helvetica", "normal");
      doc.text(valor, marg + 30, y);
      y += 6;
    };

    addLinha("Paciente:", nome);
    if (medico) addLinha("Médico(a):", medico);
    addLinha("Período:", `${fmtDate(start)} a ${fmtDate(end)} (últimos ${repPeriodDias} dias)`);
    addLinha("Emitido em:", fmtDate(todayISO()));
    y += 4;

    // ── Resumo ──
    const avgPain  = (records.reduce((s,r)=>s+(r.pain_level||0),0)/records.length).toFixed(1);
    const maxPain  = Math.max(...records.map(r=>r.pain_level||0));
    const minPain  = Math.min(...records.map(r=>r.pain_level||0));
    const avgSleep = (records.reduce((s,r)=>s+(r.sleep_quality||0),0)/records.length).toFixed(1);

    const contagem = {};
    records.forEach(r => { (r.body_locations||[]).forEach(l => { contagem[l]=(contagem[l]||0)+1; }); });
    const topLocais = Object.keys(contagem).sort((a,b)=>contagem[b]-contagem[a]).slice(0,3)
      .map(l=>`${l} (${contagem[l]}x)`).join(", ") || "—";

    // Fadiga, Energia e Gatilhos
    const hdFat = records.filter(r=>r.fatigue_level!=null);
    const hdEng = records.filter(r=>r.energy_level!=null);
    const avgFatigue = hdFat.length ? (hdFat.reduce((s,r)=>s+r.fatigue_level,0)/hdFat.length).toFixed(1) : null;
    const avgEnergy  = hdEng.length ? (hdEng.reduce((s,r)=>s+r.energy_level,0)/hdEng.length).toFixed(1) : null;
    const trigCnt = {};
    records.forEach(r => { (r.triggers||[]).forEach(t => { trigCnt[t]=(trigCnt[t]||0)+1; }); });
    const topTrigs = Object.keys(trigCnt).sort((a,b)=>trigCnt[b]-trigCnt[a]).slice(0,3)
      .map(t=>`${triggerLabels[t]||t} (${trigCnt[t]}x)`).join(", ") || "—";

    const resumoH = 52 + (avgFatigue || avgEnergy ? 12 : 0) + (topTrigs !== "—" ? 6 : 0);
    doc.setFillColor(237, 242, 229);
    doc.rect(marg, y, 180, resumoH, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.setTextColor(90, 122, 48);
    doc.text("Resumo do período", marg + 4, y + 7);
    doc.setTextColor(42, 42, 26); doc.setFont("helvetica","normal"); doc.setFontSize(9);
    let ry = y + 14;
    doc.text(`Total de registros: ${records.length}`, marg + 4, ry); ry += 6;
    doc.text(`Dor média: ${avgPain}/10  (mín: ${minPain}, máx: ${maxPain})`, marg + 4, ry); ry += 6;
    doc.text(`Sono médio: ${avgSleep}/5`, marg + 4, ry); ry += 6;
    if (avgFatigue) { doc.text(`Fadiga média: ${avgFatigue}/10`, marg + 4, ry); ry += 6; }
    if (avgEnergy)  { doc.text(`Energia média: ${avgEnergy}/10`, marg + 4, ry); ry += 6; }
    doc.text(`Locais mais frequentes: ${topLocais}`, marg + 4, ry); ry += 6;
    if (topTrigs !== "—") { doc.text(`Principais gatilhos: ${topTrigs}`, marg + 4, ry); ry += 6; }
    y = ry + 6;

    // ── Tabela ──
    doc.setFont("helvetica","bold"); doc.setFontSize(11);
    doc.setTextColor(90, 122, 48);
    doc.text("Registros detalhados", marg, y); y += 6;

    doc.setFillColor(90, 122, 48);
    doc.rect(marg, y, 180, 7, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(8);
    doc.text("Data",   marg + 2,  y + 5);
    doc.text("Dor",   marg + 32, y + 5);
    doc.text("Sono",  marg + 50, y + 5);
    doc.text("Humor", marg + 68, y + 5);
    doc.text("Locais de Dor", marg + 96, y + 5);
    y += 7;

    doc.setTextColor(42, 42, 26); doc.setFont("helvetica","normal");
    records.forEach((r, i) => {
      if (y > 275) { doc.addPage(); y = marg; }
      if (i % 2 === 0) { doc.setFillColor(245,247,240); doc.rect(marg,y,180,6,"F"); }
      doc.setFontSize(8);
      doc.text(fmtDate(r.record_date), marg + 2,  y + 4);

      if (r.pain_level != null) {
        const cor = corPorNivel(r.pain_level);
        const rgb = parseInt(cor.replace("#",""), 16);
        doc.setTextColor((rgb>>16)&255, (rgb>>8)&255, rgb&255);
        doc.setFont("helvetica","bold");
        doc.text(`${r.pain_level}/10`, marg + 32, y + 4);
        doc.setFont("helvetica","normal");
        doc.setTextColor(42,42,26);
      } else {
        doc.text("—", marg + 32, y + 4);
      }

      doc.text(`${r.sleep_quality ?? "—"}/5`, marg + 50, y + 4);
      doc.text(moodLabel(r.mood) || "—", marg + 68, y + 4);
      const loc = (r.body_locations||[]).slice(0,3).join(", ") || "—";
      doc.text(loc.length > 38 ? loc.slice(0,37)+"…" : loc, marg + 96, y + 4);
      y += 6;
    });

    // ── Rodapé ──
    const totalPgs = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPgs; p++) {
      doc.setPage(p);
      doc.setFontSize(7); doc.setTextColor(90, 90, 64);
      doc.text(`FibroVida · Relatório de Saúde · Pág. ${p}/${totalPgs} · ${fmtDate(todayISO())}`, 105, 290, { align:"center" });
    }

    doc.save(`fibrovida_dor_${todayISO()}.pdf`);
    toast("PDF gerado com sucesso! 📄", "s");

  } catch(e) {
    console.error(e);
    toast("Erro ao gerar PDF.", "e");
  } finally { hideLoad(); }
}

// ── HISTÓRICO DE CRISES ───────────────────────────────────────
async function loadCrisisHistory() {
  const el = document.getElementById("crisis-list");
  if (!el) return;
  try {
    const { data } = await db.from("crisis_logs")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("logged_at", { ascending: false })
      .limit(30);
    renderCrisisList(data || []);
  } catch(e) { console.error(e); }
}

const triggerLabels = {
  estresse:"Estresse", frio:"Frio/Clima", esforco:"Esforço físico",
  insonia:"Insônia", alimentacao:"Alimentação", ansiedade:"Ansiedade",
  hormonal:"Hormonal", barulho:"Barulho", tempo:"Tempo/Umidade",
  luz:"Luz forte"
};

function renderCrisisList(list) {
  const el = document.getElementById("crisis-list");
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><div class="ei">🚨</div><p>Nenhuma crise registrada.<br>Use o botão 🚨 na tela inicial quando sentir uma crise.</p></div>`;
    return;
  }
  el.innerHTML = list.map(c => {
    const dt   = new Date(c.logged_at);
    const dtFmt = dt.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
    const trigs = (c.triggers || []).map(t => `<span class="chc-trig">${triggerLabels[t]||t}</span>`).join("");
    return `
    <div class="crisis-hist-card">
      <div class="chc-icon">🚨</div>
      <div class="chc-body">
        <div class="chc-date">📅 ${dtFmt}</div>
        <div class="chc-levels">
          ${c.pain_level    != null ? `<span class="chc-level">❤️ Dor ${c.pain_level}/10</span>` : ""}
          ${c.fatigue_level != null ? `<span class="chc-level">😩 Fadiga ${c.fatigue_level}/10</span>` : ""}
          ${c.anxiety_level != null ? `<span class="chc-level">😰 Ansiedade ${c.anxiety_level}/10</span>` : ""}
        </div>
        ${trigs ? `<div class="chc-triggers">${trigs}</div>` : ""}
        ${c.notes ? `<div class="chc-notes">"${esc(c.notes)}"</div>` : ""}
      </div>
      <button class="chc-del" onclick="deleteCrisis('${c.id}')" title="Excluir">🗑️</button>
    </div>`;
  }).join("");
}

async function deleteCrisis(id) {
  if (!confirm("Excluir este registro de crise?")) return;
  showLoad();
  try {
    const { error } = await db.from("crisis_logs").delete().eq("id", id);
    if (error) throw error;
    toast("Registro excluído.", "i");
    loadCrisisHistory();
  } catch(e) { toast("Erro ao excluir.", "e"); } finally { hideLoad(); }
}

// ── ÍNDICE FIBROVIDA — BARRAS ─────────────────────────────────
function renderFibroIndex(data) {
  const card    = document.getElementById("fibro-index-card");
  const empty   = document.getElementById("fic-empty");
  const barsWrap = document.getElementById("fic-bars-wrap");
  const ficBtn  = card?.querySelector(".fic-btn");

  if (!data) {
    if (empty)    empty.style.display = "block";
    if (barsWrap) barsWrap.style.display = "none";
    return;
  }

  if (empty)    empty.style.display = "none";
  if (barsWrap) barsWrap.style.display = "block";

  const setBar = (id, valId, pct, label) => {
    const bar = document.getElementById(id);
    const val = document.getElementById(valId);
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + "%";
    if (val) val.textContent = label;
  };

  // Dor: 0-10 → barra cheia = dor alta (cor vermelha pelo CSS)
  const pain = data.pain_level != null ? data.pain_level : null;
  setBar("fib-pain", "fib-pain-val",
    pain != null ? (pain / 10 * 100) : 0,
    pain != null ? `${pain}/10` : "—");

  // Sono: 0-5 → barra cheia = sono ótimo (cor azul)
  const sleep = data.sleep_quality != null ? data.sleep_quality : null;
  setBar("fib-sleep", "fib-sleep-val",
    sleep != null ? (sleep / 5 * 100) : 0,
    sleep != null ? `${sleep}/5` : "—");

  // Energia: 0-10 → barra cheia = muita energia (cor laranja)
  const energy = data.energy_level != null ? data.energy_level : null;
  setBar("fib-energy", "fib-energy-val",
    energy != null ? (energy / 10 * 100) : 0,
    energy != null ? `${energy}/10` : "—");

  // Humor: mapeia categórico → %
  const moodMap = { muito_bem: 100, bem: 80, neutro: 60, mal: 35, muito_mal: 15 };
  const moodPct = data.mood ? (moodMap[data.mood] || 0) : 0;
  setBar("fib-mood", "fib-mood-val",
    moodPct,
    data.mood ? moodEmoji(data.mood) : "—");
}

// ── SELETOR RÁPIDO DE HUMOR (HOME) ───────────────────────────
async function selectMoodQuick(value) {
  if (!currentUser) return;

  // Atualiza visual imediatamente
  setMoodQuickActive(value);

  try {
    // Verifica se já existe registro de hoje
    const { data: existing } = await db.from("health_records")
      .select("id, mood")
      .eq("user_id", currentUser.id)
      .eq("record_date", todayISO())
      .order("created_at", { ascending: false })
      .limit(1);

    if (existing?.[0]) {
      // Atualiza o humor do registro existente
      await db.from("health_records")
        .update({ mood: value, updated_at: new Date().toISOString() })
        .eq("id", existing[0].id);
    } else {
      // Cria registro mínimo só com o humor
      await db.from("health_records").insert({
        user_id:     currentUser.id,
        record_date: todayISO(),
        mood:        value,
        pain_level:  0,
        sleep_quality: 0,
      });
    }
    toast(`Humor registrado: ${moodEmoji(value)} ${moodLabel(value)}`, "s");
  } catch(e) {
    console.error("Erro ao salvar humor rápido:", e);
    toast("Não foi possível salvar o humor.", "e");
  }
}

function setMoodQuickActive(mood) {
  document.querySelectorAll(".mqc-btn").forEach(btn => {
    btn.classList.remove("mqc-active");
    if (btn.dataset.mood === mood) btn.classList.add("mqc-active");
  });
}

// ── REGISTRO DE CRISE ─────────────────────────────────────────
function openCriseModal() {
  const overlay = document.getElementById("crise-modal");
  if (!overlay) return;

  // Reseta sliders para valores padrão
  ["crise-pain","crise-fatigue","crise-anxiety"].forEach((id, i) => {
    const defaults = [8, 7, 5];
    const el = document.getElementById(id);
    if (el) {
      el.value = defaults[i];
      el.style.setProperty("--pct", (defaults[i] / 10 * 100) + "%");
    }
    const valEl = document.getElementById(id + "-val");
    if (valEl) valEl.textContent = defaults[i];
  });

  // Desmarca todos os gatilhos
  overlay.querySelectorAll(".crise-trigger").forEach(cb => { cb.checked = false; });

  // Limpa notas
  const notesEl = document.getElementById("crise-notes");
  if (notesEl) notesEl.value = "";

  overlay.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeCriseModal() {
  const overlay = document.getElementById("crise-modal");
  if (overlay) overlay.style.display = "none";
  document.body.style.overflow = "";
}

async function saveCrise() {
  const pain     = parseInt(document.getElementById("crise-pain").value);
  const fatigue  = parseInt(document.getElementById("crise-fatigue").value);
  const anxiety  = parseInt(document.getElementById("crise-anxiety").value);
  const notes    = document.getElementById("crise-notes").value.trim();

  // Coleta gatilhos marcados
  const triggers = [];
  document.querySelectorAll(".crise-trigger:checked").forEach(cb => triggers.push(cb.value));

  showLoad();
  try {
    const { error } = await db.from("crisis_logs").insert({
      user_id:       currentUser.id,
      logged_at:     new Date().toISOString(),
      pain_level:    pain,
      fatigue_level: fatigue,
      anxiety_level: anxiety,
      triggers:      triggers.length ? triggers : [],
      notes:         notes || null,
    });
    if (error) throw error;
    closeCriseModal();
    toast("🚨 Crise registrada. Cuide-se! 💜", "s");
  } catch(e) {
    console.error("Erro ao salvar crise:", e);
    toast("Erro ao registrar crise.", "e");
  } finally { hideLoad(); }
}

// ── FIBROASSISTENTE ───────────────────────────────────────────

let _assistCtx = null; // cache dos dados do usuário para o chat

async function loadAssistente() {
  // Abre o assistente e carrega o contexto de dados silenciosamente
  try {
    const now   = new Date();
    const d30   = new Date(now); d30.setDate(d30.getDate() - 30);
    const start = d30.toISOString().split("T")[0];

    const [{ data: hd }, { data: crises }, { data: meds }] = await Promise.all([
      db.from("health_records").select("*")
        .eq("user_id", currentUser.id)
        .gte("record_date", start)
        .order("record_date", { ascending: true }),
      db.from("crisis_logs").select("*")
        .eq("user_id", currentUser.id)
        .order("logged_at", { ascending: false })
        .limit(20),
      db.from("medications").select("name,schedule_time")
        .eq("user_id", currentUser.id),
    ]);
    _assistCtx = { hd: hd||[], crises: crises||[], meds: meds||[] };
  } catch(e) {
    console.warn("Assistente: erro ao carregar contexto", e);
    _assistCtx = { hd: [], crises: [], meds: [] };
  }
}

function chatAppend(role, html) {
  const wrap = document.getElementById("chat-wrap");
  if (!wrap) return;
  const div = document.createElement("div");
  div.className = `chat-msg chat-msg-${role === "user" ? "user" : "bot"}`;
  const avatar = role === "user"
    ? `<div class="chat-avatar">👤</div>`
    : `<div class="chat-avatar">🤖</div>`;
  div.innerHTML = `${avatar}<div class="chat-bubble">${html}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return div;
}

function chatTyping() {
  const wrap = document.getElementById("chat-wrap");
  if (!wrap) return null;
  const div = document.createElement("div");
  div.className = "chat-msg chat-msg-bot";
  div.id = "typing-indicator";
  div.innerHTML = `<div class="chat-avatar">🤖</div><div class="chat-bubble"><div class="typing"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return div;
}

async function askAssistente(intent) {
  const labels = {
    resumo:"📊 Resumo da semana", gatilhos:"⚡ Meus gatilhos",
    sono:"💤 Dicas de sono", dor:"❤️ Análise de dor",
    crise:"🚨 Minhas crises", motivacao:"💜 Me motive!"
  };
  chatAppend("user", labels[intent] || intent);
  await respondAssistente(intent);
}

async function sendChatMsg() {
  const input = document.getElementById("chat-input");
  if (!input) return;
  const txt = input.value.trim();
  if (!txt) return;
  input.value = "";
  chatAppend("user", esc(txt));

  const lower = txt.toLowerCase();
  let intent = "geral";
  if (/semana|resumo|como estou/.test(lower))                    intent = "resumo";
  else if (/gatilho|causa|piora|provoca/.test(lower))            intent = "gatilhos";
  else if (/sono|dormir|inso/.test(lower))                       intent = "sono";
  else if (/dor|dói|ador|doendo/.test(lower))                    intent = "dor";
  else if (/crise|ataque|pior/.test(lower))                      intent = "crise";
  else if (/motiv|ânimo|animo|força|coragem/.test(lower))        intent = "motivacao";
  else if (/medicam|remédio|comprimido|dose/.test(lower))        intent = "medicamento";
  else if (/energia|disposi|cansad|fadiga/.test(lower))          intent = "energia";

  await respondAssistente(intent, txt);
}

async function respondAssistente(intent, rawQuestion) {
  if (!_assistCtx) await loadAssistente();

  const typing = chatTyping();
  await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
  typing?.remove();

  const { hd, crises, meds } = _assistCtx;
  const name = currentProfile?.name?.split(" ")[0] || "você";

  // helpers
  const avg = (arr, key) => {
    const vals = arr.map(r => r[key]).filter(v => v != null);
    return vals.length ? (vals.reduce((s,v)=>s+v,0)/vals.length) : null;
  };
  const last7 = hd.filter(r => {
    const d = new Date(r.record_date+"T00:00:00");
    return (Date.now() - d.getTime()) <= 7 * 86400000;
  });
  const topTriggers = (records) => {
    const cnt = {};
    records.forEach(r => (r.triggers||[]).forEach(t => { cnt[t]=(cnt[t]||0)+1; }));
    return Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]).slice(0,3)
      .map(t => `<strong>${triggerLabels[t]||t}</strong> (${cnt[t]}x)`).join(", ");
  };

  let msg = "";

  switch(intent) {
    case "resumo": {
      if (!last7.length) {
        msg = `${name}, não encontrei registros de saúde nesta semana. 📅<br><br>Que tal começar registrando como você está na aba <strong>Saúde</strong>? Quanto mais você registrar, mais insights eu consigo oferecer! 💚`;
      } else {
        const ap = avg(last7,"pain_level"), as_ = avg(last7,"sleep_quality");
        const ae = avg(last7,"energy_level"), af = avg(last7,"fatigue_level");
        const colorPain = ap <= 3 ? "🟢" : ap <= 6 ? "🟡" : "🔴";
        const colorSleep = as_ >= 4 ? "🟢" : as_ >= 2 ? "🟡" : "🔴";
        msg = `📊 <strong>Resumo da semana</strong> (${last7.length} registros, ${name})<br><br>` +
          `${colorPain} Dor média: <strong>${ap.toFixed(1)}/10</strong><br>` +
          `${colorSleep} Sono médio: <strong>${(as_||0).toFixed(1)}/5</strong><br>` +
          (ae != null ? `⚡ Energia média: <strong>${ae.toFixed(1)}/10</strong><br>` : "") +
          (af != null ? `😩 Fadiga média: <strong>${af.toFixed(1)}/10</strong><br>` : "") +
          `<br>`;
        if (ap > 6) msg += `⚠️ Sua dor está elevada. Considere reportar ao seu médico.<br>`;
        if ((as_||0) < 3) msg += `⚠️ Seu sono está comprometido — isso agrava a fibromialgia.<br>`;
        if (ap <= 4 && (as_||0) >= 3) msg += `✨ Esta foi uma boa semana! Continue assim! 💪`;
      }
      break;
    }
    case "gatilhos": {
      const allT = topTriggers([...hd, ...crises]);
      if (!allT) {
        msg = `${name}, ainda não tenho dados de gatilhos suficientes. 📝<br><br>Ao registrar sua saúde, marque os <strong>gatilhos</strong> que perceber (estresse, frio, esforço...) — assim consigo identificar padrões! 💚`;
      } else {
        msg = `⚡ <strong>Seus principais gatilhos</strong> (últimos 30 dias):<br><br>${allT}<br><br>`;
        const hasFrio = hd.some(r=>(r.triggers||[]).includes("frio"));
        const hasEstresse = hd.some(r=>(r.triggers||[]).includes("estresse"));
        if (hasFrio) msg += `🌡️ <strong>Frio/Clima:</strong> Evite exposição ao frio súbito. Use camadas de roupa e aqueça antes de sair.<br>`;
        if (hasEstresse) msg += `🧘 <strong>Estresse:</strong> Técnicas de respiração e meditação podem ajudar muito. Tente 5 minutos de respiração profunda ao acordar.<br>`;
        msg += `<br>💡 Identificar gatilhos é o primeiro passo para reduzi-los!`;
      }
      break;
    }
    case "sono": {
      const avgSleep = avg(last7, "sleep_quality");
      const trend = last7.slice(-3).map(r=>r.sleep_quality).filter(v=>v!=null);
      const melhorando = trend.length >= 2 && trend[trend.length-1] > trend[0];
      msg = `💤 <strong>Análise do seu sono</strong><br><br>`;
      if (avgSleep != null) {
        const emoji = avgSleep >= 4 ? "😊" : avgSleep >= 2.5 ? "😐" : "😰";
        msg += `${emoji} Média desta semana: <strong>${avgSleep.toFixed(1)}/5</strong>${melhorando ? " ↗️ melhorando!" : ""}<br><br>`;
      }
      msg += `<strong>Dicas para dormir melhor com fibromialgia:</strong><br>` +
        `🌡️ Mantenha o quarto fresco (18-20°C)<br>` +
        `📵 Evite telas 1h antes de dormir<br>` +
        `🛁 Banho morno relaxa os músculos<br>` +
        `⏰ Horário fixo para acordar e dormir<br>` +
        `🧘 Alongamentos suaves antes de deitar<br>` +
        `☕ Evite cafeína após as 14h`;
      break;
    }
    case "dor": {
      const ap = avg(last7, "pain_level");
      const max7 = last7.length ? Math.max(...last7.map(r=>r.pain_level||0)) : null;
      const min7 = last7.length ? Math.min(...last7.map(r=>r.pain_level||0)) : null;
      msg = `❤️ <strong>Análise da sua dor</strong><br><br>`;
      if (ap != null) {
        msg += `Média (7d): <strong>${ap.toFixed(1)}/10</strong>`;
        if (max7 != null) msg += ` · Máx: ${max7} · Mín: ${min7}<br><br>`;
      } else {
        msg += `Sem registros esta semana.<br><br>`;
      }
      msg += `<strong>Estratégias para manejo da dor:</strong><br>` +
        `🌡️ Calor local (bolsa térmica) em pontos doloridos<br>` +
        `🚶 Caminhadas leves reduzem a sensibilização central<br>` +
        `💊 Manter horários dos medicamentos regularmente<br>` +
        `🛌 Descanso de qualidade é tratamento, não preguiça<br>` +
        `🩺 Dor acima de 7/10 por mais de 3 dias: consulte seu médico`;
      break;
    }
    case "crise": {
      if (!crises.length) {
        msg = `🚨 Que bom — não encontrei nenhuma crise registrada! Que sua jornada continue assim. 💚<br><br>Lembre-se: se sentir uma crise, use o botão 🚨 na tela Início para registrá-la e identificar padrões.`;
      } else {
        const last30crises = crises.filter(c => (Date.now()-new Date(c.logged_at).getTime()) <= 30*86400000);
        const cT = topTriggers(crises);
        const avgCP = avg(crises, "pain_level");
        msg = `🚨 <strong>Suas crises (últimos 30 dias)</strong><br><br>` +
          `Total: <strong>${last30crises.length} crise${last30crises.length>1?"s":""}</strong><br>` +
          (avgCP ? `Dor média nas crises: <strong>${avgCP.toFixed(1)}/10</strong><br>` : "") +
          (cT ? `Gatilhos nas crises: ${cT}<br>` : "") +
          `<br>💡 Compartilhe este histórico com seu médico — é informação valiosa para o tratamento.`;
      }
      break;
    }
    case "medicamento": {
      if (!meds.length) {
        msg = `💊 Não encontrei medicamentos cadastrados.<br><br>Na aba <strong>Medicamentos</strong> você pode cadastrar seus remédios, horários e controlar o estoque. Isso ajuda a não perder doses!`;
      } else {
        const comHorario = meds.filter(m => m.schedule_time);
        msg = `💊 Você tem <strong>${meds.length} medicamento${meds.length>1?"s":""}</strong> cadastrado${meds.length>1?"s":""}.<br>` +
          (comHorario.length ? `⏰ ${comHorario.length} com alarme configurado.<br><br>` : "<br>") +
          `<strong>Lembretes importantes:</strong><br>` +
          `✅ Nunca interrompa sem consultar seu médico<br>` +
          `⏰ Tome sempre no mesmo horário<br>` +
          `📦 Confira o estoque regularmente<br>` +
          `📝 Anote efeitos adversos para reportar nas consultas`;
      }
      break;
    }
    case "energia": {
      const ae = avg(last7, "energy_level"), af = avg(last7, "fatigue_level");
      msg = `⚡ <strong>Energia &amp; Fadiga</strong><br><br>`;
      if (ae != null || af != null) {
        if (ae != null) msg += `⚡ Energia média: <strong>${ae.toFixed(1)}/10</strong><br>`;
        if (af != null) msg += `😩 Fadiga média: <strong>${af.toFixed(1)}/10</strong><br>`;
        msg += `<br>`;
        if ((af||0) > 6) msg += `⚠️ Fadiga elevada detectada. Priorize o descanso!<br>`;
      }
      msg += `<strong>Como gerenciar a fadiga:</strong><br>` +
        `⏱️ Pace yourself — distribua atividades ao longo do dia<br>` +
        `💤 Micro-descansos de 5-10 min a cada hora de atividade<br>` +
        `🥗 Alimentação anti-inflamatória dá mais energia<br>` +
        `🚶 Exercício leve regular (mesmo 10 min por dia) ajuda<br>` +
        `💧 Hidratação: beba água regularmente`;
      break;
    }
    case "motivacao": {
      const frases = [
        `${name}, você já supera algo difícil todos os dias. Isso exige uma força que a maioria das pessoas não entende. 💜`,
        `Fibromialgia não define quem você é — você é muito mais do que sua dor. 🌟`,
        `Cada registro que você faz é um ato de amor por você mesma. Você está no caminho certo. 🌿`,
        `Nos dias difíceis, lembre: você já superou 100% dos seus dias ruins até hoje. 💪`,
        `Descansar não é desistir — é parte essencial do seu tratamento. Cuide-se sem culpa. 🛌`,
        `Pequenas vitórias contam: levantar da cama, tomar água, respirar fundo. Parabéns! 🌸`,
      ];
      msg = frases[Math.floor(Math.random() * frases.length)];
      break;
    }
    default: {
      const total30 = hd.length;
      msg = `${name}, analisando seus dados dos últimos 30 dias (${total30} registro${total30!==1?"s":""})...<br><br>` +
        `Use os botões acima para insights específicos, ou me pergunte algo como:<br>` +
        `• "Como está minha dor esta semana?"<br>` +
        `• "Quais são meus gatilhos?"<br>` +
        `• "Me dê dicas para dormir melhor"<br>` +
        `• "Como está minha energia?"<br><br>` +
        `Quanto mais você registrar, mais preciso serei! 💚`;
    }
  }

  chatAppend("bot", msg);
}

// ── GAMIFICAÇÃO — CONQUISTAS ──────────────────────────────────

const ACHIEVEMENTS = [
  { id:"first_record",   icon:"🌱", name:"Primeiros Passos",    desc:"Salve seu 1º registro de saúde" },
  { id:"week_records",   icon:"📅", name:"Primeira Semana",     desc:"7 registros no total" },
  { id:"streak7",        icon:"🌿", name:"7 Dias Seguidos",     desc:"7 dias consecutivos registrados" },
  { id:"med_added",      icon:"💊", name:"Meu Farmacêutico",    desc:"Cadastre seu 1º medicamento" },
  { id:"gratitude",      icon:"🙏", name:"Gratidão Viva",       desc:"Salve sua 1ª entrada de gratidão" },
  { id:"crisis_log",     icon:"🦁", name:"Guerreira da Dor",    desc:"Registre sua 1ª crise" },
  { id:"records_10",     icon:"🚀", name:"10 Registros",        desc:"10 registros de saúde" },
  { id:"streak30",       icon:"🌳", name:"Mês Completo",        desc:"30 dias consecutivos" },
  { id:"records_50",     icon:"💪", name:"Resistência",         desc:"50 registros de saúde" },
  { id:"full_profile",   icon:"🏥", name:"Cuidado Completo",    desc:"Usou saúde, meds e profissionais" },
];

async function loadAchievements() {
  try {
    const [
      { data: hd },
      { count: medCount },
      { count: gratCount },
      { count: crisisCount },
      { count: profCount },
    ] = await Promise.all([
      db.from("health_records").select("record_date").eq("user_id", currentUser.id).order("record_date"),
      db.from("medications").select("*", {count:"exact",head:true}).eq("user_id",currentUser.id),
      db.from("gratitude_entries").select("*",{count:"exact",head:true}).eq("user_id",currentUser.id),
      db.from("crisis_logs").select("*",{count:"exact",head:true}).eq("user_id",currentUser.id),
      db.from("professionals").select("*",{count:"exact",head:true}).eq("user_id",currentUser.id),
    ]);

    const records = hd || [];
    const totalRec = records.length;

    // Streak calculation
    const dates = [...new Set(records.map(r=>r.record_date))].sort();
    let streak = 0, maxStreak = 0, cur = 0;
    for (let i = 0; i < dates.length; i++) {
      if (i === 0) { cur = 1; }
      else {
        const prev = new Date(dates[i-1]+"T00:00:00");
        const curr = new Date(dates[i]+"T00:00:00");
        const diff = Math.round((curr - prev) / 86400000);
        cur = diff === 1 ? cur + 1 : 1;
      }
      if (cur > maxStreak) maxStreak = cur;
    }
    // Streak atual (termina hoje ou ontem)
    if (dates.length) {
      const lastDate = new Date(dates[dates.length-1]+"T00:00:00");
      const diffDays = Math.round((new Date() - lastDate) / 86400000);
      streak = diffDays <= 1 ? cur : 0;
    }

    const unlocked = new Set();
    if (totalRec >= 1)  unlocked.add("first_record");
    if (totalRec >= 7)  unlocked.add("week_records");
    if (totalRec >= 10) unlocked.add("records_10");
    if (totalRec >= 50) unlocked.add("records_50");
    if (maxStreak >= 7)  unlocked.add("streak7");
    if (maxStreak >= 30) unlocked.add("streak30");
    if ((medCount||0) >= 1)    unlocked.add("med_added");
    if ((gratCount||0) >= 1)   unlocked.add("gratitude");
    if ((crisisCount||0) >= 1) unlocked.add("crisis_log");
    if (totalRec >= 1 && (medCount||0) >= 1 && (profCount||0) >= 1) unlocked.add("full_profile");

    renderAchievements(unlocked, streak, maxStreak);
  } catch(e) { console.error("Achievements:", e); }
}

function renderAchievements(unlocked, streak, maxStreak) {
  const grid = document.getElementById("achievements-grid");
  if (!grid) return;

  grid.innerHTML = ACHIEVEMENTS.map(a => {
    const ok = unlocked.has(a.id);
    return `
    <div class="achiev-badge ${ok?"unlocked":"locked"}" title="${ok?"Conquistado!":"Ainda não desbloqueada"}">
      <div class="ab-icon">${a.icon}</div>
      <div class="ab-body">
        <div class="ab-name">${a.name} ${ok?"✅":""}</div>
        <div class="ab-desc">${a.desc}</div>
      </div>
    </div>`;
  }).join("");

  // Mini no home
  const miniSection = document.getElementById("achiev-mini-section");
  const miniRow = document.getElementById("achiev-mini-row");
  const earned = ACHIEVEMENTS.filter(a => unlocked.has(a.id));
  if (miniSection && miniRow && earned.length) {
    miniRow.innerHTML = earned.map(a =>
      `<span class="achiev-mini-badge" title="${a.name}">${a.icon}</span>`
    ).join("");
    miniSection.style.display = "block";
  }

  // Streak toast se > 0
  if (streak >= 3) {
    toast(`🔥 Sequência de ${streak} dias registrando! Continue assim!`, "s");
  }
}

// ── PWA — SERVICE WORKER ──────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/fibrovida/sw.js')
      .then(reg => {
        // Força verificação de atualização a cada carregamento
        reg.update();
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          newSW?.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // Recarrega automaticamente para aplicar nova versão
              window.location.reload();
            }
          });
        });
      })
      .catch(err => console.warn('SW não registrado:', err));

    // Recarrega a página quando o SW assume o controle
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

// ── PWA — INSTALL PROMPT ──────────────────────────────────────
let _deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  if (!localStorage.getItem('pwa-dismissed')) {
    showInstallBanner();
  }
});

window.addEventListener('appinstalled', () => {
  toast('🎉 FibroVida instalado! Acesse pela tela inicial.', 's');
  _deferredInstallPrompt = null;
  hideInstallBanner();
});

function showInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) {
    banner.style.display = 'flex';
    document.body.classList.add('has-install-banner');
  }
}

function hideInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) {
    banner.style.display = 'none';
    document.body.classList.remove('has-install-banner');
  }
}

function installPWA() {
  if (!_deferredInstallPrompt) {
    toast('Use o menu do navegador → "Adicionar à tela inicial"', 'i');
    return;
  }
  _deferredInstallPrompt.prompt();
  _deferredInstallPrompt.userChoice.then(result => {
    if (result.outcome === 'accepted') {
      toast('✅ Instalando FibroVida...', 's');
    }
    _deferredInstallPrompt = null;
    hideInstallBanner();
  });
}

function dismissInstallBanner() {
  localStorage.setItem('pwa-dismissed', '1');
  hideInstallBanner();
}

// ── INIT ─────────────────────────────────────────────────────
async function init() {
  checkPaymentSuccess(); // verifica retorno do Stripe
  applyDarkMode();
  showLoad();
  try {
    document.getElementById("task-date").value = todayISO();
    document.getElementById("health-edit-date").value = todayISO();
    initBodyLocations();

    const { data: { session } } = await db.auth.getSession();
    if (session?.user) {
      await afterLogin(session.user);
      // Suporte a atalhos do manifest (?tab=saude, ?tab=assistente…)
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (tabParam) {
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => showTab(tabParam), 300);
      }
    } else {
      showScreen("auth-screen");
    }

    db.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) afterLogin(session.user);
      else if (event === "SIGNED_OUT") showScreen("auth-screen");
    });
  } catch(e) {
    console.error("Init error:", e);
    showScreen("auth-screen");
  } finally { hideLoad(); }
}

document.addEventListener("DOMContentLoaded", init);

// ── BOTÃO DE PÂNICO ───────────────────────────────────────────

function saveEmergencyContacts() {
  const c = {
    name1:  document.getElementById("panic-name-1")?.value.trim()  || "",
    phone1: document.getElementById("panic-phone-1")?.value.trim() || "",
    name2:  document.getElementById("panic-name-2")?.value.trim()  || "",
    phone2: document.getElementById("panic-phone-2")?.value.trim() || "",
  };
  localStorage.setItem("fibro_emergency", JSON.stringify(c));
  toast("✅ Contatos de emergência salvos!", "s");
}

function loadEmergencyContacts() {
  try {
    const c = JSON.parse(localStorage.getItem("fibro_emergency") || "{}");
    if (document.getElementById("panic-name-1")) {
      document.getElementById("panic-name-1").value  = c.name1  || "";
      document.getElementById("panic-phone-1").value = c.phone1 || "";
      document.getElementById("panic-name-2").value  = c.name2  || "";
      document.getElementById("panic-phone-2").value = c.phone2 || "";
    }
    return c;
  } catch { return {}; }
}

function openPanicoModal() {
  const c = loadEmergencyContacts();
  const el = document.getElementById("panico-contatos");
  if (!el) return;

  const temContato = c.phone1 || c.phone2;
  if (!temContato) {
    el.innerHTML = `
      <div style="text-align:center;padding:12px">
        <div style="font-size:36px;margin-bottom:8px">📋</div>
        <p style="font-size:13px;color:var(--text-muted)">Nenhum contato cadastrado ainda.</p>
        <p style="font-size:12px;color:var(--text-muted);margin-top:6px">Vá em <strong>Configurações → Contatos de Emergência</strong> para cadastrar.</p>
        <button class="btn btn-primary" style="margin-top:14px;width:100%" onclick="closeModal('modal-panico');showTab('config')">Ir para Configurações</button>
      </div>`;
    openModal("modal-panico");
    return;
  }

  let html = "";
  if (c.phone1) {
    const num = c.phone1.replace(/\D/g, "");
    html += `
      <a href="tel:+55${num}" class="btn-emergencia">
        <div class="btn-emerg-icon">📞</div>
        <div class="btn-emerg-info">
          <div class="btn-emerg-nome">${c.name1 || "Contato 1"}</div>
          <div class="btn-emerg-fone">${c.phone1}</div>
        </div>
        <div class="btn-emerg-ligar">Ligar</div>
      </a>`;
  }
  if (c.phone2) {
    const num = c.phone2.replace(/\D/g, "");
    html += `
      <a href="tel:+55${num}" class="btn-emergencia" style="margin-top:10px">
        <div class="btn-emerg-icon">📞</div>
        <div class="btn-emerg-info">
          <div class="btn-emerg-nome">${c.name2 || "Contato 2"}</div>
          <div class="btn-emerg-fone">${c.phone2}</div>
        </div>
        <div class="btn-emerg-ligar">Ligar</div>
      </a>`;
  }
  el.innerHTML = html;
  openModal("modal-panico");
}

