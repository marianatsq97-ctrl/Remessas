const state = {
  data: [],
  filtered: [],
  page: 1,
  pageSize: 8,
};

const MONTH_NAMES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const demoData = [
  {
    cnpj: "12.345.678/0001-10",
    cliente: "Cliente Construtora Delta",
    contrato: "C-1003",
    nomeObra: "Condomínio Horizonte",
    volume: 20,
    ultimaRemessa: "2026-01-02",
  },
  {
    cnpj: "23.456.789/0001-11",
    cliente: "Cliente Pedra Forte",
    contrato: "C-1002",
    nomeObra: "Edifício Atlântico",
    volume: 7,
    ultimaRemessa: "2026-01-07",
  },
  {
    cnpj: "34.567.890/0001-12",
    cliente: "Cliente Areia Azul",
    contrato: "C-1001",
    nomeObra: "Residencial Aquarela",
    volume: 12,
    ultimaRemessa: "2026-01-11",
  },
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
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  refreshChart: document.getElementById("refreshChart"),
};

function normalizeRecord(item) {
  const volume = Number(item.volume || 0);
  return {
    cnpj: item.cnpj || "-",
    cliente: item.cliente || "-",
    contrato: item.contrato || "-",
    nomeObra: item.nomeObra || "-",
    volume: Number.isFinite(volume) ? volume : 0,
    ultimaRemessa: item.ultimaRemessa,
  };
}

function daysWithoutShipment(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today - parsed) / 86400000));
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
  if (Number.isNaN(d.getTime())) return "inválido";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(dateString) {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "inválido";
  return `${MONTH_NAMES[d.getMonth()]}/${d.getFullYear()}`;
}

function updateFilters() {
  const years = [
    ...new Set(
      state.data
        .map((item) => new Date(item.ultimaRemessa))
        .filter((d) => !Number.isNaN(d.getTime()))
        .map((d) => d.getFullYear())
    ),
  ].sort((a, b) => a - b);

  el.yearFilter.innerHTML = `<option value="all">Ano: todos</option>${years
    .map((year) => `<option value="${year}">${year}</option>`)
    .join("")}`;

  el.monthFilter.innerHTML = `<option value="all">Mês: todos</option>${MONTH_NAMES.map(
    (month, index) => `<option value="${index + 1}">${month}</option>`
  ).join("")}`;
}

