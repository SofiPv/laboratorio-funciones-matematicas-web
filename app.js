const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");

const functionSelect = document.getElementById("functionSelect");
const paramA = document.getElementById("paramA");
const paramH = document.getElementById("paramH");
const paramK = document.getElementById("paramK");
const paramN = document.getElementById("paramN");

const drawBtn = document.getElementById("drawBtn");
const downloadBtn = document.getElementById("downloadBtn");
const copyTableBtn = document.getElementById("copyTableBtn");

const formulaBox = document.getElementById("formulaBox");
const analysisList = document.getElementById("analysisList");
const interpretation = document.getElementById("interpretation");
const valuesTable = document.getElementById("valuesTable");
const tableTitle = document.getElementById("tableTitle");

const margin = 58;
let currentGraph = null;
let lastTableText = "";

const families = [
  {
    id: "originLine",
    name: "Familia de rectas por el origen: y = Cx",
    defaults: { A: 1, h: 0, k: 0, n: 2 },
    bounds: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
    build: p => ({
      latex: `y=${fmt(p.A)}x`,
      f: x => p.A * x,
      domain: () => true,
      analysis: [
        "Dominio: R",
        "Rango: R",
        `Pendiente: ${fmt(p.A)}`,
        "Intersección: (0, 0)",
        p.A === 0 ? "Es una recta horizontal" : "Pasa por el origen"
      ],
      interpretation: "Esta familia reúne todas las rectas que pasan por el origen. El parámetro A modifica la pendiente."
    })
  },
  {
    id: "constant",
    name: "Función constante: y = C",
    defaults: { A: 1, h: 0, k: 2, n: 2 },
    bounds: { xMin: -10, xMax: 10, yMin: -6, yMax: 8 },
    build: p => ({
      latex: `y=${fmt(p.k)}`,
      f: () => p.k,
      domain: () => true,
      analysis: [
        "Dominio: R",
        `Rango: {${fmt(p.k)}}`,
        "Pendiente: 0",
        `Recta horizontal en y = ${fmt(p.k)}`
      ],
      interpretation: "La función constante conserva el mismo valor de y para cualquier x."
    })
  },
  {
    id: "vertical",
    name: "Recta vertical: x = C",
    defaults: { A: 1, h: 2, k: 0, n: 2 },
    bounds: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
    vertical: true,
    build: p => ({
      latex: `x=${fmt(p.h)}`,
      xValue: p.h,
      analysis: [
        `Recta vertical en x = ${fmt(p.h)}`,
        "No representa una función y=f(x)",
        "No tiene pendiente definida",
        "Dominio: valor fijo de x",
        "Rango: R"
      ],
      interpretation: "Una recta vertical no pasa la prueba de la recta vertical, por eso no se maneja como función explícita y=f(x)."
    })
  },
  {
    id: "power",
    name: "Función algebraica: y = A(x-h)^n + k",
    defaults: { A: 1, h: 0, k: 0, n: 2 },
    bounds: { xMin: -6, xMax: 6, yMin: -10, yMax: 10 },
    build: p => {
      const n = Math.round(p.n);
      return {
        latex: `y=${fmt(p.A)}(x-${fmt(p.h)})^{${n}}+${fmt(p.k)}`,
        f: x => p.A * Math.pow(x - p.h, n) + p.k,
        domain: () => true,
        analysis: [
          "Dominio: R",
          n % 2 === 0
            ? (p.A >= 0 ? `Rango aproximado: [${fmt(p.k)}, ∞)` : `Rango aproximado: (-∞, ${fmt(p.k)}]`)
            : "Rango: R",
          n % 2 === 0 ? `Vértice o punto de referencia: (${fmt(p.h)}, ${fmt(p.k)})` : `Punto de inflexión de referencia: (${fmt(p.h)}, ${fmt(p.k)})`,
          p.A < 0 ? "Reflexión respecto al eje X" : "Sin reflexión vertical",
          `Traslación horizontal: ${fmt(p.h)}`
        ],
        interpretation: "Esta familia permite observar potencias pares e impares, traslaciones y reflexiones."
      };
    }
  },
  {
    id: "sqrt",
    name: "Función raíz: y = A√(x-h) + k",
    defaults: { A: 1, h: 0, k: 0, n: 2 },
    bounds: { xMin: -3, xMax: 12, yMin: -6, yMax: 8 },
    build: p => ({
      latex: `y=${fmt(p.A)}\\sqrt{x-${fmt(p.h)}}+${fmt(p.k)}`,
      f: x => p.A * Math.sqrt(x - p.h) + p.k,
      domain: x => x >= p.h,
      analysis: [
        `Dominio: [${fmt(p.h)}, ∞)`,
        p.A >= 0 ? `Rango: [${fmt(p.k)}, ∞)` : `Rango: (-∞, ${fmt(p.k)}]`,
        `Punto inicial: (${fmt(p.h)}, ${fmt(p.k)})`,
        p.A < 0 ? "Reflejada respecto al eje X" : "Sin reflexión vertical"
      ],
      interpretation: "La raíz cuadrada inicia en un punto y se desplaza según h y k."
    })
  },
  {
    id: "absolute",
    name: "Valor absoluto: y = A|x-h| + k",
    defaults: { A: 1, h: 0, k: 0, n: 2 },
    bounds: { xMin: -8, xMax: 8, yMin: -6, yMax: 10 },
    build: p => ({
      latex: `y=${fmt(p.A)}|x-${fmt(p.h)}|+${fmt(p.k)}`,
      f: x => p.A * Math.abs(x - p.h) + p.k,
      domain: () => true,
      analysis: [
        "Dominio: R",
        p.A >= 0 ? `Rango: [${fmt(p.k)}, ∞)` : `Rango: (-∞, ${fmt(p.k)}]`,
        `Vértice: (${fmt(p.h)}, ${fmt(p.k)})`,
        "Forma de V",
        p.A < 0 ? "Reflexión respecto al eje X" : "Apertura hacia arriba"
      ],
      interpretation: "La función valor absoluto representa distancia y genera una gráfica en forma de V."
    })
  },
  {
    id: "exponential",
    name: "Exponencial: y = A·base^(x-h) + k",
    defaults: { A: 1, h: 0, k: 0, n: 2 },
    bounds: { xMin: -6, xMax: 6, yMin: -4, yMax: 12 },
    build: p => {
      const base = Math.max(0.1, Math.abs(p.n));
      return {
        latex: `y=${fmt(p.A)}(${fmt(base)})^{x-${fmt(p.h)}}+${fmt(p.k)}`,
        f: x => p.A * Math.pow(base, x - p.h) + p.k,
        domain: () => true,
        analysis: [
          "Dominio: R",
          p.A >= 0 ? `Rango: (${fmt(p.k)}, ∞)` : `Rango: (-∞, ${fmt(p.k)})`,
          `Asíntota horizontal: y = ${fmt(p.k)}`,
          base > 1 ? "Creciente si A es positivo" : "Decreciente si A es positivo",
          "No corta la asíntota horizontal"
        ],
        interpretation: "La exponencial modela crecimiento o decrecimiento según la base."
      };
    }
  },
  {
    id: "log",
    name: "Logarítmica: y = A·ln(x-h) + k",
    defaults: { A: 1, h: 0, k: 0, n: 2 },
    bounds: { xMin: -3, xMax: 12, yMin: -8, yMax: 8 },
    build: p => ({
      latex: `y=${fmt(p.A)}\\ln(x-${fmt(p.h)})+${fmt(p.k)}`,
      f: x => p.A * Math.log(x - p.h) + p.k,
      domain: x => x > p.h,
      analysis: [
        `Dominio: (${fmt(p.h)}, ∞)`,
        "Rango: R",
        `Asíntota vertical: x = ${fmt(p.h)}`,
        p.A < 0 ? "Reflexión respecto al eje X" : "Sin reflexión vertical"
      ],
      interpretation: "La función logarítmica es inversa de la exponencial y requiere argumento positivo."
    })
  },
  {
    id: "sin",
    name: "Trigonométrica: y = A·sen(n(x-h)) + k",
    defaults: { A: 1, h: 0, k: 0, n: 1 },
    bounds: { xMin: -7, xMax: 7, yMin: -4, yMax: 4 },
    build: p => {
      const n = p.n || 1;
      return {
        latex: `y=${fmt(p.A)}\\sin(${fmt(n)}(x-${fmt(p.h)}))+${fmt(p.k)}`,
        f: x => p.A * Math.sin(n * (x - p.h)) + p.k,
        domain: () => true,
        analysis: [
          "Dominio: R",
          `Rango: [${fmt(p.k - Math.abs(p.A))}, ${fmt(p.k + Math.abs(p.A))}]`,
          `Amplitud: ${fmt(Math.abs(p.A))}`,
          `Periodo: ${fmt((2 * Math.PI) / Math.abs(n || 1))}`,
          `Desplazamiento vertical: ${fmt(p.k)}`
        ],
        interpretation: "La función seno es periódica; A modifica amplitud y n modifica el periodo."
      };
    }
  },
  {
    id: "cos",
    name: "Trigonométrica: y = A·cos(n(x-h)) + k",
    defaults: { A: 1, h: 0, k: 0, n: 1 },
    bounds: { xMin: -7, xMax: 7, yMin: -4, yMax: 4 },
    build: p => {
      const n = p.n || 1;
      return {
        latex: `y=${fmt(p.A)}\\cos(${fmt(n)}(x-${fmt(p.h)}))+${fmt(p.k)}`,
        f: x => p.A * Math.cos(n * (x - p.h)) + p.k,
        domain: () => true,
        analysis: [
          "Dominio: R",
          `Rango: [${fmt(p.k - Math.abs(p.A))}, ${fmt(p.k + Math.abs(p.A))}]`,
          `Amplitud: ${fmt(Math.abs(p.A))}`,
          `Periodo: ${fmt((2 * Math.PI) / Math.abs(n || 1))}`,
          `Desplazamiento vertical: ${fmt(p.k)}`
        ],
        interpretation: "La función coseno es periódica y conserva rango limitado por la amplitud."
      };
    }
  },
  {
    id: "tan",
    name: "Trigonométrica: y = A·tan(n(x-h)) + k",
    defaults: { A: 1, h: 0, k: 0, n: 1 },
    bounds: { xMin: -6, xMax: 6, yMin: -8, yMax: 8 },
    build: p => {
      const n = p.n || 1;
      return {
        latex: `y=${fmt(p.A)}\\tan(${fmt(n)}(x-${fmt(p.h)}))+${fmt(p.k)}`,
        f: x => p.A * Math.tan(n * (x - p.h)) + p.k,
        domain: x => Math.abs(Math.cos(n * (x - p.h))) > 0.04,
        analysis: [
          "Dominio: R excepto asíntotas verticales",
          "Rango: R",
          `Periodo: ${fmt(Math.PI / Math.abs(n || 1))}`,
          "No es continua en sus asíntotas"
        ],
        interpretation: "La tangente se forma como sen(x)/cos(x), por eso no existe cuando cos(x)=0."
      };
    }
  },
  {
    id: "sec",
    name: "Trigonométrica: y = sec(x)",
    defaults: { A: 1, h: 0, k: 0, n: 1 },
    bounds: { xMin: -7, xMax: 7, yMin: -8, yMax: 8 },
    build: p => ({
      latex: `y=\\sec(x)=\\frac{1}{\\cos(x)}`,
      f: x => 1 / Math.cos(x),
      domain: x => Math.abs(Math.cos(x)) > 0.05,
      analysis: [
        "Dominio: R excepto π/2 + kπ",
        "Rango: (-∞, -1] ∪ [1, ∞)",
        "Función recíproca de coseno",
        "Presenta asíntotas verticales"
      ],
      interpretation: "La secante no existe donde coseno vale cero."
    })
  },
  {
    id: "csc",
    name: "Trigonométrica: y = csc(x)",
    defaults: { A: 1, h: 0, k: 0, n: 1 },
    bounds: { xMin: -7, xMax: 7, yMin: -8, yMax: 8 },
    build: p => ({
      latex: `y=\\csc(x)=\\frac{1}{\\sin(x)}`,
      f: x => 1 / Math.sin(x),
      domain: x => Math.abs(Math.sin(x)) > 0.05,
      analysis: [
        "Dominio: R excepto kπ",
        "Rango: (-∞, -1] ∪ [1, ∞)",
        "Función recíproca de seno",
        "Presenta asíntotas verticales"
      ],
      interpretation: "La cosecante no existe donde seno vale cero."
    })
  },
  {
    id: "sum",
    name: "Operación: f + g = √x + √(9-x²)",
    defaults: { A: 1, h: 0, k: 0, n: 2 },
    bounds: { xMin: -1, xMax: 4, yMin: -1, yMax: 5 },
    build: p => ({
      latex: `y=\\sqrt{x}+\\sqrt{9-x^2}`,
      f: x => Math.sqrt(x) + Math.sqrt(9 - x * x),
      domain: x => x >= 0 && 9 - x * x >= 0,
      analysis: [
        "Dominio de √x: [0, ∞)",
        "Dominio de √(9-x²): [-3, 3]",
        "Dominio de f+g: [0, 3]",
        "Rango aproximado: depende del máximo de la suma"
      ],
      interpretation: "Al sumar funciones, el dominio se obtiene con la intersección de los dominios individuales."
    })
  }
];

