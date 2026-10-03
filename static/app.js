     const HABITS = {
  atividade: { title: "Atividade Física", short: "Atividade", icon: "footprints", unit: "min", goal: 30, hint: "Movimento também conta. Registre os minutos ativos." },
  leitura: { title: "Leitura", short: "Leitura", icon: "book-open", unit: "páginas", goal: 20, hint: "Some as páginas lidas hoje, de qualquer livro." },
  estudos: { title: "Estudos", short: "Estudos", icon: "graduation-cap", unit: "min", goal: 60, hint: "Registre o tempo de estudo com atenção plena." },
  sono: { title: "Tempo de sono", short: "Sono", icon: "moon-star", unit: "h", goal: 8, hint: "Quantas horas você dormiu na última noite?" },
  alimentacao: { title: "Alimentação", short: "Alimentação", icon: "salad", unit: "porções", goal: 5, hint: "Registre uma porção equilibrada ao longo do dia." },
};
const COLORS = ["#59a6ff", "#7a8da7", "#3e83ca", "#8fc8f5", "#6579b8"];
const STORAGE_KEY = "ritmo.entries.v1";
const content = document.getElementById("page-content");
let currentPage = "dashboard";
let records = loadRecords();
let charts = [];
let databaseOnline = false;
let toastTimer;

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(date, amount) {
  const shifted = new Date(`${date}T12:00:00`);
  shifted.setDate(shifted.getDate() + amount);
  return localDate(shifted);
}

function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (error) {
    console.warn("Não foi possível ler os registros locais.", error);
  }
  const today = localDate();
  const samples = [];
  const amounts = { atividade: [32, 20, 40, 0, 28, 35, 0], leitura: [18, 24, 0, 30, 15, 22, 0], estudos: [60, 45, 75, 0, 55, 80, 0], sono: [7.5, 8, 7, 8.5, 6.5, 8, 0], alimentacao: [5, 4, 6, 0, 5, 4, 0] };
  Object.entries(amounts).forEach(([kind, values]) => values.forEach((value, index) => {
    if (value) samples.push({ id: `sample-${kind}-${index}`, kind, date: shiftDate(today, index - 6), value, note: "" });
  }));
  [
    [0, 42, "necessidade", "Mercado"], [-1, 18, "desejo", "Café"], [-2, 55, "investimento", "Tesouro Direto"],
    [-3, 26, "necessidade", "Transporte"], [-5, 32, "desejo", "Cinema"], [-7, 60, "investimento", "Fundo de reserva"],
    [-8, 84, "necessidade", "Farmácia"], [-10, 22, "desejo", "Almoço fora"], [-12, 35, "investimento", "Aporte mensal"],
    [-14, 47, "necessidade", "Mercado"], [-16, 16, "desejo", "Café"], [-19, 28, "necessidade", "Transporte"],
  ].forEach(([offset, value, category, description], index) => samples.push({ id: `sample-expense-${index}`, kind: "financeiro", date: shiftDate(today, offset), value, category, description, note: "" }));
  samples.forEach((sample) => { sample.demo = true; });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
  return samples;
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  document.getElementById("sync-status").innerHTML = databaseOnline
    ? '<span class="status-dot"></span>Sincronizado com MySQL'
    : `<span class="status-dot"></span>${records.some((entry) => entry.demo) ? "Dados de demonstração" : "Salvo neste dispositivo"}`;
}

function isDemoRecord(entry) {
  return entry.demo === true || String(entry.id).startsWith("sample-");
}

function isLocalRecord(entry) {
  return String(entry.id).startsWith("local-") && !isDemoRecord(entry);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

function money(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function dateLabel(value, options = { day: "2-digit", month: "short" }) {
  return new Intl.DateTimeFormat("pt-BR", options).format(new Date(`${value}T12:00:00`));
}

function currentWeek() {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => localDate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)));
}

function total(kind, start, end) {
  return records.filter((item) => item.kind === kind && item.date >= start && item.date <= end).reduce((sum, item) => sum + Number(item.value), 0);
}

function setPage(page) {
  currentPage = page;
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  document.getElementById("breadcrumb").textContent = page === "dashboard" ? "Dashboard" : page === "financeiro" ? "Financeiro" : HABITS[page].title;
  transitionToPage();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

// Slides the current content out before rendering the new page, which then fades/slides in via render().
function transitionToPage() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !content.children.length) {
    render();
    return;
  }
  content.classList.remove("page-enter");
  content.classList.add("page-exit");
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(fallback);
    content.removeEventListener("animationend", finish);
    content.classList.remove("page-exit");
    render();
  };
  const fallback = setTimeout(finish, 200);
  content.addEventListener("animationend", finish, { once: true });
}

