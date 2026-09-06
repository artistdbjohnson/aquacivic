const LEAK = 120;
const PHASES = {};
const INFLIGHT = new Set();
const HISTORY = {};
const LANG_KEY = "aquacivic-lang";

const I18N = {
  pt: {
    htmlLang: "pt-PT",
    title: "AquaCivic · Consola Municipal de Rega",
    brandSub: "Consola",
    brandLoc: "Faro · Smart irrigation",
    gate: "GW · LoRa C",
    simNote: "Simulador no browser — mesma regra GSSIC: caudal > 120 L/min com eletroválvula fechada. Latência de hardware 1s.",
    leakBanner: "Fuga crítica detectada — caudal > 120 L/min com eletroválvula fechada.",
    leakHint: "Verificar sector e gateway LoRaWAN.",
    flow: "Caudal",
    moisture: "Humidade",
    valve: "Válvula",
    open: "ABERTA",
    closed: "FECHADA",
    valveOpen: "Eletroválvula aberta",
    valveClosed: "Eletroválvula fechada",
    override: "Override de hardware",
    health: { normal: "Normal", watering: "A regar", leak: "Fuga crítica" },
    phase: { sending: "A enviar comando…", acknowledged: "Hardware confirmou", updated: "Estado atualizado" }
  },
  en: {
    htmlLang: "en",
    title: "AquaCivic · Municipal Irrigation Console",
    brandSub: "Console",
    brandLoc: "Faro · Smart irrigation",
    gate: "GW · LoRa C",
    simNote: "In-browser simulator — same GSSIC rule: flow > 120 L/min with the valve closed. Hardware latency 1s.",
    leakBanner: "Critical leak detected — flow > 120 L/min with the valve closed.",
    leakHint: "Check the sector and LoRaWAN gateway.",
    flow: "Flow",
    moisture: "Moisture",
    valve: "Valve",
    open: "OPEN",
    closed: "CLOSED",
    valveOpen: "Solenoid valve open",
    valveClosed: "Solenoid valve closed",
    override: "Hardware override",
    health: { normal: "Normal", watering: "Watering", leak: "Critical leak" },
    phase: { sending: "Sending command…", acknowledged: "Hardware acknowledged", updated: "State updated" }
  }
};

function currentLang() {
  try {
    var stored = localStorage.getItem(LANG_KEY);
    if (stored === "en" || stored === "pt") return stored;
  } catch (e) {}
  return "pt";
}

var lang = currentLang();
function t() { return I18N[lang] || I18N.pt; }

function applyStaticCopy() {
  var copy = t();
  document.documentElement.lang = copy.htmlLang;
  document.title = copy.title;
  var sub = document.getElementById("brand-sub");
  var loc = document.getElementById("brand-loc");
  var gate = document.getElementById("gate-label");
  var note = document.getElementById("sim-note");
  if (sub) sub.textContent = copy.brandSub;
  if (loc) loc.textContent = copy.brandLoc;
  if (gate) gate.textContent = copy.gate;
  if (note) note.textContent = copy.simNote;
  var buttons = document.querySelectorAll("[data-lang]");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].setAttribute("aria-pressed", buttons[i].getAttribute("data-lang") === lang ? "true" : "false");
  }
}

function setLang(next) {
  if (next !== "en" && next !== "pt") return;
  lang = next;
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  applyStaticCopy();
  render();
}

const SEED = [
  { id: "jardim-manuel-bivar", name: "Jardim Manuel Bívar", device_id: "AC-FAO-JMB-LW-01", moisture: 42, flow: 12, valve: false, leakLatch: false },
  { id: "parque-ribeirinho", name: "Parque Ribeirinho", device_id: "AC-FAO-PRB-LW-01", moisture: 55, flow: 64, valve: true, leakLatch: false },
  { id: "rotunda-do-aeroporto", name: "Rotunda do Aeroporto", device_id: "AC-FAO-RAE-LW-01", moisture: 28, flow: 132, valve: false, leakLatch: true }
];