function init() {
  families.forEach(family => {
    const option = document.createElement("option");
    option.value = family.id;
    option.textContent = family.name;
    functionSelect.appendChild(option);
  });

  functionSelect.addEventListener("change", applyDefaults);
  drawBtn.addEventListener("click", buildAndDraw);
  downloadBtn.addEventListener("click", downloadImage);
  copyTableBtn.addEventListener("click", copyTable);

  applyDefaults();
}

function applyDefaults() {
  const family = selectedFamily();
  paramA.value = family.defaults.A;
  paramH.value = family.defaults.h;
  paramK.value = family.defaults.k;
  paramN.value = family.defaults.n;
  buildAndDraw();
}

function selectedFamily() {
  return families.find(family => family.id === functionSelect.value) || families[0];
}

function readParams() {
  return {
    A: Number(paramA.value),
    h: Number(paramH.value),
    k: Number(paramK.value),
    n: Number(paramN.value)
  };
}

function buildAndDraw() {
  const family = selectedFamily();
  const params = readParams();
  const built = family.build(params);

  currentGraph = {
    ...built,
    bounds: family.bounds,
    vertical: family.vertical || false
  };

  updateInfo();
  drawGraph();
  renderTable();

  if (window.MathJax) {
    MathJax.typesetPromise();
  }
}

