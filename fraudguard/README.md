# FRAUDGUARD

**AI-Powered 5-Layer Verification System for MPLADS**

> Detect. Verify. Investigate. Protect Public Funds.
> Smart India Hackathon 2026 · Problem Statement **SIH26102**

A production-quality interactive prototype for detecting, explaining, verifying and investigating
fraud and anomalies in MPLADS-funded public infrastructure projects.

> ⚠️ **DEMO ENVIRONMENT — All data is synthetic.** Nothing here represents real government data.
> The India state boundary shapefile is an open-source public dataset.

---

## Quick start

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## The 60–90 second judge demo flow

1. **Login** → `Enter Command Center`
2. **Command Center** — 5 KPI cards, Risk Distribution donut, AI Detection Summary, 5-Layer Engine
3. Click **"84 High-Risk Projects"** / open an action-queue item → **Project Detail**
4. See **AI Risk Score 92/100** and the 5 explainable findings
5. Click **"WHY THIS SCORE?"** → weighted factors (dup invoice +24, cost deviation +21, …) with **94% confidence, 37 evidence**
6. Click **Evidence** on a finding → open the duplicate invoice package
7. Open **Map Intelligence** → risk-colored markers on India, select a marker → popup card
8. Open **Vendor Intelligence** → network graph + "Potential Collusion Pattern Detected"
9. Open **Documents** → `RUN AI VERIFICATION` → Financial Mismatch ₹2,20,000
10. Open **Investigations** → Case #FG-2026-00421 timeline + workflow actions
11. Open **Reports** → `GENERATE AI INVESTIGATION REPORT` → full preview, Export PDF / Share / Print
12. Use the **FraudGuard AI** copilot (bottom-right) for any question

**Detect → Explain → Verify → Investigate → Act**

## Architecture

```
src/
  App.tsx                  # routing + login gate + page transitions
  store.tsx                # app-wide context (demo mode, drawers)
  index.css                # design tokens (dark navy/charcoal), components
  lib/
    data.ts                      # synthetic MPLADS portfolio data
    financialTypes.ts            # invoice / budget / finding types
    financialVerification.ts     # rule-based overbilling engine
    financialDemoData.ts         # synthetic invoices (used when Supabase has no tables)
    financialData.ts             # demo fallback + production table contract
    utils.ts
  components/
    Sidebar.tsx            # persistent nav + system status + officer profile
    Topbar.tsx             # header, sync, live-demo toggle, alerts, copilot
    AIChat.tsx             # floating FraudGuard AI copilot drawer
    AlertCenter.tsx        # notification center
    ui/
      RiskBadge  RiskScore  AnimatedNumber  Sparkline
      KpiCard    Modal      Toast
  pages/
    Login  CommandCenter  Projects  ProjectDetail
    AIDetection  MapIntelligence  Vendors  Documents
    Investigations  Reports
```

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion · Recharts ·
react-simple-maps (India state map) · Lucide icons.

### Financial verification

Layer 1 (Financial Intelligence) now runs a **transparent rule-based engine** in
`src/lib/financialVerification.ts` (no ML model). Invoice tables are **not** in the
current Supabase schema (`projects`, `vendors`, `investigations`, `profiles` only), so
the UI uses `src/lib/financialDemoData.ts` until production tables are created.

Required production tables/columns are documented in `src/lib/financialData.ts`.
Use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only — never a service-role key
in the frontend.

```bash
npm test         # financial verification unit tests
npm run typecheck
```

## Visual language

Dark navy / charcoal foundation, thin borders, soft shadows, glassmorphism used sparingly,
subtle saffron/blue accents, tabular numerals, professional charts, restrained micro-interactions.
Designed to read as a deployable government intelligence platform — not a template dashboard.
