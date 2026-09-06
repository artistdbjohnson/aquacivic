# AquaCivic

From data to dashboard. Municipal irrigation operator console for Faro — LoRaWAN samples become a Level-1 HMI. Browser simulator, leak rule (`flow > 120 L/min` with valve closed), 1s hardware-override latency, installable PWA.

## Live

Shareable PWA: https://faro-civic-pwa.vercel.app

Repo: https://github.com/artistdbjohnson/aquacivic

## Stack

Static PWA — IBM Plex Sans + Instrument Serif, white/blue water console, Level-0 health ring + three Faro faceplates, in-browser simulator, `manifest.json`, service worker `aquacivic-v8`. No build step.

## Zones

- Jardim Manuel Bívar — idle
- Parque Ribeirinho — watering
- Rotunda do Aeroporto — leak latched on load

Toggle a valve to walk Sending → Hardware Acknowledged → State Updated.

PT / EN toggle persists in localStorage.

## Local

```bash
python3 -m http.server 4173
```

Open http://localhost:4173
