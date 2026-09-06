# AquaCivic — brand test spec

Theme: **From data to dashboard** / **Dos dados ao painel**

AquaCivic turns Faro LoRaWAN irrigation samples into a Level-1 municipal operator dashboard. Not a report. Not a marketing site. A console.

## Positioning

| | |
|---|---|
| Product | Municipal irrigation operator console |
| Place | Faro, Algarve |
| Job | See three sectors. Catch a leak. Override the valve. |
| Promise | Live LoRa samples become a readable dashboard in one glance |
| Not | SaaS analytics, smart-city brochure, dark SCADA nostalgia |

One sentence: AquaCivic is the shortest path from a Class C gateway packet to an operator decision.

## Voice

Civic, bilingual, short. Portuguese first. No “unlock insights.” No “smart city of tomorrow.”

- Do: caudal, sector, eletroválvula, fuga, consola
- Don’t: platform, ecosystem, AI-powered, next-gen

## Taglines

- PT Dos dados ao painel
- EN From data to dashboard
- PT Consola municipal de rega — Faro
- EN Municipal irrigation console — Faro

## Palette (locked)

| Token | Hex | Use |
|---|---|---|
| Paper wash | `#eef4f8` | Page |
| Paper card | `#ffffff` | Faceplates |
| Ink | `#0b1f33` | Type |
| River | `#1a6fb5` | Watering, active, ring |
| River light | `#7eb6e0` | Watering slice |
| Track | `#d7e7f2` | Ring rest |
| Leak | `#c45a3c` | Alarm only |
| Mute | `#4a657c` | Secondary |

Color is scarce. Grey until something is wrong or watering.

## Type

- IBM Plex Sans — UI, numbers, labels
- Instrument Serif — sector names only
- IBM Plex Mono — device IDs

## Mark

AC monogram. The C is a canal cut — open on the right, river-blue hairline. Lockup: mark + AquaCivic + the theme line under it.

## Screen grammar (from data → dashboard)

1. Collect — LoRaWAN Class C samples
2. Evaluate — leak rule `flow > 120 L/min && valve closed`
3. Correct — 1s hardware override
4. Publish — Level-0 ring + three faceplates

Visual average of the two refs:
- Material BI: giant donut, two big numbers, sparse cream paper → our white/blue ring + A regar / Fugas
- PDCA wheel: four-step cycle around the ring → Recolher · Avaliar · Corrigir · Publicar
- ISA-101 / Alzola / GE: muted base, trend next to the value, color only for state
