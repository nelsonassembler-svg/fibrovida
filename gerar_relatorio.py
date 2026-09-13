from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                 TableStyle, HRFlowable, KeepTogether)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

OUTPUT = r"C:\Users\nelso\OneDrive\Área de Trabalho Not Atual 2025\Copilot\FibroVida\Relatorio-Executivo-FibroVida.pdf"

ROXO       = colors.HexColor("#7B5EA7")
ROXO_CLARO = colors.HexColor("#F3EEF9")
ROXO_MED   = colors.HexColor("#9b6ddf")
VERDE      = colors.HexColor("#4CAF50")
CINZA_BG   = colors.HexColor("#F8F8F8")
CINZA_LIN  = colors.HexColor("#E0E0E0")
BRANCO     = colors.white
PRETO      = colors.HexColor("#1a1a1a")
CINZA_TXT  = colors.HexColor("#555555")

doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2.2*cm, bottomMargin=2*cm
)

styles = getSampleStyleSheet()

s_title = ParagraphStyle("titulo", fontName="Helvetica-Bold", fontSize=22,
                          textColor=BRANCO, alignment=TA_CENTER, leading=28)
s_sub   = ParagraphStyle("sub",   fontName="Helvetica",      fontSize=12,
                          textColor=colors.HexColor("#ddd0f5"), alignment=TA_CENTER, leading=16)
s_dev   = ParagraphStyle("dev",   fontName="Helvetica",      fontSize=10,
                          textColor=colors.HexColor("#c9aaff"), alignment=TA_CENTER, leading=14)

s_h1  = ParagraphStyle("h1",  fontName="Helvetica-Bold", fontSize=13,
                         textColor=ROXO, spaceBefore=14, spaceAfter=6)
s_h2  = ParagraphStyle("h2",  fontName="Helvetica-Bold", fontSize=11,
                         textColor=PRETO, spaceBefore=8, spaceAfter=4)
s_body= ParagraphStyle("body",fontName="Helvetica",      fontSize=10,
                         textColor=CINZA_TXT, leading=15, spaceAfter=4)
s_ok  = ParagraphStyle("ok",  fontName="Helvetica",      fontSize=10,
                         textColor=colors.HexColor("#2e7d32"), leading=15)
s_cta = ParagraphStyle("cta", fontName="Helvetica-Bold", fontSize=11,
                         textColor=ROXO, alignment=TA_CENTER, spaceBefore=6, spaceAfter=6)
s_foot= ParagraphStyle("foot",fontName="Helvetica",      fontSize=8,
                         textColor=colors.HexColor("#999"), alignment=TA_CENTER)

TBL_HEADER = TableStyle([
    ("BACKGROUND",   (0,0), (-1,0), ROXO),
    ("TEXTCOLOR",    (0,0), (-1,0), BRANCO),
    ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE",     (0,0), (-1,0), 9),
    ("ALIGN",        (0,0), (-1,-1), "LEFT"),
    ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
    ("ROWBACKGROUNDS",(0,1),(-1,-1), [BRANCO, ROXO_CLARO]),
    ("FONTSIZE",     (0,1), (-1,-1), 9),
    ("FONTNAME",     (0,1), (-1,-1), "Helvetica"),
    ("GRID",         (0,0), (-1,-1), 0.4, CINZA_LIN),
    ("TOPPADDING",   (0,0), (-1,-1), 5),
    ("BOTTOMPADDING",(0,0), (-1,-1), 5),
    ("LEFTPADDING",  (0,0), (-1,-1), 6),
])

TBL_TOTAL = TableStyle([
    ("BACKGROUND",   (0,0), (-1,0), ROXO),
    ("TEXTCOLOR",    (0,0), (-1,0), BRANCO),
    ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE",     (0,0), (-1,0), 9),
    ("ALIGN",        (0,0), (-1,-1), "LEFT"),
    ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
    ("ROWBACKGROUNDS",(0,1),(-1,-1), [BRANCO, ROXO_CLARO]),
    ("FONTSIZE",     (0,1), (-1,-1), 9),
    ("FONTNAME",     (0,1), (-1,-1), "Helvetica"),
    ("GRID",         (0,0), (-1,-1), 0.4, CINZA_LIN),
    ("TOPPADDING",   (0,0), (-1,-1), 5),
    ("BOTTOMPADDING",(0,0), (-1,-1), 5),
    ("LEFTPADDING",  (0,0), (-1,-1), 6),
    ("BACKGROUND",   (0,-1), (-1,-1), colors.HexColor("#4a2d6e")),
    ("TEXTCOLOR",    (0,-1), (-1,-1), BRANCO),
    ("FONTNAME",     (0,-1), (-1,-1), "Helvetica-Bold"),
])