function nowISO() { return new Date().toISOString(); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function leakOf(flow, valveOpen) { return !valveOpen && flow > LEAK; }
function reading(device_id, flow, valve, moisture) {
  return {
    device_id: device_id,
    timestamp: nowISO(),
    flow_rate_lpm: Math.round(flow * 10) / 10,
    valve_status: valve,
    moisture_level: Math.round(moisture * 10) / 10,
    leak_detected: leakOf(flow, valve)
  };
}

const zones = SEED.map(function (s) {
  return {
    id: s.id,
    name: s.name,
    device_id: s.device_id,
    leakLatch: s.leakLatch,
    telemetry: reading(s.device_id, s.flow, s.valve, s.moisture)
  };
});

function uniqueZones() {
  var seen = {};
  var out = [];
  for (var i = 0; i < zones.length; i++) {
    var z = zones[i];
    if (!z || !z.id || seen[z.id]) continue;
    seen[z.id] = 1;
    out.push(z);
  }
  return out;
}

function healthOf(z) {
  if (z.telemetry.leak_detected) return "leak";
  if (z.telemetry.valve_status) return "watering";
  return "normal";
}

function seedHistory(z) {
  var rows = [];
  var t0 = Date.now() - 24 * 3600 * 1000;
  for (var i = 0; i < 288; i++) {
    var ts = new Date(t0 + i * 5 * 60 * 1000);
    var hour = ts.getUTCHours();
    var valve = z.telemetry.valve_status;
    var flow = valve ? 50 + 20 * Math.sin(i / 12) : 12;
    if (z.id === "rotunda-do-aeroporto" && hour === 3) flow = 136;
    rows.push({
      device_id: z.device_id,
      timestamp: ts.toISOString(),
      flow_rate_lpm: Math.round(flow * 10) / 10,
      valve_status: valve,
      moisture_level: z.telemetry.moisture_level,
      leak_detected: leakOf(flow, valve)
    });
  }
  HISTORY[z.id] = rows;
}
uniqueZones().forEach(seedHistory);

function tick() {
  var list = uniqueZones();
  for (var i = 0; i < list.length; i++) {
    var z = list[i];
    var prev = z.telemetry;
    var wobble = Math.sin((Date.now() / 60000) * Math.PI * 2) * 3;
    var flow, moisture;
    if (z.leakLatch && !prev.valve_status) {
      flow = 121 + Math.random() * 27;
      moisture = clamp(prev.moisture_level - (0.05 + Math.random() * 0.2), 0, 100);
    } else if (prev.valve_status) {
      flow = clamp(45 + Math.random() * 50 + wobble, 10, 150);
      moisture = clamp(prev.moisture_level + (0.15 + Math.random() * 0.4), 0, 100);
    } else {
      flow = clamp(10 + Math.random() * 8 + Math.abs(wobble) * 0.3, 10, 150);
      moisture = clamp(prev.moisture_level - (0.08 + Math.random() * 0.22), 0, 100);
    }
    z.telemetry = reading(z.device_id, flow, prev.valve_status, moisture);
  }
  render();
}

function toggle(z) {
  if (INFLIGHT.has(z.id)) return;
  INFLIGHT.add(z.id);
  PHASES[z.id] = "sending";
  render();
  setTimeout(function () {
    var open = !z.telemetry.valve_status;
    if (open) z.leakLatch = false;
    var flow = open ? 48 + Math.random() * 40 : 10 + Math.random() * 6;
    var moisture = clamp(z.telemetry.moisture_level + (open ? 0.4 : 0), 0, 100);
    z.telemetry = reading(z.device_id, flow, open, moisture);
    PHASES[z.id] = "acknowledged";
    render();
    setTimeout(function () {
      PHASES[z.id] = "updated";
      render();
      setTimeout(function () {
        PHASES[z.id] = "idle";
        INFLIGHT.delete(z.id);
        render();
      }, 1200);
    }, 280);
  }, 1000);
}

function spark(samples, leak) {
  var slice = samples.slice(-48);
  var w = 240;
  var h = 44;
  var min = 0;
  var max = 150;
  var span = max - min;
  var color = leak ? "#c45a3c" : "#1a6fb5";
  var d = "";
  var fill = "";
  if (slice.length >= 2) {
    d = slice.map(function (s, i) {
      var x = (i / (slice.length - 1)) * w;
      var y = h - ((s.flow_rate_lpm - min) / span) * (h - 6) - 3;
      return (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    var last = slice[slice.length - 1];
    var lastX = w;
    fill = d + " L" + lastX.toFixed(1) + "," + h + " L0," + h + " Z";
  }
  var threshY = h - ((LEAK - min) / span) * (h - 6) - 3;
  return (
    '<svg viewBox="0 0 ' + w + " " + h + '" class="spark" aria-hidden="true">' +
    '<line x1="0" y1="' + threshY.toFixed(1) + '" x2="' + w + '" y2="' + threshY.toFixed(1) + '" stroke="rgba(196,90,60,0.35)" stroke-width="1" stroke-dasharray="3 3"></line>' +
    (fill ? '<path d="' + fill + '" fill="' + color + '" fill-opacity="0.16"></path>' : "") +
    (d ? '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.4"></path>' : "") +
    "</svg>"
  );
}

function render() {
  var copy = t();
  var list = uniqueZones();
  var leaking = list.filter(function (z) { return z.telemetry.leak_detected; });
  var banner = document.getElementById("banner");
  if (banner) {
    banner.innerHTML = leaking.length
      ? '<div class="banner" role="alert"><strong>' + copy.leakBanner + "</strong><span>" + leaking.map(function (z) { return z.name; }).join(" · ") + ". " + copy.leakHint + "</span></div>"
      : "";
  }

  var grid = document.getElementById("grid");
  if (!grid) return;
  grid.innerHTML = list.map(function (z) {
    var h = healthOf(z);
    var tel = z.telemetry;
    var phase = PHASES[z.id] || "idle";
    var open = tel.valve_status;
    var busy = phase !== "idle";
    var cardClass = "card" + (h === "leak" ? " is-leak" : h === "watering" ? " is-water" : "");
    return (
      '<article class="' + cardClass + '">' +
      '<header class="card-head"><div>' +
      "<h2>" + z.name + "</h2>" +
      '<p class="id">' + z.device_id + "</p></div>" +
      '<span class="status ' + h + '"><i></i>' + copy.health[h] + "</span></header>" +
      '<dl class="metrics">' +
      "<div><dt>" + copy.flow + '</dt><dd class="' + (tel.flow_rate_lpm > 120 ? "hot" : "") + '">' + tel.flow_rate_lpm.toFixed(1) + '<span class="unit">L/min</span></dd></div>' +
      "<div><dt>" + copy.moisture + "</dt><dd>" + tel.moisture_level.toFixed(0) + '<span class="unit">%</span></dd></div>' +
      "<div><dt>" + copy.valve + "</dt><dd>" + (open ? copy.open : copy.closed) + "</dd></div>" +
      "</dl>" +
      '<div class="spark-wrap">' + spark(HISTORY[z.id] || [], tel.leak_detected) + "</div>" +
      '<div class="foot"><div>' +
      '<p class="k">' + copy.override + "</p>" +
      '<p class="v">' + (open ? copy.valveOpen : copy.valveClosed) + "</p>" +
      (busy ? '<p class="phase">' + copy.phase[phase] + "</p>" : "") +
      "</div>" +
      '<button type="button" class="sw" data-toggle="' + z.id + '" ' + (busy ? "disabled" : "") +
      ' aria-pressed="' + open + '"><span></span></button></div></article>'
    );
  }).join("");
}

function bindGrid() {
  var grid = document.getElementById("grid");
  if (!grid || grid.getAttribute("data-bound") === "1") return;
  grid.setAttribute("data-bound", "1");
  grid.addEventListener("click", function (e) {
    var btn = e.target;
    while (btn && btn !== grid && !(btn.getAttribute && btn.getAttribute("data-toggle"))) {
      btn = btn.parentNode;
    }
    if (!btn || btn === grid || btn.disabled) return;
    var id = btn.getAttribute("data-toggle");
    var list = uniqueZones();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) toggle(list[i]);
    }
  });
}

if (!window.__aquacivicBound) {
  window.__aquacivicBound = true;
  document.querySelectorAll("[data-lang]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLang(btn.getAttribute("data-lang"));
    });
  });
}

applyStaticCopy();
bindGrid();
render();
if (!window.__aquacivicTick) {
  window.__aquacivicTick = true;
  setInterval(tick, 5000);
}
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