function pageHeading(title, subtitle, eyebrow = "SEU PROGRESSO") {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="heading-sub">${subtitle}</p></div><div class="date-stamp"><i data-lucide="calendar-days"></i>${dateLabel(localDate(), { weekday: "long", day: "numeric", month: "long" })}</div></div>`;
}

function summaryCard(kind, today, week) {
  const habit = HABITS[kind];
  const todayTotal = total(kind, today, today);
  const weekTotal = week.reduce((sum, day) => sum + total(kind, day, day), 0);
  const progress = Math.min(100, Math.round(todayTotal / habit.goal * 100));
  return `<article class="summary-card"><div class="summary-top"><span class="summary-icon"><i data-lucide="${habit.icon}"></i></span><span class="card-arrow" role="button" tabindex="0" data-open-page="${kind}" title="Abrir ${habit.title}"><i data-lucide="arrow-up-right"></i></span></div><div class="summary-label">${habit.short}</div><div class="summary-value">${formatNumber(todayTotal)} <small>${habit.unit} hoje</small></div><div class="summary-progress"><span style="width:${progress}%"></span></div><div class="summary-meta"><strong>${formatNumber(weekTotal)} ${habit.unit}</strong> nesta semana</div></article>`;
}

function dashboardMarkup() {
  const today = localDate();
  const week = currentWeek();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const expenseMonth = monthExpenses(new Date().getFullYear(), new Date().getMonth());
  const spent = expenseMonth.reduce((sum, item) => sum + Number(item.value), 0);
  const todayRows = Object.entries(HABITS).map(([kind, habit]) => {
    const amount = total(kind, today, today);
    const percent = Math.min(100, Math.round(amount / habit.goal * 100));
    return `<div class="day-row"><div class="day-name"><span class="summary-icon"><i data-lucide="${habit.icon}"></i></span>${habit.short}</div><div class="day-progress"><span style="width:${percent}%"></span></div><div class="day-amount"><strong>${formatNumber(amount)}</strong> / ${habit.goal} ${habit.unit}</div></div>`;
  }).join("");
  const todayStamp = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date()).toLocaleUpperCase("pt-BR");
  return `${pageHeading(`${greeting}, João.`, "Um dia de cada vez. Veja como seus pequenos compromissos estão se somando.", todayStamp)}
    <section class="summary-grid">${Object.keys(HABITS).map((kind) => summaryCard(kind, today, week)).join("")}</section>
    <div class="section-heading"><h2>Seu ritmo nesta semana</h2><span>Segunda a domingo · metas diárias</span></div>
    <section class="dashboard-grid"><article class="panel"><div class="panel-head"><div><h2 class="panel-title">Progressão dos hábitos</h2><p class="panel-note">Consistência diária em relação às suas metas</p></div><span class="date-stamp"><i data-lucide="chart-no-axes-combined"></i>7 dias</span></div><div class="chart-wrap"><canvas id="habit-chart" aria-label="Gráfico da progressão semanal dos hábitos"></canvas></div><div class="legend-row">${Object.entries(HABITS).map(([kind, habit], index) => `<span class="legend-item"><i class="legend-swatch" style="background:${COLORS[index]}"></i>${habit.short}</span>`).join("")}</div></article>
    <article class="panel"><div class="panel-head"><div><h2 class="panel-title">Hoje, em perspectiva</h2><p class="panel-note">O que já entrou na sua rotina</p></div><span class="date-stamp"><i data-lucide="sun"></i>Hoje</span></div><div class="day-list">${todayRows}</div><div class="finance-insight"><i data-lucide="wallet"></i><span>Você lançou <strong>${money(total("financeiro", today, today))}</strong> em gastos hoje e <strong>${money(spent)}</strong> no mês.</span></div></article></section>
    <div class="section-heading"><h2>Finanças do mês</h2><span>${new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date())}</span></div>
    <section class="finance-panels"><article class="panel"><div class="panel-head"><div><h2 class="panel-title">Gastos por semana</h2><p class="panel-note">Cada barra reúne os lançamentos daquela semana</p></div><span class="date-stamp"><i data-lucide="trending-down"></i>${money(spent)}</span></div><div class="chart-wrap short"><canvas id="expense-chart" aria-label="Gráfico de gastos por semana"></canvas></div></article><article class="panel"><div class="panel-head"><div><h2 class="panel-title">Para onde vai seu dinheiro</h2><p class="panel-note">Distribuição por tipo de gasto</p></div></div><div class="chart-wrap pie"><canvas id="category-chart" aria-label="Gráfico de gastos por categoria"></canvas></div><div class="legend-row"><span class="legend-item"><i class="legend-swatch" style="background:#438de0"></i>Necessidades</span><span class="legend-item"><i class="legend-swatch" style="background:#8fc8f5"></i>Desejos</span><span class="legend-item"><i class="legend-swatch" style="background:#6579b8"></i>Investimentos</span></div></article></section>`;
}

function chartOptions(showPercent = false) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#252b34", padding: 10, titleFont: { family: "Inter", size: 10 }, bodyFont: { family: "Inter", size: 10 }, callbacks: showPercent ? { label: (context) => ` ${Math.round(context.parsed.y)}% da meta` } : {} } },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: "#a5afbd", font: { family: "Inter", size: 9 } } },
      y: { beginAtZero: true, border: { display: false }, grid: { color: "#2d333d", drawTicks: false }, ticks: { color: "#a5afbd", padding: 8, font: { family: "Inter", size: 9 }, callback: (value) => showPercent ? `${value}%` : money(value) } },
    },
  };
}

function destroyCharts() {
  charts.forEach((chart) => chart.destroy());
  charts = [];
}

function monthExpenses(year, month) {
  return records.filter((item) => {
    if (item.kind !== "financeiro") return false;
    const date = new Date(`${item.date}T12:00:00`);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

function drawDashboardCharts() {
  if (!window.Chart) return;
  const week = currentWeek();
  const habits = document.getElementById("habit-chart");
  if (habits) {
    charts.push(new Chart(habits, { type: "line", data: { labels: week.map((day) => dateLabel(day, { weekday: "short" })), datasets: Object.entries(HABITS).map(([kind, habit], index) => ({ label: habit.short, data: week.map((day) => Math.min(100, Math.round(total(kind, day, day) / habit.goal * 100))), borderColor: COLORS[index], backgroundColor: COLORS[index], borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, tension: .36 })) }, options: { ...chartOptions(true), interaction: { intersect: false, mode: "index" }, scales: { ...chartOptions(true).scales, y: { ...chartOptions(true).scales.y, max: 100, ticks: { ...chartOptions(true).scales.y.ticks, stepSize: 25 } } } } }));
  }
  const now = new Date();
  const expenses = monthExpenses(now.getFullYear(), now.getMonth());
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const buckets = [];
  for (let monday = new Date(first), index = 1; monday <= last; monday.setDate(monday.getDate() + 7), index += 1) {
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const start = localDate(new Date(Math.max(monday, new Date(now.getFullYear(), now.getMonth(), 1))));
    const end = localDate(new Date(Math.min(sunday, last)));
    buckets.push({ label: `Sem ${index}`, value: expenses.filter((item) => item.date >= start && item.date <= end).reduce((sum, item) => sum + Number(item.value), 0) });
  }
  const expenseCanvas = document.getElementById("expense-chart");
  if (expenseCanvas) charts.push(new Chart(expenseCanvas, { type: "bar", data: { labels: buckets.map((bucket) => bucket.label), datasets: [{ data: buckets.map((bucket) => bucket.value), backgroundColor: buckets.map((_, index) => index === buckets.length - 1 ? "#8fc8f5" : "#438de0"), hoverBackgroundColor: "#72b8ff", borderRadius: 4, maxBarThickness: 36 }] }, options: { ...chartOptions(), plugins: { ...chartOptions().plugins, tooltip: { ...chartOptions().plugins.tooltip, callbacks: { label: (context) => ` ${money(context.parsed.y)}` } } } } }));
  const categories = ["necessidade", "desejo", "investimento"];
  const categoryCanvas = document.getElementById("category-chart");
  if (categoryCanvas) charts.push(new Chart(categoryCanvas, { type: "doughnut", data: { labels: ["Necessidades", "Desejos", "Investimentos"], datasets: [{ data: categories.map((category) => expenses.filter((item) => item.category === category).reduce((sum, item) => sum + Number(item.value), 0)), backgroundColor: ["#438de0", "#8fc8f5", "#6579b8"], borderColor: "#191c22", borderWidth: 3, hoverOffset: 5 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: false }, tooltip: { backgroundColor: "#252b34", padding: 10, callbacks: { label: (context) => ` ${context.label}: ${money(context.parsed)}` } } } } }));
}

function habitForm(kind) {
  const habit = HABITS[kind];
  return `<form class="record-form" data-record-kind="${kind}"><div class="form-row"><div class="field"><label for="amount">Quantidade (${habit.unit})</label><input id="amount" name="value" type="number" min="0.1" max="${kind === "sono" ? "24" : "10000"}" step="0.1" placeholder="Ex.: ${habit.goal}" required></div><div class="field"><label for="entry-date">Data</label><input id="entry-date" name="date" type="date" value="${localDate()}" required></div></div><div class="field"><label for="note">Anotação <span class="field-hint">(opcional)</span></label><textarea id="note" name="note" maxlength="500" placeholder="O que você gostaria de lembrar?"></textarea></div><button class="primary-button" type="submit"><i data-lucide="plus"></i>Registrar ${habit.short.toLowerCase()}</button></form>`;
}

function financialForm() {
  return `<form class="record-form" data-record-kind="financeiro"><div class="field"><label for="description">O que foi?</label><input id="description" name="description" maxlength="120" placeholder="Ex.: conta de luz, almoço, aporte" required></div><div class="form-row"><div class="field"><label for="amount">Valor (R$)</label><input id="amount" name="value" type="number" min="0.01" step="0.01" placeholder="0,00" required></div><div class="field"><label for="category">Tipo de gasto</label><select id="category" name="category" required><option value="necessidade">Necessidade</option><option value="desejo">Desejo</option><option value="investimento">Investimento</option></select></div></div><div class="field"><label for="entry-date">Data</label><input id="entry-date" name="date" type="date" value="${localDate()}" required></div><div class="field"><label for="note">Anotação <span class="field-hint">(opcional)</span></label><textarea id="note" name="note" maxlength="500" placeholder="Detalhes para você"></textarea></div><button class="primary-button" type="submit"><i data-lucide="plus"></i>Adicionar lançamento</button></form>`;
}

function historyMarkup(kind) {
  const entries = records.filter((entry) => entry.kind === kind).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  if (!entries.length) return '<p class="empty-note">Nenhum registro por aqui ainda. Seu próximo passo começa agora.</p>';
  return entries.map((entry) => {
    const title = kind === "financeiro" ? entry.description || "Gasto" : entry.note || HABITS[kind].title;
    const amount = kind === "financeiro" ? money(entry.value) : `${formatNumber(entry.value)} ${HABITS[kind].unit}`;
    const detail = kind === "financeiro" ? `${dateLabel(entry.date)} · ${entry.category || ""}` : dateLabel(entry.date);
    return `<div class="history-item"><div class="history-info"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div><div class="history-side"><span class="history-value">${amount}</span><button class="delete-button" type="button" data-delete-id="${escapeHtml(entry.id)}" data-delete-kind="${kind}" aria-label="Excluir registro" title="Excluir"><i data-lucide="trash-2"></i></button></div></div>`;
  }).join("");
}

function detailMarkup(kind) {
  const finance = kind === "financeiro";
  const habit = HABITS[kind];
  const today = localDate();
  const week = currentWeek();
  const title = finance ? "Financeiro" : habit.title;
  const goal = finance ? "Uma visão mais clara do seu dinheiro começa com cada lançamento." : habit.hint;
  const todayValue = finance ? total("financeiro", today, today) : total(kind, today, today);
  const weekValue = week.reduce((sum, day) => sum + (finance ? total("financeiro", day, day) : total(kind, day, day)), 0);
  const monthEntries = monthExpenses(new Date().getFullYear(), new Date().getMonth());
  const monthTotal = monthEntries.reduce((sum, item) => sum + Number(item.value), 0);
  const unit = finance ? "R$" : habit.unit;
  return `${pageHeading(title, finance ? "Acompanhe seus gastos com clareza e intenção." : "Construa constância no seu próprio ritmo.")}
    <section class="detail-layout"><div class="detail-main"><article class="goal-banner"><div class="goal-mark"><i data-lucide="${finance ? "wallet" : habit.icon}"></i></div><div class="goal-copy"><p class="eyebrow">${finance ? "CONSCIÊNCIA FINANCEIRA" : "SEU COMPROMISSO"}</p><h2>${finance ? "Cada escolha conta." : `Meta diária: ${habit.goal} ${habit.unit}`}</h2><p>${goal}</p></div></article>
    <div class="stat-strip"><div class="stat-cell"><span>Hoje</span><strong>${finance ? money(todayValue) : `${formatNumber(todayValue)} ${unit}`}</strong></div><div class="stat-cell"><span>Esta semana</span><strong>${finance ? money(weekValue) : `${formatNumber(weekValue)} ${unit}`}</strong></div><div class="stat-cell"><span>${finance ? "Total do mês" : "Meta semanal"}</span><strong>${finance ? money(monthTotal) : `${formatNumber(habit.goal * 7)} ${unit}`}</strong></div></div>
    <article class="panel record-panel"><h2>${finance ? "Novo lançamento" : "Registrar atividade"}</h2>${finance ? financialForm() : habitForm(kind)}</article>
    <article class="panel history-panel"><div class="panel-head"><div><h2>Registros recentes</h2><p class="panel-note">Últimos 12 lançamentos</p></div></div><div class="history-list">${historyMarkup(kind)}</div></article></div>
    <aside class="detail-aside">${finance ? `<article class="panel"><div class="panel-head"><div><h2 class="panel-title">Gastos por semana</h2><p class="panel-note">Mês atual</p></div></div><div class="chart-wrap short"><canvas id="detail-expense-chart"></canvas></div></article><article class="panel"><div class="panel-head"><div><h2 class="panel-title">Divisão dos gastos</h2><p class="panel-note">Por categoria · mês atual</p></div></div><div class="chart-wrap pie"><canvas id="detail-category-chart"></canvas></div><div class="legend-row"><span class="legend-item">Necessidades</span><span class="legend-item">Desejos</span><span class="legend-item">Investimentos</span></div></article>` : `<article class="panel"><div class="panel-head"><div><h2 class="panel-title">Seu ritmo na semana</h2><p class="panel-note">${habit.short} · ${habit.goal} ${habit.unit} por dia</p></div></div><div class="chart-wrap short"><canvas id="detail-habit-chart"></canvas></div><div class="finance-insight"><i data-lucide="sparkles"></i><span>Progresso não é perfeição. Cada registro faz parte da jornada.</span></div></article>`}</aside></section>`;
}

function drawDetailChart(kind) {
  if (!window.Chart) return;
  const week = currentWeek();
  if (kind === "financeiro") {
    drawSingleFinanceCharts("detail-expense-chart", "detail-category-chart");
    return;
  }
  const canvas = document.getElementById("detail-habit-chart");
  if (!canvas) return;
  const habit = HABITS[kind];
  charts.push(new Chart(canvas, { type: "bar", data: { labels: week.map((day) => dateLabel(day, { weekday: "short" })), datasets: [{ data: week.map((day) => total(kind, day, day)), backgroundColor: week.map((_, index) => index === 6 ? "#8fc8f5" : COLORS[Object.keys(HABITS).indexOf(kind)]), borderRadius: 4, maxBarThickness: 34 }] }, options: { ...chartOptions(), scales: { ...chartOptions().scales, y: { ...chartOptions().scales.y, suggestedMax: habit.goal * 1.3, ticks: { ...chartOptions().scales.y.ticks, callback: (value) => `${value} ${habit.unit}` } } } } }));
}

function drawSingleFinanceCharts(barId, pieId) {
  if (!window.Chart) return;
  const now = new Date();
  const expenses = monthExpenses(now.getFullYear(), now.getMonth());
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const buckets = [];
  for (let monday = new Date(first), index = 1; monday <= last; monday.setDate(monday.getDate() + 7), index += 1) {
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const start = localDate(new Date(Math.max(monday, new Date(now.getFullYear(), now.getMonth(), 1))));
    const end = localDate(new Date(Math.min(sunday, last)));
    buckets.push({ label: `Sem ${index}`, value: expenses.filter((item) => item.date >= start && item.date <= end).reduce((sum, item) => sum + Number(item.value), 0) });
  }
  const bar = document.getElementById(barId);
  if (bar) charts.push(new Chart(bar, { type: "bar", data: { labels: buckets.map((bucket) => bucket.label), datasets: [{ data: buckets.map((bucket) => bucket.value), backgroundColor: "#438de0", hoverBackgroundColor: "#72b8ff", borderRadius: 4, maxBarThickness: 36 }] }, options: chartOptions() }));
  const pie = document.getElementById(pieId);
  if (pie) charts.push(new Chart(pie, { type: "doughnut", data: { labels: ["Necessidades", "Desejos", "Investimentos"], datasets: [{ data: ["necessidade", "desejo", "investimento"].map((category) => expenses.filter((item) => item.category === category).reduce((sum, item) => sum + Number(item.value), 0)), backgroundColor: ["#438de0", "#8fc8f5", "#6579b8"], borderColor: "#191c22", borderWidth: 3, hoverOffset: 5 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: false }, tooltip: { backgroundColor: "#252b34", padding: 10, callbacks: { label: (context) => ` ${context.label}: ${money(context.parsed)}` } } } } }));
}

function render() {
  destroyCharts();
  content.innerHTML = currentPage === "dashboard" ? dashboardMarkup() : detailMarkup(currentPage);
  if (window.lucide) window.lucide.createIcons();
  if (currentPage === "dashboard") drawDashboardCharts();
  else drawDetailChart(currentPage);
  content.classList.remove("page-enter", "page-exit");
  void content.offsetWidth;
  content.classList.add("page-enter");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

async function submitRecord(form) {
  const data = new FormData(form);
  const kind = form.dataset.recordKind;
  const entry = { id: `local-${Date.now()}`, kind, date: data.get("date"), value: Number(data.get("value")), note: data.get("note") || "" };
  if (kind === "financeiro") {
    entry.category = data.get("category");
    entry.description = data.get("description");
  }
  if (databaseOnline) {
    try {
      const response = await fetch("/api/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...entry, date: entry.date }) });
      if (!response.ok) throw new Error("API indisponível");
      const result = await response.json();
      entry.id = result.id;
    } catch (error) {
      databaseOnline = false;
      showToast("Banco indisponível. Registro salvo neste dispositivo.");
    }
  }
  records.push(entry);
  saveRecords();
  render();
  showToast("Registro adicionado. Um passo de cada vez.");
}

async function removeRecord(id, kind) {
  const entry = records.find((item) => String(item.id) === String(id));
  if (!entry) return;
  if (databaseOnline && !String(id).startsWith("local-") && !String(id).startsWith("sample-")) {
    try {
      const response = await fetch(`/api/entries/${kind}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("API indisponível");
    } catch (error) {
      showToast("Não foi possível remover do banco de dados.");
      return;
    }
  }
  records = records.filter((item) => String(item.id) !== String(id));
  saveRecords();
  render();
  showToast("Registro removido.");
}

