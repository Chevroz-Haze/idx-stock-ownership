# IDX >=1% Shareholders Data Dashboard (`idx-ownership`)

KSEI public disclosure (`>=1%` ownership threshold) analytics dashboard for Indonesia Stock Exchange (IDX / BEI) issuers, inspired by `1pct.klinikpenyesalan.com`.

## Features
- **Ringkasan Saham:** Track KSEI `>=1%` disclosed concentration vs effective public free float (`<1%`) across IDX issuers, along with Register Tightening scores.
- **Saham Per Investor:** Portfolio breakdown grouped by major institutional, corporate, nominee, and individual shareholders (`CP`, `ID`, `IB`, `PF`, `FD`, `OT`).
- **Investor Konglo:** Conglomerate group mapping (*Grup Barito Pacific, Grup Salim, Grup Djarum, Grup Agung Sedayu & Salim, Grup Bayan, Grup Sinar Mas, Grup Saratoga & Triputra, BUMN / Danantara*).
- **Metrik Perubahan Data:** Clean Accumulation, Register Tightening, and Investor-Class Capital Drift across 1-month and 2-month windows.
- **Changelog & Register Simulator:** Chronological `>=1%` threshold crossings, slide-over issuer register inspector, interactive float absorption calculator, and CSV export.

## Local Development

```bash
npm install
npm run dev
```

## Push to `https://github.com/Chevroz-Haze/idx-ownership`

1. Download the project ZIP from AI Studio (or use the **GitHub** sync button in the top toolbar).
2. If using the terminal on your machine after extracting the ZIP:

```bash
git init
git add .
git commit -m "Initial commit: IDX >=1% Shareholders Data Dashboard"
git branch -M main
git remote add origin https://github.com/Chevroz-Haze/idx-ownership.git
git push -u origin main
```

## Deploy (Vercel / Cloudflare Pages / GitHub Pages)
- **Framework Preset:** `Vite`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