function updateInfo() {
  formulaBox.innerHTML = `\\[${currentGraph.latex}\\]`;
  analysisList.innerHTML = "";

  currentGraph.analysis.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    analysisList.appendChild(li);
  });

  interpretation.textContent = currentGraph.interpretation;
}

function drawGraph() {
  const width = canvas.width;
  const height = canvas.height;
  const bounds = currentGraph.bounds;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  drawGrid(bounds, width, height);
  drawAxes(bounds, width, height);

  if (currentGraph.vertical) {
    drawVerticalLine(currentGraph.xValue, bounds, width, height);
  } else {
    drawFunction(currentGraph, bounds, width, height);
  }

  drawTitle();
}

function drawGrid(bounds, width, height) {
  ctx.save();
  ctx.strokeStyle = "#e7eef8";
  ctx.lineWidth = 1;

  const xStep = chooseStep(bounds.xMin, bounds.xMax);
  const yStep = chooseStep(bounds.yMin, bounds.yMax);

  for (let x = Math.ceil(bounds.xMin / xStep) * xStep; x <= bounds.xMax; x += xStep) {
    const sx = toScreenX(x, bounds, width);
    ctx.beginPath();
    ctx.moveTo(sx, margin);
    ctx.lineTo(sx, height - margin);
    ctx.stroke();
  }

  for (let y = Math.ceil(bounds.yMin / yStep) * yStep; y <= bounds.yMax; y += yStep) {
    const sy = toScreenY(y, bounds, height);
    ctx.beginPath();
    ctx.moveTo(margin, sy);
    ctx.lineTo(width - margin, sy);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAxes(bounds, width, height) {
  ctx.save();
  ctx.strokeStyle = "#273449";
  ctx.fillStyle = "#273449";
  ctx.lineWidth = 2;
  ctx.font = "13px Segoe UI";

  const xAxis = toScreenY(0, bounds, height);
  const yAxis = toScreenX(0, bounds, width);

  ctx.beginPath();
  ctx.moveTo(margin, xAxis);
  ctx.lineTo(width - margin, xAxis);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(yAxis, margin);
  ctx.lineTo(yAxis, height - margin);
  ctx.stroke();

  ctx.fillText("x", width - margin + 12, xAxis + 5);
  ctx.fillText("y", yAxis + 8, margin - 12);

  drawTicks(bounds, width, height, xAxis, yAxis);

  ctx.restore();
}

function drawTicks(bounds, width, height, xAxis, yAxis) {
  const xStep = chooseStep(bounds.xMin, bounds.xMax);
  const yStep = chooseStep(bounds.yMin, bounds.yMax);

  for (let x = Math.ceil(bounds.xMin / xStep) * xStep; x <= bounds.xMax; x += xStep) {
    const sx = toScreenX(x, bounds, width);
    ctx.beginPath();
    ctx.moveTo(sx, xAxis - 4);
    ctx.lineTo(sx, xAxis + 4);
    ctx.stroke();

    if (Math.abs(x) > 0.001) {
      ctx.fillText(fmt(x), sx - 10, xAxis + 20);
    }
  }

  for (let y = Math.ceil(bounds.yMin / yStep) * yStep; y <= bounds.yMax; y += yStep) {
    const sy = toScreenY(y, bounds, height);
    ctx.beginPath();
    ctx.moveTo(yAxis - 4, sy);
    ctx.lineTo(yAxis + 4, sy);
    ctx.stroke();

    if (Math.abs(y) > 0.001) {
      ctx.fillText(fmt(y), yAxis + 8, sy + 4);
    }
  }
}

function drawFunction(graph, bounds, width, height) {
  ctx.save();
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 3;
  ctx.beginPath();

  const samples = 1800;
  let started = false;
  let previousY = null;

  for (let i = 0; i <= samples; i++) {
    const x = bounds.xMin + ((bounds.xMax - bounds.xMin) * i) / samples;

    if (!graph.domain(x)) {
      started = false;
      previousY = null;
      continue;
    }

    const y = graph.f(x);

    if (!Number.isFinite(y) || y < bounds.yMin - 20 || y > bounds.yMax + 20) {
      started = false;
      previousY = null;
      continue;
    }

    if (previousY !== null && Math.abs(y - previousY) > (bounds.yMax - bounds.yMin) * 0.55) {
      started = false;
    }

    const sx = toScreenX(x, bounds, width);
    const sy = toScreenY(y, bounds, height);

    if (!started) {
      ctx.moveTo(sx, sy);
      started = true;
    } else {
      ctx.lineTo(sx, sy);
    }

    previousY = y;
  }

  ctx.stroke();
  ctx.restore();
}

function drawVerticalLine(xValue, bounds, width, height) {
  ctx.save();
  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 3;

  const sx = toScreenX(xValue, bounds, width);

  ctx.beginPath();
  ctx.moveTo(sx, margin);
  ctx.lineTo(sx, height - margin);
  ctx.stroke();

  ctx.restore();
}

function drawTitle() {
  ctx.save();
  ctx.fillStyle = "#152238";
  ctx.font = "bold 20px Segoe UI";
  ctx.fillText("Laboratorio de funciones", 22, 34);
  ctx.restore();
}

function renderTable() {
  valuesTable.innerHTML = "";
  const bounds = currentGraph.bounds;
  const step = chooseStep(bounds.xMin, bounds.xMax);
  const rows = [];

  if (currentGraph.vertical) {
    tableTitle.textContent = "Recta vertical";
    lastTableText = `x = ${fmt(currentGraph.xValue)}`;
    return;
  }

  for (let x = Math.ceil(bounds.xMin / step) * step; x <= bounds.xMax + 0.0001; x += step) {
    const tr = document.createElement("tr");
    const xText = fmt(x);
    let yText = "No definido";

    if (currentGraph.domain(x)) {
      const y = currentGraph.f(x);

      if (Number.isFinite(y)) {
        yText = fmt(y);
      }
    }

    tr.innerHTML = `<td>${xText}</td><td>${yText}</td>`;
    valuesTable.appendChild(tr);
    rows.push(`${xText}\t${yText}`);
  }

  tableTitle.textContent = "Valores calculados";
  lastTableText = `x\ty\n${rows.join("\n")}`;
}

async function copyTable() {
  await navigator.clipboard.writeText(lastTableText);
  copyTableBtn.textContent = "Copiado";
  setTimeout(() => copyTableBtn.textContent = "Copiar tabla", 1200);
}

function downloadImage() {
  const link = document.createElement("a");
  link.download = "grafica-funcion.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function toScreenX(x, bounds, width) {
  const ratio = (x - bounds.xMin) / (bounds.xMax - bounds.xMin);
  return margin + ratio * (width - margin * 2);
}

function toScreenY(y, bounds, height) {
  const ratio = (y - bounds.yMin) / (bounds.yMax - bounds.yMin);
  return height - margin - ratio * (height - margin * 2);
}

function chooseStep(min, max) {
  const range = max - min;

  if (range <= 5) return 0.5;
  if (range <= 14) return 1;
  if (range <= 25) return 2;

  return 5;
}

function fmt(value) {
  if (!Number.isFinite(value)) return "No definido";

  const rounded = Math.round(value * 1000) / 1000;

  if (Object.is(rounded, -0)) return "0";

  return String(rounded);
}

init();