async function syncFromDatabase() {
  try {
    const health = await fetch("/api/health");
    if (!health.ok) return;
    const start = "1970-01-01";
    const end = "2099-12-31";
    const localEntries = records.filter(isLocalRecord);
    for (const entry of localEntries) {
      const payload = {
        kind: entry.kind,
        date: entry.date,
        value: entry.value,
        note: entry.note || "",
        category: entry.category,
        description: entry.description,
      };
      const importResponse = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!importResponse.ok) throw new Error("Não foi possível importar os registros locais.");
      const imported = await importResponse.json();
      entry.id = imported.id;
      saveRecords();
    }
    const response = await fetch(`/api/entries?start=${start}&end=${end}`);
    if (!response.ok) throw new Error("Não foi possível carregar os registros do MySQL.");
    const serverEntries = await response.json();
    records = serverEntries.map((entry) => ({ id: entry.id, kind: entry.kind, date: entry.entry_date, value: Number(entry.value), note: entry.note || "", category: entry.category, description: entry.description }));
    databaseOnline = true;
    saveRecords();
    render();
  } catch (error) {
    databaseOnline = false;
  }
}

document.getElementById("navigation").addEventListener("click", (event) => {
  const button = event.target.closest("[data-page]");
  if (button) setPage(button.dataset.page);
});
content.addEventListener("click", (event) => {
  const open = event.target.closest("[data-open-page]");
  if (open) setPage(open.dataset.openPage);
  const remove = event.target.closest("[data-delete-id]");
  if (remove) removeRecord(remove.dataset.deleteId, remove.dataset.deleteKind);
});
content.addEventListener("submit", (event) => {
  if (event.target.matches("[data-record-kind]")) {
    event.preventDefault();
    submitRecord(event.target);
  }
});

document.getElementById("today-label").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" }).format(new Date());
saveRecords();
render();
syncFromDatabase();