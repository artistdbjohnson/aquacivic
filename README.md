# AquaCivic

Municipal smart-irrigation operator console for Faro. Portfolio spec aimed at Visualforma / SmartConnect.

**Live PWA:** https://aquacivic.vercel.app

Install from the browser (Add to Home Screen). Rotunda do Aeroporto boots in leak state. Toggle Parque Ribeirinho and watch `Sending Command…` → `Hardware Acknowledged` → `State Updated` (1s hardware latency, no optimistic UI).

Leak rule: `flow_rate_lpm > 120 AND valve closed` (despiste de roturas).

The public Vercel build is a standalone PWA with an in-browser LoRaWAN simulator so recruiters need nothing installed. The FastAPI engine and typed React components live under `/backend` and `/frontend` in the workspace for the architecture artifact.
