const state = {
  data: [],
  filtered: [],
  page: 1,
  pageSize: 8,
};

const demoData = [
  { cnpj: "12.345.678/0001-10", cliente: "Cliente Construtora Delta", contrato: "C-1003", nomeObra: "Condomínio Horizonte", volume: 20, ultimaRemessa: "2026-01-02" },
  { cnpj: "23.456.789/0001-11", cliente: "Cliente Pedra Forte", contrato: "C-1002", nomeObra: "Edifício Atlântico", volume: 7, ultimaRemessa: "2026-01-07" },
  { cnpj: "34.567.890/0001-12", cliente: "Cliente Areia Azul", contrato: "C-1001", nomeObra: "Residencial Aquarela", volume: 12, ultimaRemessa: "2026-01-11" },
];

const el = {
  fileInput: document.getElementById("fileInput"),
  uploadBtn: document.getElementById("uploadBtn"),
  demoBtn: document.getElementById("demoBtn"),
  clearBtn: document.getElementById("clearBtn"),
  yearFilter: document.getElementById("yearFilter"),
  monthFilter: document.getElementById("monthFilter"),
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  statusText: document.getElementById("statusText"),
  chart: document.getElementById("chart"),
  tableBody: document.getElementById("tableBody"),
  tableMeta: document.getElementById("tableMeta"),
};

function daysWithoutShipment(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(date);
  last.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today - last) / 86400000));
}

function statusFromDays(days) {
  if (days <= 7) return "ok";
  if (days <= 14) return "warn";
  if (days <= 21) return "alert";
  return "critical";
}

function statusLabel(status) {
  return {
    ok: "OK",
    warn: "Atenção",
    alert: "Atenção grave",
    critical: "Plano de ação",
  }[status];
}

function monthKey(dateString) {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function updateFilters() {
  const years = [...new Set(state.data.map((item) => new Date(item.ultimaRemessa).getFullYear()))].sort();
  el.yearFilter.innerHTML = `<option value="all">Ano: todos</option>${years.map((y) => `<option value="${y}">${y}</option>`).join("")}`;

  const months = [...Array(12)].map((_, index) => ({ value: index + 1, label: `Mês ${index + 1}` }));
  el.monthFilter.innerHTML = `<option value="all">Mês: todos</option>${months.map((m) => `<option value="${m.value}">${m.label}</option>`).join("")}`;
}

function applyFilters() {
  const year = el.yearFilter.value;
  const month = el.monthFilter.value;
  const start = el.startDate.value ? new Date(el.startDate.value) : null;
  const end = el.endDate.value ? new Date(el.endDate.value) : null;

  state.filtered = state.data.filter((item) => {
    const d = new Date(item.ultimaRemessa);
    if (year !== "all" && d.getFullYear() !== Number(year)) return false;
    if (month !== "all" && d.getMonth() + 1 !== Number(month)) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });

  state.filtered.sort((a, b) => daysWithoutShipment(b.ultimaRemessa) - daysWithoutShipment(a.ultimaRemessa));
  state.page = 1;
  renderAll();
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function renderSummary() {
  const uniqueClients = new Set(state.filtered.map((item) => item.cnpj)).size;
  const volumeTotal = state.filtered.reduce((sum, item) => sum + Number(item.volume || 0), 0);

  const counters = { ok: 0, warn: 0, alert: 0, critical: 0 };
  state.filtered.forEach((item) => counters[statusFromDays(daysWithoutShipment(item.ultimaRemessa))]++);

  setText("contractsCount", state.filtered.length);
  setText("clientsCount", uniqueClients);
  setText("volumeCount", volumeTotal);
  setText("okCount", counters.ok);
  setText("warnCount", counters.warn);
  setText("alertCount", counters.alert);
  setText("criticalCount", counters.critical);
}

function renderChart() {
  const byMonth = {};
  state.filtered.forEach((item) => {
    const key = monthKey(item.ultimaRemessa);
    byMonth[key] = (byMonth[key] || 0) + 1;
  });

  const entries = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));
  const maxValue = Math.max(1, ...entries.map(([, v]) => v));

  if (entries.length === 0) {
    el.chart.innerHTML = "<p>Sem dados para exibir no gráfico.</p>";
    return;
  }

  el.chart.innerHTML = entries
    .map(([month, value]) => {
      const h = 70 + (value / maxValue) * 160;
      return `<div class="bar"><div class="bar-inner" style="height:${h}px"></div><small>${value}</small><label>${month}</label></div>`;
    })
    .join("");
}

function renderTable() {
  const startIndex = (state.page - 1) * state.pageSize;
  const pageData = state.filtered.slice(startIndex, startIndex + state.pageSize);

  el.tableBody.innerHTML = pageData
    .map((item) => {
      const days = daysWithoutShipment(item.ultimaRemessa);
      const status = statusFromDays(days);
      const months = (days / 30).toFixed(1);
      return `<tr>
        <td>${item.cnpj}<br>${item.cliente}</td>
        <td>${item.contrato}</td>
        <td>${item.nomeObra || "-"}</td>
        <td>${item.volume}</td>
        <td>${new Date(item.ultimaRemessa).toLocaleDateString("pt-BR")}</td>
        <td>${days} dias (${months} meses)</td>
        <td><span class="badge ${status}">${statusLabel(status)}</span></td>
      </tr>`;
    })
    .join("");

  const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  el.tableMeta.textContent = `Ordenado da maior para a menor urgência (dias sem remessa). Mostrando ${pageData.length} de ${state.filtered.length} registros • Página ${state.page}/${totalPages}`;
}

function renderAll() {
  renderSummary();
  renderChart();
  renderTable();
}

function parseCsv(text) {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const keys = head.split(",").map((k) => k.trim());
  return lines.map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const obj = {};
    keys.forEach((k, i) => (obj[k] = values[i]));
    return {
      ...obj,
      volume: Number(obj.volume || 0),
      ultimaRemessa: obj.ultimaRemessa,
    };
  });
}

el.demoBtn.addEventListener("click", () => {
  state.data = [...demoData];
  updateFilters();
  applyFilters();
  el.statusText.textContent = `Demo carregada com sucesso (${state.data.length} registros).`;
});

el.uploadBtn.addEventListener("click", async () => {
  const file = el.fileInput.files[0];
  if (!file) {
    el.statusText.textContent = "Selecione um arquivo primeiro.";
    return;
  }

  const content = await file.text();
  state.data = file.name.endsWith(".json") ? JSON.parse(content) : parseCsv(content);
  updateFilters();
  applyFilters();
  el.statusText.textContent = `Arquivo carregado com sucesso (${state.data.length} registros).`;
});

el.clearBtn.addEventListener("click", () => {
  state.data = [];
  state.filtered = [];
  state.page = 1;
  updateFilters();
  renderAll();
  el.statusText.textContent = "Dados limpos.";
});

[el.yearFilter, el.monthFilter, el.startDate, el.endDate].forEach((item) => item.addEventListener("change", applyFilters));
document.getElementById("refreshChart").addEventListener("click", renderChart);

document.getElementById("prevPage").addEventListener("click", () => {
  state.page = Math.max(1, state.page - 1);
  renderTable();
});

document.getElementById("nextPage").addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  state.page = Math.min(totalPages, state.page + 1);
  renderTable();
});

updateFilters();
renderAll();
