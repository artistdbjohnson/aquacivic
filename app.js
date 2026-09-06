const LEAK = 120;
const PHASES = {};
const INFLIGHT = new Set();
const HISTORY = {};
const SEED = [
  { id: "jardim-manuel-bivar", name: "Jardim Manuel Bivar", device_id: "AC-FAO-JMB-LW-01", moisture: 42, flow: 12, valve: false, leakLatch: false },
  { id: "parque-ribeirinho", name: "Parque Ribeirinho", device_id: "AC-FAO-PRB-LW-01", moisture: 55, flow: 64, valve: true, leakLatch: false },
  { id: "rotunda-do-aeroporto", name: "Rotunda do Aeroporto", device_id: "AC-FAO-RAE-LW-01", moisture: 28, flow: 132, valve: false, leakLatch: true }
];
function nowISO() { return new Date().toISOString(); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function leakOf(flow, valveOpen) { return !valveOpen && flow > LEAK; }
function reading(device_id, flow, valve, moisture) {
  return { device_id: device_id, timestamp: nowISO(), flow_rate_lpm: Math.round(flow * 10) / 10, valve_status: valve, moisture_level: Math.round(moisture * 10) / 10, leak_detected: leakOf(flow, valve) };
}
const zones = SEED.map(function(s) {
  return { id: s.id, name: s.name, device_id: s.device_id, leakLatch: s.leakLatch, telemetry: reading(s.device_id, s.flow, s.valve, s.moisture) };
});
function healthOf(z) {
  if (z.telemetry.leak_detected) return "leak";
  if (z.telemetry.valve_status) return "watering";
  return "normal";
}
var pulse = { normal: "pulse-ok", watering: "pulse-water", leak: "pulse-leak" };
var label = { normal: "Normal", watering: "A regar", leak: "Fuga critica" };
var phaseCopy = { sending: "Sending Command...", acknowledged: "Hardware Acknowledged", updated: "State Updated" };
function seedHistory(z) {
  var rows = [];
  var t0 = Date.now() - 24 * 3600 * 1000;
  for (var i = 0; i < 288; i++) {
    var ts = new Date(t0 + i * 5 * 60 * 1000);
    var hour = ts.getUTCHours();
    var valve = z.telemetry.valve_status;
    var flow = valve ? 50 + 20 * Math.sin(i / 12) : 12;
    if (z.id === "rotunda-do-aeroporto" && hour === 3) flow = 136;
    rows.push({ device_id: z.device_id, timestamp: ts.toISOString(), flow_rate_lpm: Math.round(flow * 10) / 10, valve_status: valve, moisture_level: z.telemetry.moisture_level, leak_detected: leakOf(flow, valve) });
  }
  HISTORY[z.id] = rows;
}
zones.forEach(seedHistory);
function tick() {
  for (var i = 0; i < zones.length; i++) {
    var z = zones[i];
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
  setTimeout(function() {
    var open = !z.telemetry.valve_status;
    if (open) z.leakLatch = false;
    var flow = open ? 48 + Math.random() * 40 : 10 + Math.random() * 6;
    var moisture = clamp(z.telemetry.moisture_level + (open ? 0.4 : 0), 0, 100);
    z.telemetry = reading(z.device_id, flow, open, moisture);
    PHASES[z.id] = "acknowledged";
    render();
    setTimeout(function() {
      PHASES[z.id] = "updated";
      render();
      setTimeout(function() {
        PHASES[z.id] = "idle";
        INFLIGHT.delete(z.id);
        render();
      }, 1200);
    }, 280);
  }, 1000);
}
function spark(samples, leak) {
  var slice = samples.slice(-48);
  if (slice.length < 2) return "";
  var values = slice.map(function(s) { return s.flow_rate_lpm; });
  var min = Math.min.apply(null, values.concat([0]));
  var max = Math.max.apply(null, values.concat([150]));
  var span = Math.max(max - min, 1);
  var w = 240, h = 48;
  var d = values.map(function(v, i) {
    var x = (i / (values.length - 1)) * w;
    var y = h - ((v - min) / span) * (h - 4) - 2;
    return (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");
  var color = leak ? "#f87171" : "#7dd3fc";
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="h-12 w-full" aria-hidden><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.6"/></svg>';
}
function render() {
  var leaking = zones.filter(function(z) { return z.telemetry.leak_detected; });
  document.getElementById("banner").innerHTML = leaking.length
    ? '<div role="alert" class="glass border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"><p class="font-medium">Fuga critica detectada — caudal > 120 L/min com eletrovalvula fechada.</p><p class="text-red-200/80">' + leaking.map(function(z) { return z.name; }).join(" · ") + '. Verificar sector e gateway LoRaWAN.</p></div>'
    : "";
  document.getElementById("grid").innerHTML = zones.map(function(z) {
    var h = healthOf(z);
    var t = z.telemetry;
    var phase = PHASES[z.id] || "idle";
    var open = t.valve_status;
    var busy = phase !== "idle";
    return '<article class="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">' +
      '<header class="flex items-start justify-between gap-3"><div><h2 class="text-lg font-medium tracking-tight">' + z.name + '</h2><p class="mt-1 font-mono text-[11px] text-white/40">' + z.device_id + '</p></div>' +
      '<span class="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/70"><span class="h-2.5 w-2.5 rounded-full animate-pulse ' + pulse[h] + '"></span>' + label[h] + '</span></header>' +
      '<dl class="grid grid-cols-3 gap-3 text-sm">' +
      '<div class="rounded-xl bg-white/[0.03] px-3 py-2"><dt class="text-[10px] uppercase tracking-[0.16em] text-white/40">Caudal</dt><dd class="mt-1 font-medium tabular-nums ' + (t.flow_rate_lpm > 120 ? "text-red-400" : "") + '">' + t.flow_rate_lpm.toFixed(1) + ' <span class="text-[11px] text-white/40">L/min</span></dd></div>' +
      '<div class="rounded-xl bg-white/[0.03] px-3 py-2"><dt class="text-[10px] uppercase tracking-[0.16em] text-white/40">Humidade</dt><dd class="mt-1 font-medium tabular-nums">' + t.moisture_level.toFixed(0) + ' <span class="text-[11px] text-white/40">%</span></dd></div>' +
      '<div class="rounded-xl bg-white/[0.03] px-3 py-2"><dt class="text-[10px] uppercase tracking-[0.16em] text-white/40">Valvula</dt><dd class="mt-1 font-medium">' + (open ? "OPEN" : "CLOSED") + '</dd></div></dl>' +
      spark(HISTORY[z.id] || [], t.leak_detected) +
      '<div class="flex items-center justify-between gap-3"><div><p class="text-[11px] uppercase tracking-[0.16em] text-white/45">Override de hardware</p><p class="mt-0.5 text-sm text-white/80">' + (open ? "Eletrovalvula aberta" : "Eletrovalvula fechada") + '</p>' + (busy ? '<p class="mt-1 text-xs text-sky-300">' + phaseCopy[phase] + '</p>' : '') + '</div>' +
      '<button data-toggle="' + z.id + '" ' + (busy ? 'disabled' : '') + ' class="relative h-7 w-12 rounded-full ' + (open ? 'bg-sky-500' : 'bg-white/15') + (busy ? ' opacity-60' : '') + '"><span class="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow" style="transform:translateX(' + (open ? '1.25rem' : '0.125rem') + ');transition:transform .2s"></span></button></div></article>';
  }).join("");
  var buttons = document.querySelectorAll("[data-toggle]");
  for (var b = 0; b < buttons.length; b++) {
    buttons[b].addEventListener("click", function() {
      var id = this.getAttribute("data-toggle");
      for (var i = 0; i < zones.length; i++) if (zones[i].id === id) toggle(zones[i]);
    });
  }
}
render();
setInterval(tick, 5000);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