W = A4[0] - 4*cm  # largura util

story = []

# ── CABEÇALHO ────────────────────────────────────────────────────
header_data = [[
    Paragraph("💜 FibroVida", s_title),
]]
header_tbl = Table([[
    Paragraph("💜 FibroVida", s_title),
]], colWidths=[W])
header_tbl.setStyle(TableStyle([
    ("BACKGROUND",  (0,0), (-1,-1), ROXO),
    ("TOPPADDING",  (0,0), (-1,-1), 22),
    ("BOTTOMPADDING",(0,0),(-1,-1), 8),
    ("LEFTPADDING", (0,0), (-1,-1), 12),
    ("RIGHTPADDING",(0,0), (-1,-1), 12),
    ("ROUNDEDCORNERS", [8]),
]))
story.append(header_tbl)
story.append(Spacer(1, 4))

sub_tbl = Table([[
    Paragraph("Relatorio Executivo de Desenvolvimento", s_sub),
], [
    Paragraph("Diario da Dor e Bem-Estar  |  maio-junho 2026", s_sub),
], [
    Paragraph("Desenvolvedor: Nelson Tomaz Catunda Magalhaes", s_dev),
]], colWidths=[W])
sub_tbl.setStyle(TableStyle([
    ("BACKGROUND",   (0,0), (-1,-1), colors.HexColor("#4a2d6e")),
    ("TOPPADDING",   (0,0), (-1,-1), 5),
    ("BOTTOMPADDING",(0,0), (-1,-1), 5),
    ("LEFTPADDING",  (0,0), (-1,-1), 12),
    ("ROUNDEDCORNERS", [8]),
]))
story.append(sub_tbl)
story.append(Spacer(1, 16))

# ── RESUMO RÁPIDO ────────────────────────────────────────────────
resumo = Table([[
    Paragraph("<b>43</b><br/>commits", ParagraphStyle("rc", fontName="Helvetica-Bold", fontSize=14, textColor=ROXO, alignment=TA_CENTER, leading=18)),
    Paragraph("<b>35</b><br/>dias calendario", ParagraphStyle("rc", fontName="Helvetica-Bold", fontSize=14, textColor=ROXO, alignment=TA_CENTER, leading=18)),
    Paragraph("<b>11</b><br/>dias ativos", ParagraphStyle("rc", fontName="Helvetica-Bold", fontSize=14, textColor=ROXO, alignment=TA_CENTER, leading=18)),
    Paragraph("<b>59h</b><br/>estimadas", ParagraphStyle("rc", fontName="Helvetica-Bold", fontSize=14, textColor=ROXO, alignment=TA_CENTER, leading=18)),
    Paragraph("<b>22</b><br/>funcionalidades", ParagraphStyle("rc", fontName="Helvetica-Bold", fontSize=14, textColor=ROXO, alignment=TA_CENTER, leading=18)),
]], colWidths=[W/5]*5)
resumo.setStyle(TableStyle([
    ("BACKGROUND",   (0,0), (-1,-1), ROXO_CLARO),
    ("GRID",         (0,0), (-1,-1), 0.5, ROXO_MED),
    ("TOPPADDING",   (0,0), (-1,-1), 10),
    ("BOTTOMPADDING",(0,0), (-1,-1), 10),
    ("ALIGN",        (0,0), (-1,-1), "CENTER"),
    ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
    ("ROUNDEDCORNERS", [6]),
]))
story.append(resumo)
story.append(Spacer(1, 16))