function applyFilters() {
  const year = el.yearFilter.value;
  const month = el.monthFilter.value;
  const start = el.startDate.value ? new Date(el.startDate.value) : null;
  const end = el.endDate.value ? new Date(el.endDate.value) : null;

  state.filtered = state.data.filter((item) => {
    const d = new Date(item.ultimaRemessa);
    if (Number.isNaN(d.getTime())) return false;
    if (year !== "all" && d.getFullYear() !== Number(year)) return false;
    if (month !== "all" && d.getMonth() + 1 !== Number(month)) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });

  state.filtered.sort(
    (a, b) => daysWithoutShipment(b.ultimaRemessa) - daysWithoutShipment(a.ultimaRemessa)
  );

  state.page = 1;
  renderAll();
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function renderSummary() {
  const uniqueClients = new Set(state.filtered.map((item) => item.cnpj)).size;
  const volumeTotal = state.filtered.reduce((sum, item) => sum + Number(item.volume), 0);
  const counters = { ok: 0, warn: 0, alert: 0, critical: 0 };

  state.filtered.forEach((item) => {
    const status = statusFromDays(daysWithoutShipment(item.ultimaRemessa));
    counters[status] += 1;
  });

  setText("contractsCount", state.filtered.length);
  setText("clientsCount", uniqueClients);
  setText("volumeCount", volumeTotal);
  setText("okCount", counters.ok);
  setText("warnCount", counters.warn);
  setText("alertCount", counters.alert);
  setText("criticalCount", counters.critical);
}

function renderChart() {
  const grouped = {};
  state.filtered.forEach((item) => {
    const key = monthKey(item.ultimaRemessa);
    grouped[key] = (grouped[key] || 0) + 1;
  });

  const entries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  const maxValue = Math.max(1, ...entries.map(([, value]) => value));

  if (entries.length === 0) {
    el.chart.innerHTML = "<p>Sem dados para exibir no gráfico.</p>";
    return;
  }

  el.chart.innerHTML = entries
    .map(([month, value]) => {
      const [year, mm] = month.split("-");
      const syntheticDate = `${year}-${mm}-01`;
      const h = 70 + (value / maxValue) * 170;
      return `<div class="bar">
        <div class="bar-inner" style="height:${h}px"></div>
        <small>${value}</small>
        <label>${monthLabel(syntheticDate)}</label>
      </div>`;
    })
    .join("");
}

function renderTable() {
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  state.page = Math.min(state.page, totalPages);

  const startIndex = (state.page - 1) * state.pageSize;
  const pageData = state.filtered.slice(startIndex, startIndex + state.pageSize);

  el.tableBody.innerHTML = pageData
    .map((item) => {
      const days = daysWithoutShipment(item.ultimaRemessa);
      const status = statusFromDays(days);
      const months = (days / 30).toFixed(1);
      const formattedDate = new Date(item.ultimaRemessa).toLocaleDateString("pt-BR");
      return `<tr>
        <td>${item.cnpj}<br>${item.cliente}</td>
        <td>${item.contrato}</td>
        <td>${item.nomeObra}</td>
        <td>${item.volume}</td>
        <td>${formattedDate}</td>
        <td>${days} dias (${months} meses)</td>
        <td><span class="badge ${status}">${statusLabel(status)}</span></td>
      </tr>`;
    })
    .join("");

  el.tableMeta.textContent = `Ordenado da maior para a menor urgência (dias sem remessa). Mostrando ${pageData.length} de ${state.filtered.length} registros • Página ${state.page}/${totalPages}`;

  el.prevPage.disabled = state.page <= 1;
  el.nextPage.disabled = state.page >= totalPages;
}

function renderAll() {
  renderSummary();
  renderChart();
  renderTable();
}

function parseCsvLine(line, delimiter) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const isEscapedQuote = inQuotes && line[i + 1] === '"';
      if (isEscapedQuote) {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const keys = parseCsvLine(lines[0], delimiter);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter);
    const obj = {};
    keys.forEach((key, i) => {
      obj[key] = values[i] || "";
    });

    return normalizeRecord({
      ...obj,
      volume: obj.volume,
      ultimaRemessa: obj.ultimaRemessa,
    });
  });
}

function loadRecords(records, sourceLabel) {
  state.data = records.filter((item) => item.ultimaRemessa).map(normalizeRecord);
  updateFilters();
  applyFilters();
  el.statusText.textContent = `${sourceLabel} carregado com sucesso (${state.data.length} registros).`;
}

el.fileInput.addEventListener("change", () => {
  const file = el.fileInput.files[0];
  if (file) {
    el.statusText.textContent = `Arquivo selecionado: ${file.name}`;
  }
});

el.demoBtn.addEventListener("click", () => {
  loadRecords(demoData, "Demo");
});

el.uploadBtn.addEventListener("click", async () => {
  const file = el.fileInput.files[0];
  if (!file) {
    el.statusText.textContent = "Selecione um arquivo primeiro.";
    return;
  }

  try {
    const content = await file.text();
    const records = file.name.toLowerCase().endsWith(".json")
      ? JSON.parse(content).map(normalizeRecord)
      : parseCsv(content);

    loadRecords(records, "Arquivo");
  } catch (error) {
    el.statusText.textContent = `Falha ao carregar arquivo: ${error.message}`;
  }
});

el.clearBtn.addEventListener("click", () => {
  state.data = [];
  state.filtered = [];
  state.page = 1;
  updateFilters();
  renderAll();
  el.fileInput.value = "";
  el.statusText.textContent = "Dados limpos.";
});

[el.yearFilter, el.monthFilter, el.startDate, el.endDate].forEach((item) => {
  item.addEventListener("change", applyFilters);
});

el.refreshChart.addEventListener("click", renderChart);

el.prevPage.addEventListener("click", () => {
  state.page = Math.max(1, state.page - 1);
  renderTable();
});

el.nextPage.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  state.page = Math.min(totalPages, state.page + 1);
  renderTable();
});

updateFilters();
renderAll();