# ── SEÇÃO 1 — LINHA DO TEMPO ─────────────────────────────────────
story.append(HRFlowable(width=W, thickness=2, color=ROXO))
story.append(Paragraph("1. Linha do Tempo de Desenvolvimento", s_h1))

timeline_data = [
    ["Data", "Fase", "Principais Entregas"],
    ["15/05/2026", "v1.0 - Lancamento", "Auth Supabase, diario de dor, medicamentos, tarefas,\nterapias, profissionais, receitas, relatorios, PWA"],
    ["18/05/2026", "Painel Admin", "Gerenciamento de usuarios, estatisticas em tempo real,\nativacao de planos premium"],
    ["21/05/2026", "Marketing", "8 cards prontos para Instagram com legendas e hashtags"],
    ["25/05/2026", "Monetizacao", "Integracao Stripe: 3 planos (R$9,90/mes · R$79,90/ano\n· R$149,90 vitalicio), webhook automatico"],
    ["26/05/2026", "FibroVida 2.0", "Indice FibroVida, Dashboard emocional, Historico de\nCrises, FibroAssistente IA, Gamificacao, login glass morphism"],
    ["27/05/2026", "Refinamentos", "Controle de estoque diario, relatorio PDF de medicamentos,\nnotas de sessao de terapia, bloco de notas"],
    ["06/06/2026", "Conteudo", "Secao educativa sobre fibromialgia, infograficos coloridos,\nsuporte a moeda pt-BR"],
    ["10/06/2026", "Play Store Prep", "Icones PNG, screenshots, manifest PWABuilder,\nassetlinks.json com SHA-256 real"],
    ["14/06/2026", "Novas Features", "Botao de Panico, Medicoes (pressao/glicemia/peso),\nalertas com 'Tomei', banner conscientizacao, artigo destaque"],
    ["16/06/2026", "Play Store Assets", "Politica de Privacidade, Feature Graphic 1024x500,\ntextos de listagem, screenshot mockup de celular"],
    ["19/06/2026", "Finalizacao", "Melodia exclusiva FibroVida, scheduler preciso com\nsetTimeout, botao de teste de alerta visivel"],
]

tl_tbl = Table(timeline_data, colWidths=[2.2*cm, 3.2*cm, W-5.4*cm])
tl_tbl.setStyle(TBL_HEADER)
story.append(tl_tbl)
story.append(Spacer(1, 16))

# ── SEÇÃO 2 — HORAS ──────────────────────────────────────────────
story.append(HRFlowable(width=W, thickness=2, color=ROXO))
story.append(Paragraph("2. Estimativa de Horas por Sessao", s_h1))

horas_data = [
    ["Data", "Descricao da Sessao", "Horas"],
    ["15/05", "Construcao da versao inicial completa", "8h"],
    ["18/05", "Painel administrativo e correcoes", "3h"],
    ["21/05", "Cards Instagram e marketing", "2h"],
    ["25/05", "Integracao Stripe e pagamentos", "5h"],
    ["26/05", "FibroVida 2.0 — grande sprint de features", "10h"],
    ["27/05", "Correcoes, estoque diario, notas de terapia", "7h"],
    ["06/06", "Conteudo educativo e design de infograficos", "4h"],
    ["10/06", "Preparacao completa para Google Play Store", "4h"],
    ["14/06", "Botao de Panico, Medicoes, alertas de medicamento", "7h"],
    ["16/06", "Assets Play Store, correcao de alertas", "5h"],
    ["19/06", "Som exclusivo, scheduler reescrito, testes", "4h"],
    ["TOTAL", "", "~59 horas"],
]

h_tbl = Table(horas_data, colWidths=[1.8*cm, W-4*cm, 2.2*cm])
h_tbl.setStyle(TBL_TOTAL)
story.append(h_tbl)
story.append(Spacer(1, 16))

# ── SEÇÃO 3 — FUNCIONALIDADES ────────────────────────────────────
story.append(HRFlowable(width=W, thickness=2, color=ROXO))
story.append(Paragraph("3. Funcionalidades Entregues", s_h1))

features = [
    "Autenticacao completa (login, cadastro, recuperacao de senha, aceite LGPD)",
    "Diario de dor diario com escala 0-10 e mapa corporal por regiao",
    "Controle de medicamentos com alertas por horario e estoque automatico",
    "Botao de Panico com ate 2 contatos de emergencia (ligacao 1 clique)",
    "Medicoes de saude: pressao arterial (SIS/DIA/Pulso), glicemia, peso, circunferencia",
    "Tarefas diarias organizadas por periodo (manha/tarde/noite)",
    "Registro de tratamentos e profissionais de saude (medicos/terapeutas)",
    "Banco de receitas anti-inflamatorias com filtros por refeicao",
    "Registro de bem-estar, sono, humor, energia e fatiga",
    "FibroAssistente com dicas de IA personalizadas",
    "Gamificacao com sistema de conquistas e pontuacao",
    "Relatorio PDF completo para compartilhar com o medico",
    "Painel administrativo com gerenciamento de usuarios e estatisticas",
    "3 planos de assinatura via Stripe (Mensal / Anual / Vitalicio)",
    "Webhook Stripe para ativacao automatica de premium apos pagamento",
    "PWA instalavel na tela inicial (iOS e Android) com Service Worker",
    "Artigo de conscientizacao sobre fibromialgia em destaque no dashboard",
    "Cards de marketing prontos para Instagram e Facebook",
    "Politica de Privacidade publica (LGPD) com URL no Play Store",
    "Assets completos para Google Play Store (Feature Graphic, textos, screenshots)",
    "Melodia sonora exclusiva FibroVida (arpejo Fa maior + sino final)",
    "Service Worker v3.5 com atualizacao automatica e cache inteligente",
]

feat_data = [[Paragraph("  " + f, s_ok)] for f in features]
feat_rows = [["  Funcionalidade"]] + [[Paragraph("  [✓]  " + f, s_ok)] for f in features]

feat_tbl = Table(feat_rows, colWidths=[W])
feat_tbl.setStyle(TableStyle([
    ("BACKGROUND",   (0,0), (-1,0), ROXO),
    ("TEXTCOLOR",    (0,0), (-1,0), BRANCO),
    ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE",     (0,0), (-1,0), 9),
    ("ROWBACKGROUNDS",(0,1),(-1,-1), [BRANCO, colors.HexColor("#f0faf0")]),
    ("FONTSIZE",     (0,1), (-1,-1), 9),
    ("GRID",         (0,0), (-1,-1), 0.3, CINZA_LIN),
    ("TOPPADDING",   (0,0), (-1,-1), 4),
    ("BOTTOMPADDING",(0,0), (-1,-1), 4),
    ("LEFTPADDING",  (0,0), (-1,-1), 8),
]))
story.append(feat_tbl)
story.append(Spacer(1, 16))

# ── SEÇÃO 4 — CUSTOS ─────────────────────────────────────────────
story.append(HRFlowable(width=W, thickness=2, color=ROXO))
story.append(Paragraph("4. Infraestrutura e Custos", s_h1))

story.append(Paragraph("Tecnologias Utilizadas", s_h2))
tech_data = [
    ["Camada", "Tecnologia", "Detalhes"],
    ["Frontend", "HTML5 / CSS3 / JavaScript puro", "PWA — Progressive Web App, sem frameworks"],
    ["Backend", "Supabase", "PostgreSQL + Auth + Storage + Row Level Security"],
    ["Pagamentos", "Stripe (Live Mode)", "Payment Links + Webhook automatizado"],
    ["Hospedagem", "GitHub Pages", "Deploy automatico via git push"],
    ["Play Store", "PWABuilder + TWA", "Trusted Web Activity — AAB nativo gerado"],
]
t_tbl = Table(tech_data, colWidths=[2.8*cm, 4.5*cm, W-7.3*cm])
t_tbl.setStyle(TBL_HEADER)
story.append(t_tbl)
story.append(Spacer(1, 10))

story.append(Paragraph("Custos de Servicos e Infraestrutura", s_h2))
custo_data = [
    ["Servico", "Plano", "Custo"],
    ["GitHub Pages", "Gratuito", "R$ 0,00"],
    ["Supabase", "Free Tier (50MB DB, 500MB storage)", "R$ 0,00"],
    ["PWABuilder", "Gratuito", "R$ 0,00"],
    ["Google Play Developer", "Taxa unica (US$ 25)", "R$ 137,50"],
    ["Stripe", "Por transacao (3,7% + R$0,39)", "R$ 0,00 ate 1a venda"],
    ["Claude Code / IA (aprox. 2 meses)", "Estimativa de assinatura", "R$ 300,00 - R$ 600,00"],
    ["TOTAL INVESTIDO", "", "R$ 437,50 - R$ 737,50"],
]
c_tbl = Table(custo_data, colWidths=[4.5*cm, W-7.5*cm, 3*cm])
c_tbl.setStyle(TBL_TOTAL)
story.append(c_tbl)
story.append(Spacer(1, 10))

story.append(Paragraph("Valor de Mercado do Desenvolvimento", s_h2))
valor_data = [
    ["Modalidade", "Taxa", "Valor Total (~59h)"],
    ["Desenvolvedor Junior (Brasil)", "R$ 80/hora", "R$ 4.720,00"],
    ["Desenvolvedor Pleno (Brasil)", "R$ 150/hora", "R$ 8.850,00"],
    ["Desenvolvedor Senior (Brasil)", "R$ 250/hora", "R$ 14.750,00"],
    ["Freelancer Internacional", "US$ 50/hora", "aprox. R$ 16.500,00"],
    ["CUSTO REAL COM IA (economia de +95%)", "", "R$ 437,50 - R$ 737,50"],
]
v_tbl = Table(valor_data, colWidths=[5.5*cm, 3*cm, W-8.5*cm])
v_tbl.setStyle(TBL_TOTAL)
story.append(v_tbl)
story.append(Spacer(1, 16))

# ── SEÇÃO 5 — CONCLUSÃO ──────────────────────────────────────────
story.append(HRFlowable(width=W, thickness=2, color=ROXO))
story.append(Paragraph("5. Conclusao", s_h1))

conclusao = Table([[Paragraph(
    "O <b>FibroVida</b> foi desenvolvido em <b>35 dias corridos</b>, com <b>11 dias ativos</b> "
    "de desenvolvimento e aproximadamente <b>59 horas</b> de trabalho colaborativo entre o "
    "desenvolvedor <b>Nelson Tomaz Catunda Magalhaes</b> e inteligencia artificial "
    "(Claude Code — Anthropic).<br/><br/>"
    "O custo total real do projeto ficou entre <b>R$ 437,50 e R$ 737,50</b> — representando "
    "uma economia de mais de <b>95%</b> em relacao ao custo de mercado para um sistema com "
    "este nivel de complexidade (estimado entre R$ 8.850 e R$ 16.500).<br/><br/>"
    "O aplicativo esta na fase de <b>testes fechados no Google Play Store</b> "
    "(14 testadores ativos) e pronto para publicacao em producao apos 14 dias de teste.",
    ParagraphStyle("concl", fontName="Helvetica", fontSize=10, textColor=PRETO,
                   leading=16, spaceAfter=0))
]], colWidths=[W])
conclusao.setStyle(TableStyle([
    ("BACKGROUND",   (0,0), (-1,-1), ROXO_CLARO),
    ("TOPPADDING",   (0,0), (-1,-1), 14),
    ("BOTTOMPADDING",(0,0), (-1,-1), 14),
    ("LEFTPADDING",  (0,0), (-1,-1), 14),
    ("RIGHTPADDING", (0,0), (-1,-1), 14),
    ("BOX",          (0,0), (-1,-1), 1.5, ROXO),
    ("ROUNDEDCORNERS", [8]),
]))
story.append(conclusao)
story.append(Spacer(1, 20))

# ── RODAPÉ ───────────────────────────────────────────────────────
story.append(HRFlowable(width=W, thickness=0.5, color=CINZA_LIN))
story.append(Spacer(1, 6))
story.append(Paragraph(
    "FibroVida — Diario da Dor e Bem-Estar  |  nelsontcmagalhaes@gmail.com  |  "
    "github.com/nelsonassembler-svg/fibrovida  |  Relatorio gerado em 19/06/2026",
    s_foot))

doc.build(story)
print("PDF gerado com sucesso:", OUTPUT)
