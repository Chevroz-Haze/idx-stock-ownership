/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  ArrowUpDown,
  ChevronRight,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  SlidersHorizontal,
  FileSpreadsheet,
  ArrowUpRight,
  Building2,
  Users,
  Activity,
  History,
  Check,
} from 'lucide-react';
import {
  ISSUERS_DATA,
  SHAREHOLDER_POSITIONS,
  CONGLOMERATE_GROUPS,
  CHANGELOG_EVENTS,
  INVESTOR_CLASS_DRIFT_DATA,
  KSEI_CLASS_LABELS,
  IdxIssuer,
  ShareholderPosition,
  ConglomerateEntity,
  KseiInvestorClass,
  StructuralSignal,
} from './data/kseiShareholdersData';

type TabMode =
  | 'ringkasan'
  | 'per_investor'
  | 'konglo'
  | 'metrik'
  | 'changelog';

type ReportingWindow = '1M' | '2M';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabMode>('ringkasan');
  const [reportingWindow, setReportingWindow] = useState<ReportingWindow>('1M');

  // Filter states for Ringkasan Saham
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedSignal, setSelectedSignal] = useState<string>('ALL');
  const [selectedKongloFilter, setSelectedKongloFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<
    'marketCapTrillionIdr' | 'disclosedOnePctTotalPct' | 'effectiveFreeFloatPct' | 'registerTighteningScore' | 'ticker'
  >('marketCapTrillionIdr');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Selected Issuer for Deep-Dive Drawer
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  // Filter states for Saham Per Investor
  const [investorSearch, setInvestorSearch] = useState('');
  const [investorClassFilter, setInvestorClassFilter] = useState<string>('ALL');
  const [domicileFilter, setDomicileFilter] = useState<'ALL' | 'Lokal' | 'Asing'>('ALL');
  const [selectedInvestorName, setSelectedInvestorName] = useState<string | null>(null);

  // Filter states for Investor Konglo
  const [selectedKongloId, setSelectedKongloId] = useState<string>(CONGLOMERATE_GROUPS[0].id);

  // Filter states for Metrik Perubahan Data
  const [metricSubView, setMetricSubView] = useState<'ALL' | 'ACCUMULATION' | 'TIGHTENING' | 'DRIFT'>('ALL');

  // Filter states for Changelog
  const [changelogFilter, setChangelogFilter] = useState<string>('ALL');

  // Interactive ownership simulator inside issuer drawer
  const [simulatedBuyPct, setSimulatedBuyPct] = useState<number>(0);

  // Copy / Export notification state
  const [exportedFeedback, setExportedFeedback] = useState<boolean>(false);

  // Unique sectors and conglomerate groups
  const sectors = useMemo(() => {
    const set = new Set(ISSUERS_DATA.map((i) => i.sector));
    return ['ALL', ...Array.from(set)];
  }, []);

  const kongloNames = useMemo(() => {
    const set = new Set(ISSUERS_DATA.map((i) => i.conglomerateGroup));
    return ['ALL', ...Array.from(set)];
  }, []);

  // Filtered & sorted issuers for Tab 1 (Ringkasan Saham)
  const filteredIssuers = useMemo(() => {
    return ISSUERS_DATA.filter((item) => {
      const matchesSearch =
        item.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.conglomerateGroup.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector = selectedSector === 'ALL' || item.sector === selectedSector;
      const matchesSignal = selectedSignal === 'ALL' || item.primarySignal === selectedSignal;
      const matchesKonglo =
        selectedKongloFilter === 'ALL' || item.conglomerateGroup === selectedKongloFilter;
      return matchesSearch && matchesSector && matchesSignal && matchesKonglo;
    }).sort((a, b) => {
      if (sortField === 'ticker') {
        return sortAsc ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
      }
      const valA = a[sortField];
      const valB = b[sortField];
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [searchQuery, selectedSector, selectedSignal, selectedKongloFilter, sortField, sortAsc]);

  // Aggregated Investor Portfolios for Tab 2 (Saham Per Investor)
  const aggregatedInvestors = useMemo(() => {
    const map = new Map<
      string,
      {
        investorName: string;
        investorClass: KseiInvestorClass;
        domicile: 'Lokal' | 'Asing';
        conglomerateGroup: string | null;
        isControllerCount: number;
        isNominee: boolean;
        positions: Array<
          ShareholderPosition & {
            companyName: string;
            closePriceIdr: number;
            positionValueBillionIdr: number;
            deltaPct: number;
            deltaShares: number;
          }
        >;
        totalValueTrillionIdr: number;
        netMonthlyDeltaBillionIdr: number;
      }
    >();

    for (const pos of SHAREHOLDER_POSITIONS) {
      const issuer = ISSUERS_DATA.find((i) => i.ticker === pos.ticker);
      if (!issuer) continue;

      const basePct = reportingWindow === '1M' ? pos.pctPrev : pos.pctTwoMonthsAgo;
      const baseShares = reportingWindow === '1M' ? pos.sharesPrev : pos.sharesTwoMonthsAgo;
      const deltaPct = Number((pos.pctCurrent - basePct).toFixed(2));
      const deltaShares = pos.sharesCurrent - baseShares;
      const positionValueBillionIdr = (pos.sharesCurrent * issuer.closePriceIdr) / 1e9;
      const deltaValueBillionIdr = (deltaShares * issuer.closePriceIdr) / 1e9;

      const existing = map.get(pos.investorName);
      const enrichedPos = {
        ...pos,
        companyName: issuer.companyName,
        closePriceIdr: issuer.closePriceIdr,
        positionValueBillionIdr,
        deltaPct,
        deltaShares,
      };

      if (existing) {
        existing.positions.push(enrichedPos);
        existing.totalValueTrillionIdr += positionValueBillionIdr / 1000;
        existing.netMonthlyDeltaBillionIdr += deltaValueBillionIdr;
        if (pos.isController) existing.isControllerCount += 1;
      } else {
        map.set(pos.investorName, {
          investorName: pos.investorName,
          investorClass: pos.investorClass,
          domicile: pos.domicile,
          conglomerateGroup: pos.conglomerateGroup,
          isControllerCount: pos.isController ? 1 : 0,
          isNominee: pos.isNominee,
          positions: [enrichedPos],
          totalValueTrillionIdr: positionValueBillionIdr / 1000,
          netMonthlyDeltaBillionIdr: deltaValueBillionIdr,
        });
      }
    }

    return Array.from(map.values())
      .filter((inv) => {
        const matchesSearch =
          inv.investorName.toLowerCase().includes(investorSearch.toLowerCase()) ||
          inv.positions.some((p) => p.ticker.toLowerCase().includes(investorSearch.toLowerCase())) ||
          (inv.conglomerateGroup &&
            inv.conglomerateGroup.toLowerCase().includes(investorSearch.toLowerCase()));
        const matchesClass =
          investorClassFilter === 'ALL' || inv.investorClass === investorClassFilter;
        const matchesDomicile = domicileFilter === 'ALL' || inv.domicile === domicileFilter;
        return matchesSearch && matchesClass && matchesDomicile;
      })
      .sort((a, b) => b.totalValueTrillionIdr - a.totalValueTrillionIdr);
  }, [investorSearch, investorClassFilter, domicileFilter, reportingWindow]);

  // Selected Issuer Details for Drawer
  const activeIssuerDetail = useMemo(() => {
    if (!selectedTicker) return null;
    const issuer = ISSUERS_DATA.find((i) => i.ticker === selectedTicker);
    if (!issuer) return null;
    const holders = SHAREHOLDER_POSITIONS.filter((p) => p.ticker === selectedTicker).sort(
      (a, b) => b.pctCurrent - a.pctCurrent
    );
    const events = CHANGELOG_EVENTS.filter((e) => e.ticker === selectedTicker);
    return { issuer, holders, events };
  }, [selectedTicker]);

  // Global summary metrics for top analytical strip
  const summaryStats = useMemo(() => {
    const totalMarketCapT = ISSUERS_DATA.reduce((acc, i) => acc + i.marketCapTrillionIdr, 0);
    const avgDisclosedPct =
      ISSUERS_DATA.reduce((acc, i) => acc + i.disclosedOnePctTotalPct, 0) / ISSUERS_DATA.length;
    const avgFreeFloatPct =
      ISSUERS_DATA.reduce((acc, i) => acc + i.effectiveFreeFloatPct, 0) / ISSUERS_DATA.length;
    const highTighteningCount = ISSUERS_DATA.filter((i) => i.registerTighteningScore >= 85).length;
    return {
      totalMarketCapT,
      avgDisclosedPct,
      avgFreeFloatPct,
      highTighteningCount,
    };
  }, []);

  // CSV Export Handler
  const handleExportCsv = () => {
    const headers = [
      'Ticker',
      'Company Name',
      'Sector',
      'Conglomerate Group',
      'Close Price (IDR)',
      'Market Cap (IDR T)',
      'KSEI >=1% Disclosed (%)',
      'Effective Free Float (%)',
      '>=1% Holders Count',
      'Register Tightening Score',
      'Primary Signal',
      'Last KSEI Filing',
    ];

    const rows = filteredIssuers.map((i) => [
      i.ticker,
      `"${i.companyName}"`,
      `"${i.sector}"`,
      `"${i.conglomerateGroup}"`,
      i.closePriceIdr,
      i.marketCapTrillionIdr.toFixed(2),
      i.disclosedOnePctTotalPct.toFixed(2),
      i.effectiveFreeFloatPct.toFixed(2),
      i.holderCountCurrent,
      i.registerTighteningScore,
      `"${i.primarySignal}"`,
      i.lastKseiFilingDate,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ksei_1pct_ownership_${reportingWindow}_oct2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportedFeedback(true);
    setTimeout(() => setExportedFeedback(false), 2500);
  };

  const handleSort = (
    field:
      | 'marketCapTrillionIdr'
      | 'disclosedOnePctTotalPct'
      | 'effectiveFreeFloatPct'
      | 'registerTighteningScore'
      | 'ticker'
  ) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'ticker');
    }
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(Math.round(num));

  const formatSharesCompact = (shares: number) => {
    const abs = Math.abs(shares);
    const sign = shares < 0 ? '-' : shares > 0 ? '+' : '';
    if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
    return `${sign}${formatNumber(abs)}`;
  };

  const getSignalColorClass = (signal: StructuralSignal | string) => {
    switch (signal) {
      case 'Clean Accumulation':
      case 'New >=1% Entry':
        return 'text-emerald-400';
      case 'Register Tightening':
        return 'text-amber-400';
      case 'Distribution / Exit':
      case 'Below 1% Floor Exit':
      case 'Partial Trim':
        return 'text-rose-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Navigation Bar - Strict 3-Zone Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#090D16]/95 backdrop-blur border-b border-slate-800/80">
        {/* Zone 1: Brand Title (single text element, one line) */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('ringkasan');
          }}
          className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 font-display"
        >
          1PCT · Klinik Penyesalan
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('ringkasan')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'ringkasan'
                ? 'text-white border-emerald-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Ringkasan Saham
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('per_investor')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'per_investor'
                ? 'text-white border-emerald-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Saham Per Investor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('konglo')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'konglo'
                ? 'text-white border-emerald-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Investor Konglo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('metrik')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'metrik'
                ? 'text-white border-emerald-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Metrik Perubahan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('changelog')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'changelog'
                ? 'text-white border-emerald-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Changelog
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {exportedFeedback ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>CSV Exported</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Workspace Header & Period Comparison Control Bar */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>KSEI Public Disclosure Register (≥1% Ownership Threshold)</span>
              <span aria-hidden="true">·</span>
              <span>Bursa Efek Indonesia (IDX)</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-300">
                Cut-off: 19 Okt 2026
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
              1% Shareholders Ownership &amp; Float Concentration
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl">
              Track structural accumulation, conglomerate holding vehicles, nominee custody shifts, and
              register tightening across IDX issuers using verified KSEI ≥1% disclosures.
            </p>
          </div>

          {/* Interactive Workspace Toolbar: Mobile Navigation + Reporting Window Selector */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setReportingWindow('1M')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  reportingWindow === '1M'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                MoM Delta (Sep vs Agu 2026)
              </button>
              <button
                type="button"
                onClick={() => setReportingWindow('2M')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  reportingWindow === '2M'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2-Month Drift (Sep vs Jul 2026)
              </button>
            </div>
          </div>
        </section>

        {/* Mobile Tab Switcher (Visible below md breakpoint) */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto p-1 bg-slate-900 border border-slate-800 rounded-lg">
          {[
            { id: 'ringkasan', label: 'Ringkasan Saham' },
            { id: 'per_investor', label: 'Per Investor' },
            { id: 'konglo', label: 'Investor Konglo' },
            { id: 'metrik', label: 'Metrik Perubahan' },
            { id: 'changelog', label: 'Changelog' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as TabMode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === t.id
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Full-Width 4-Column KPI Analytical Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-[#0F1624] border border-slate-800/90 rounded-lg">
            <div className="text-xs text-slate-400">Tracked ≥1% Issuer Market Cap</div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-white">
                Rp {formatNumber(summaryStats.totalMarketCapT)} T
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {ISSUERS_DATA.length} Major Issuers
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              81.4% of total IDX composite capitalization
            </div>
          </div>

          <div className="p-4 bg-[#0F1624] border border-slate-800/90 rounded-lg">
            <div className="text-xs text-slate-400">Mean ≥1% Disclosed Concentration</div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
                {summaryStats.avgDisclosedPct.toFixed(2)}%
              </span>
              <span className="text-xs font-mono tabular-nums text-emerald-400/90">
                +0.42% vs Prev Period
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Locked by controllers, institutions &amp; nominees
            </div>
          </div>

          <div className="p-4 bg-[#0F1624] border border-slate-800/90 rounded-lg">
            <div className="text-xs text-slate-400">Mean Effective Retail / Public Float</div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-amber-400">
                {summaryStats.avgFreeFloatPct.toFixed(2)}%
              </span>
              <span className="text-xs font-mono tabular-nums text-amber-400/90">
                -0.42% Float Compression
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Unregistered holdings below 1.00% KSEI threshold
            </div>
          </div>

          <div className="p-4 bg-[#0F1624] border border-slate-800/90 rounded-lg">
            <div className="text-xs text-slate-400">Extreme Tightened Registers (≥85 Score)</div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-white">
                {summaryStats.highTighteningCount} Emiten
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                Float &lt; 17%
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              TPIA · PANI · BREN · DSSA · CUAN · BYAN · AMMN
            </div>
          </div>
        </section>

        {/* =====================================================================
            TAB 1: RINGKASAN SAHAM (STOCK SUMMARY & FLOAT CONCENTRATION MATRIX)
           ===================================================================== */}
        {activeTab === 'ringkasan' && (
          <section className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 bg-[#0F1624] border border-slate-800/90 rounded-lg">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kode saham (BBCA, BREN, BUMI), nama emiten, atau grup konglomerasi..."
                  className="w-full pl-10 pr-8 py-2 bg-slate-950/90 border border-slate-800 rounded-md text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  aria-label="Filter Sector"
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-md text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {sectors.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec === 'ALL' ? 'Semua Sektor IDX' : `Sektor: ${sec}`}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter Conglomerate"
                  value={selectedKongloFilter}
                  onChange={(e) => setSelectedKongloFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-md text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {kongloNames.map((k) => (
                    <option key={k} value={k}>
                      {k === 'ALL' ? 'Semua Grup Konglomerasi' : k}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter Structural Signal"
                  value={selectedSignal}
                  onChange={(e) => setSelectedSignal(e.target.value)}
                  className="px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-md text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Semua Sinyal Struktural</option>
                  <option value="Clean Accumulation">Clean Accumulation</option>
                  <option value="Register Tightening">Register Tightening</option>
                  <option value="New >=1% Entry">New ≥1% Entry</option>
                  <option value="Distribution / Exit">Distribution / Exit</option>
                  <option value="Below 1% Floor Exit">Below 1% Floor Exit</option>
                  <option value="Stable Core">Stable Core</option>
                </select>

                {(searchQuery ||
                  selectedSector !== 'ALL' ||
                  selectedSignal !== 'ALL' ||
                  selectedKongloFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSector('ALL');
                      setSelectedSignal('ALL');
                      setSelectedKongloFilter('ALL');
                    }}
                    className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {/* High-Density Data Grid */}
            <div className="bg-[#0F1624] border border-slate-800/90 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400">
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleSort('ticker')}
                          className="inline-flex items-center gap-1 hover:text-white cursor-pointer whitespace-nowrap"
                        >
                          <span>Emiten / Grup</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSort('marketCapTrillionIdr')}
                          className="inline-flex items-center justify-end gap-1 hover:text-white cursor-pointer whitespace-nowrap ml-auto"
                        >
                          <span>Harga &amp; Market Cap</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 min-w-[230px]">
                        <button
                          type="button"
                          onClick={() => handleSort('disclosedOnePctTotalPct')}
                          className="inline-flex items-center gap-1 hover:text-white cursor-pointer whitespace-nowrap"
                        >
                          <span>Struktur KSEI ≥1% vs Free Float</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSort('effectiveFreeFloatPct')}
                          className="inline-flex items-center justify-end gap-1 hover:text-white cursor-pointer whitespace-nowrap ml-auto"
                        >
                          <span>Free Float (&lt;1%)</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-3 text-right whitespace-nowrap">
                        Pemegang ≥1%
                      </th>
                      <th className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSort('registerTighteningScore')}
                          className="inline-flex items-center justify-end gap-1 hover:text-white cursor-pointer whitespace-nowrap ml-auto"
                        >
                          <span>Tightening Score</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 whitespace-nowrap">Sinyal Struktural KSEI</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-sm">
                    {filteredIssuers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <p className="text-sm">
                            Tidak ada emiten yang cocok dengan filter pencarian Anda.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedSector('ALL');
                              setSelectedSignal('ALL');
                              setSelectedKongloFilter('ALL');
                            }}
                            className="mt-3 px-4 py-2 text-xs font-medium text-slate-950 bg-emerald-400 rounded-md hover:bg-emerald-300 transition-colors"
                          >
                            Tampilkan Semua Emiten
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredIssuers.map((issuer) => {
                        const holderDelta = issuer.holderCountCurrent - issuer.holderCountPrev;
                        return (
                          <tr
                            key={issuer.ticker}
                            onClick={() => {
                              setSelectedTicker(issuer.ticker);
                              setSimulatedBuyPct(0);
                            }}
                            className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                          >
                            {/* Emiten & Grup */}
                            <td className="py-3 px-4">
                              <div className="flex items-baseline gap-2">
                                <span className="font-mono font-bold text-white group-hover:text-emerald-400 transition-colors">
                                  {issuer.ticker}
                                </span>
                                <span className="text-xs text-slate-400 truncate max-w-[200px]">
                                  {issuer.companyName}
                                </span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                                <span>{issuer.sector}</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-slate-400">{issuer.conglomerateGroup}</span>
                              </div>
                            </td>

                            {/* Close Price & Market Cap */}
                            <td className="py-3 px-3 text-right font-mono tabular-nums">
                              <div className="text-slate-200 font-medium">
                                Rp {formatNumber(issuer.closePriceIdr)}
                              </div>
                              <div className="text-xs text-slate-500">
                                Rp {issuer.marketCapTrillionIdr.toFixed(2)} T
                              </div>
                            </td>

                            {/* Ownership Split Bar */}
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-between text-xs font-mono tabular-nums mb-1">
                                <span className="text-emerald-400 font-medium">
                                  ≥1%: {issuer.disclosedOnePctTotalPct.toFixed(2)}%
                                </span>
                                <span className="text-slate-400">
                                  Publik: {issuer.effectiveFreeFloatPct.toFixed(2)}%
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-800 rounded-xs overflow-hidden flex">
                                <div
                                  className="h-full bg-emerald-500"
                                  style={{ width: `${issuer.disclosedOnePctTotalPct}%` }}
                                />
                                <div
                                  className="h-full bg-slate-600"
                                  style={{ width: `${issuer.effectiveFreeFloatPct}%` }}
                                />
                              </div>
                            </td>

                            {/* Effective Free Float */}
                            <td className="py-3 px-3 text-right font-mono tabular-nums">
                              <span
                                className={`font-semibold ${
                                  issuer.effectiveFreeFloatPct < 15
                                    ? 'text-amber-400'
                                    : 'text-slate-200'
                                }`}
                              >
                                {issuer.effectiveFreeFloatPct.toFixed(2)}%
                              </span>
                              <div className="text-xs text-slate-500">
                                {issuer.effectiveFreeFloatPct < 15 ? 'Float Ketat' : 'Likuid'}
                              </div>
                            </td>

                            {/* Disclosed Holders Count */}
                            <td className="py-3 px-3 text-right font-mono tabular-nums">
                              <div className="text-slate-200 font-medium">
                                {issuer.holderCountCurrent} Entitas
                              </div>
                              <div className="text-xs text-slate-500">
                                {holderDelta > 0
                                  ? `+${holderDelta} baru`
                                  : holderDelta < 0
                                  ? `${holderDelta} keluar`
                                  : 'Stabil'}
                              </div>
                            </td>

                            {/* Register Tightening Score */}
                            <td className="py-3 px-3 text-right font-mono tabular-nums">
                              <div
                                className={`font-bold ${
                                  issuer.registerTighteningScore >= 85
                                    ? 'text-amber-400'
                                    : issuer.registerTighteningScore >= 70
                                    ? 'text-emerald-400'
                                    : 'text-slate-300'
                                }`}
                              >
                                {issuer.registerTighteningScore}/100
                              </div>
                              <div className="text-xs text-slate-500">
                                {issuer.registerTighteningScore >= 85
                                  ? 'High Concentration'
                                  : 'Moderate'}
                              </div>
                            </td>

                            {/* Primary Structural Signal (Clean unboxed metadata) */}
                            <td className="py-3 px-4">
                              <div
                                className={`text-xs font-semibold ${getSignalColorClass(
                                  issuer.primarySignal
                                )}`}
                              >
                                {issuer.primarySignal}
                              </div>
                              <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                                Update: {issuer.lastKseiFilingDate}
                              </div>
                            </td>

                            {/* Action */}
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTicker(issuer.ticker);
                                  setSimulatedBuyPct(0);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 whitespace-nowrap"
                              >
                                <span>Bedah KSEI</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            TAB 2: SAHAM PER INVESTOR (PORTFOLIOS BY MAJOR INVESTOR / INSTITUTION)
           ===================================================================== */}
        {activeTab === 'per_investor' && (
          <section className="space-y-4">
            {/* Search and Classification Controls */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 bg-[#0F1624] border border-slate-800/90 rounded-lg">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={investorSearch}
                  onChange={(e) => setInvestorSearch(e.target.value)}
                  placeholder="Cari nama pemegang saham (Prajogo Pangestu, BPJS, Salim, GIC, Dwimuria)..."
                  className="w-full pl-10 pr-8 py-2 bg-slate-950/90 border border-slate-800 rounded-md text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {investorSearch && (
                  <button
                    type="button"
                    onClick={() => setInvestorSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  aria-label="Filter KSEI Investor Class"
                  value={investorClassFilter}
                  onChange={(e) => setInvestorClassFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-md text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Semua Kelas Investor KSEI</option>
                  {Object.entries(KSEI_CLASS_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-md">
                  {(['ALL', 'Lokal', 'Asing'] as const).map((dom) => (
                    <button
                      key={dom}
                      type="button"
                      onClick={() => setDomicileFilter(dom)}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        domicileFilter === dom
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {dom === 'ALL' ? 'Semua Domisili' : dom}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Investor Portfolios Table */}
            <div className="bg-[#0F1624] border border-slate-800/90 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400">
                      <th className="py-3 px-4">Nama Investor / Entitas KSEI</th>
                      <th className="py-3 px-3">Klasifikasi &amp; Domisili</th>
                      <th className="py-3 px-4">Portofolio Saham (≥1% Stake)</th>
                      <th className="py-3 px-3 text-right">Estimasi Nilai Portofolio</th>
                      <th className="py-3 px-3 text-right">
                        Net Flow ({reportingWindow === '1M' ? '1M' : '2M'})
                      </th>
                      <th className="py-3 px-4 text-right">Rincian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-sm">
                    {aggregatedInvestors.map((inv) => {
                      const isExpanded = selectedInvestorName === inv.investorName;
                      return (
                        <React.Fragment key={inv.investorName}>
                          <tr
                            onClick={() =>
                              setSelectedInvestorName(isExpanded ? null : inv.investorName)
                            }
                            className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                          >
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-white">{inv.investorName}</div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                {inv.conglomerateGroup ? (
                                  <span className="text-slate-400">{inv.conglomerateGroup}</span>
                                ) : (
                                  <span>Independent / Institutional Holder</span>
                                )}
                                {inv.isControllerCount > 0 && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-emerald-400">
                                      Pengendali ({inv.isControllerCount} Emiten)
                                    </span>
                                  </>
                                )}
                                {inv.isNominee && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-amber-400">Custodian / Nominee Account</span>
                                  </>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-xs text-slate-300">
                              <div className="font-mono">{inv.investorClass}</div>
                              <div className="text-slate-500">
                                {inv.domicile} · {KSEI_CLASS_LABELS[inv.investorClass]}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono tabular-nums">
                                {inv.positions.map((pos) => (
                                  <button
                                    key={pos.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTicker(pos.ticker);
                                      setSimulatedBuyPct(0);
                                    }}
                                    className="inline-flex items-center gap-1 text-slate-200 hover:text-emerald-400 underline decoration-slate-700 underline-offset-4 cursor-pointer"
                                  >
                                    <span className="font-bold">{pos.ticker}</span>
                                    <span className="text-slate-400">({pos.pctCurrent.toFixed(2)}%)</span>
                                    {pos.deltaPct !== 0 && (
                                      <span
                                        className={
                                          pos.deltaPct > 0 ? 'text-emerald-400' : 'text-rose-400'
                                        }
                                      >
                                        {pos.deltaPct > 0 ? `+${pos.deltaPct}%` : `${pos.deltaPct}%`}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                              <div className="font-semibold text-white">
                                Rp {inv.totalValueTrillionIdr.toFixed(2)} T
                              </div>
                              <div className="text-xs text-slate-500">
                                {inv.positions.length} Posisi Terbuka
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                              <div
                                className={`font-semibold ${
                                  inv.netMonthlyDeltaBillionIdr > 0
                                    ? 'text-emerald-400'
                                    : inv.netMonthlyDeltaBillionIdr < 0
                                    ? 'text-rose-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {inv.netMonthlyDeltaBillionIdr > 0 ? '+' : ''}
                                Rp {formatNumber(inv.netMonthlyDeltaBillionIdr)} M
                              </div>
                              <div className="text-xs text-slate-500">
                                {inv.netMonthlyDeltaBillionIdr > 0
                                  ? 'Net Accumulation'
                                  : inv.netMonthlyDeltaBillionIdr < 0
                                  ? 'Net Distribution'
                                  : 'Unchanged'}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <span className="text-xs font-medium text-emerald-400">
                                {isExpanded ? 'Tutup' : 'Buka Portofolio'}
                              </span>
                            </td>
                          </tr>

                          {/* Expanded Investor Holdings Breakdown */}
                          {isExpanded && (
                            <tr className="bg-slate-950/80">
                              <td colSpan={6} className="p-4 border-t border-slate-800/80">
                                <div className="text-xs font-semibold text-slate-300 mb-3">
                                  Rincian Kepemilikan KSEI ≥1% — {inv.investorName}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {inv.positions.map((p) => (
                                    <div
                                      key={p.id}
                                      onClick={() => {
                                        setSelectedTicker(p.ticker);
                                        setSimulatedBuyPct(0);
                                      }}
                                      className="p-3 bg-[#0F1624] border border-slate-800 rounded-md hover:border-slate-700 cursor-pointer transition-colors"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-white">
                                          {p.ticker} · {p.pctCurrent.toFixed(2)}%
                                        </span>
                                        <span
                                          className={`text-xs font-mono tabular-nums ${
                                            p.deltaPct > 0
                                              ? 'text-emerald-400'
                                              : p.deltaPct < 0
                                              ? 'text-rose-400'
                                              : 'text-slate-400'
                                          }`}
                                        >
                                          {p.deltaPct > 0
                                            ? `+${p.deltaPct}%`
                                            : p.deltaPct < 0
                                            ? `${p.deltaPct}%`
                                            : '0.00%'}
                                        </span>
                                      </div>
                                      <div className="text-xs text-slate-400 mt-0.5 truncate">
                                        {p.companyName}
                                      </div>
                                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono tabular-nums text-slate-300">
                                        <span>{formatSharesCompact(p.sharesCurrent)} lembar</span>
                                        <span>Rp {(p.positionValueBillionIdr / 1000).toFixed(2)} T</span>
                                      </div>
                                      <div className="mt-1 text-[11px] text-slate-500 truncate">
                                        Kustodian: {p.custodianName}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            TAB 3: INVESTOR KONGLO (CONGLOMERATE GROUP MAPPING & KONGLO METRIK)
           ===================================================================== */}
        {activeTab === 'konglo' && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Conglomerate Selector List */}
            <div className="lg:col-span-5 space-y-2.5">
              <div className="text-xs font-semibold text-slate-400 px-1">
                Pilih Kelompok Usaha / Gurita Konglomerasi IDX ({CONGLOMERATE_GROUPS.length} Grup Utama)
              </div>
              {CONGLOMERATE_GROUPS.map((konglo) => {
                const isSelected = konglo.id === selectedKongloId;
                return (
                  <button
                    key={konglo.id}
                    type="button"
                    onClick={() => setSelectedKongloId(konglo.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500/70'
                        : 'bg-[#0F1624] border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-sm font-bold text-white font-display">
                        {konglo.groupName}
                      </h3>
                      <span className="font-mono text-xs font-semibold tabular-nums text-emerald-400 shrink-0">
                        Rp {formatNumber(konglo.totalDisclosedMarketCapT)} T
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{konglo.keyPrincipals}</div>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/80 text-xs font-mono tabular-nums">
                      <span className="text-slate-300">
                        Emiten: {konglo.flagshipTickers.join(' · ')}
                      </span>
                      <span className="text-amber-400">
                        Avg Float: {konglo.avgEffectiveFreeFloatPct.toFixed(1)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Active Conglomerate Deep-Dive Matrix */}
            <div className="lg:col-span-7">
              {(() => {
                const activeKonglo =
                  CONGLOMERATE_GROUPS.find((k) => k.id === selectedKongloId) ||
                  CONGLOMERATE_GROUPS[0];
                const groupIssuers = ISSUERS_DATA.filter((i) =>
                  activeKonglo.flagshipTickers.includes(i.ticker)
                );
                const groupPositions = SHAREHOLDER_POSITIONS.filter((p) =>
                  activeKonglo.flagshipTickers.includes(p.ticker)
                );

                return (
                  <div className="bg-[#0F1624] border border-slate-800/90 rounded-lg p-6 space-y-6">
                    <div className="border-b border-slate-800 pb-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>Peta Kepemilikan Grup Konglomerasi</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-400 font-medium">
                          Stance: {activeKonglo.structuralStance}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-white mt-1 font-display">
                        {activeKonglo.groupName}
                      </h2>
                      <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                        {activeKonglo.notes}
                      </p>
                    </div>

                    {/* Key Conglomerate Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-md">
                        <div className="text-xs text-slate-400">Mean Control Concentration</div>
                        <div className="mt-1 text-lg font-bold font-mono tabular-nums text-white">
                          {activeKonglo.avgControlOwnershipPct.toFixed(2)}%
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Rata-rata kunci register KSEI
                        </div>
                      </div>
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-md">
                        <div className="text-xs text-slate-400">Mean Public Free Float</div>
                        <div className="mt-1 text-lg font-bold font-mono tabular-nums text-amber-400">
                          {activeKonglo.avgEffectiveFreeFloatPct.toFixed(2)}%
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Sisa likuiditas ritel &amp; publik
                        </div>
                      </div>
                      <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-md">
                        <div className="text-xs text-slate-400">Net Monthly Flow (KSEI)</div>
                        <div className="mt-1 text-lg font-bold font-mono tabular-nums text-emerald-400">
                          +Rp {formatNumber(activeKonglo.netMonthlyFlowIdrBillion)} M
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Akumulasi bersih kendaraan grup
                        </div>
                      </div>
                    </div>

                    {/* Holding Vehicles List */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 mb-2">
                        Kendaraan Investasi Utama &amp; Nominee Terafiliasi
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-200 font-mono">
                        {activeKonglo.primaryVehicleEntities.map((veh, idx) => (
                          <React.Fragment key={veh}>
                            <span>{veh}</span>
                            {idx < activeKonglo.primaryVehicleEntities.length - 1 && (
                              <span className="text-slate-600" aria-hidden="true">
                                ·
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {/* Tracked Issuers under this Conglomerate */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-slate-400">
                        Daftar Emiten Terkendali dalam Database ≥1% KSEI
                      </h3>
                      <div className="divide-y divide-slate-800 border border-slate-800 rounded-md overflow-hidden">
                        {groupIssuers.map((iss) => (
                          <div
                            key={iss.ticker}
                            onClick={() => {
                              setSelectedTicker(iss.ticker);
                              setSimulatedBuyPct(0);
                            }}
                            className="p-3.5 bg-slate-950/50 hover:bg-slate-800/50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white">
                                  {iss.ticker}
                                </span>
                                <span className="text-xs text-slate-300">{iss.companyName}</span>
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {iss.subSector} · Tightening Score: {iss.registerTighteningScore}/100
                              </div>
                            </div>
                            <div className="flex items-center gap-6 font-mono tabular-nums text-xs">
                              <div className="text-right">
                                <div className="text-emerald-400">
                                  ≥1%: {iss.disclosedOnePctTotalPct.toFixed(2)}%
                                </div>
                                <div className="text-slate-400">
                                  Float: {iss.effectiveFreeFloatPct.toFixed(2)}%
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Direct Shareholder Lines for this Conglomerate */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-slate-400">
                        Baris Kepemilikan Langsung di KSEI ({groupPositions.length} Posisi)
                      </h3>
                      <div className="overflow-x-auto border border-slate-800 rounded-md">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                              <th className="py-2 px-3">Saham</th>
                              <th className="py-2 px-3">Nama Pemegang KSEI</th>
                              <th className="py-2 px-3 text-right">Porsi (%)</th>
                              <th className="py-2 px-3 text-right">Perubahan (1M)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                            {groupPositions.map((pos) => {
                              const delta = Number((pos.pctCurrent - pos.pctPrev).toFixed(2));
                              return (
                                <tr key={pos.id} className="hover:bg-slate-900/60">
                                  <td className="py-2 px-3 font-bold text-white">{pos.ticker}</td>
                                  <td className="py-2 px-3 font-sans text-slate-300">
                                    {pos.investorName}
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-200">
                                    {pos.pctCurrent.toFixed(2)}%
                                  </td>
                                  <td
                                    className={`py-2 px-3 text-right ${
                                      delta > 0
                                        ? 'text-emerald-400'
                                        : delta < 0
                                        ? 'text-rose-400'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    {delta > 0 ? `+${delta}%` : delta < 0 ? `${delta}%` : '0.00%'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>
        )}

        {/* =====================================================================
            TAB 4: METRIK PERUBAHAN DATA (STRUCTURAL OWNERSHIP-CHANGE REPORT)
           ===================================================================== */}
        {activeTab === 'metrik' && (
          <section className="space-y-6">
            {/* Sub-view filter bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0F1624] border border-slate-800/90 rounded-lg">
              <div>
                <h2 className="text-base font-bold text-white font-display">
                  Laporan Metrik Perubahan Kepemilikan Bulanan KSEI
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Membedah Clean Accumulation, Register Tightening, dan Investor-Class Drift antar
                  periode pelaporan.
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                {[
                  { id: 'ALL', label: 'Semua Metrik' },
                  { id: 'ACCUMULATION', label: 'Clean Accumulation' },
                  { id: 'TIGHTENING', label: 'Register Tightening' },
                  { id: 'DRIFT', label: 'Investor-Class Drift' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetricSubView(m.id as typeof metricSubView)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      metricSubView === m.id
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Section A: Clean Accumulation & Distribution Matrix */}
            {(metricSubView === 'ALL' || metricSubView === 'ACCUMULATION') && (
              <div className="bg-[#0F1624] border border-slate-800/90 rounded-lg p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white font-display">
                      01. Clean Accumulation vs Structural Distribution Matrix
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Posisi pemegang saham ≥1% dengan akumulasi atau distribusi lembar saham
                      terbesar pada jendela {reportingWindow === '1M' ? '1 Bulan' : '2 Bulan'}.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs text-slate-400">
                        <th className="py-2.5 px-3">Saham</th>
                        <th className="py-2.5 px-3">Pemegang Saham KSEI (≥1%)</th>
                        <th className="py-2.5 px-3">Kelas</th>
                        <th className="py-2.5 px-3 text-right">Porsi Awal</th>
                        <th className="py-2.5 px-3 text-right">Porsi Kini</th>
                        <th className="py-2.5 px-3 text-right">Delta (%)</th>
                        <th className="py-2.5 px-3 text-right">Perubahan Lembar</th>
                        <th className="py-2.5 px-3">Klasifikasi Sinyal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {SHAREHOLDER_POSITIONS.filter((p) => {
                        const basePct =
                          reportingWindow === '1M' ? p.pctPrev : p.pctTwoMonthsAgo;
                        return Math.abs(p.pctCurrent - basePct) > 0.001;
                      })
                        .sort((a, b) => {
                          const deltaA =
                            a.pctCurrent -
                            (reportingWindow === '1M' ? a.pctPrev : a.pctTwoMonthsAgo);
                          const deltaB =
                            b.pctCurrent -
                            (reportingWindow === '1M' ? b.pctPrev : b.pctTwoMonthsAgo);
                          return Math.abs(deltaB) - Math.abs(deltaA);
                        })
                        .map((pos) => {
                          const basePct =
                            reportingWindow === '1M' ? pos.pctPrev : pos.pctTwoMonthsAgo;
                          const baseShares =
                            reportingWindow === '1M' ? pos.sharesPrev : pos.sharesTwoMonthsAgo;
                          const deltaPct = Number((pos.pctCurrent - basePct).toFixed(2));
                          const deltaShares = pos.sharesCurrent - baseShares;
                          return (
                            <tr
                              key={pos.id}
                              onClick={() => {
                                setSelectedTicker(pos.ticker);
                                setSimulatedBuyPct(0);
                              }}
                              className="hover:bg-slate-800/40 cursor-pointer"
                            >
                              <td className="py-2.5 px-3 font-mono font-bold text-white">
                                {pos.ticker}
                              </td>
                              <td className="py-2.5 px-3 text-slate-200">{pos.investorName}</td>
                              <td className="py-2.5 px-3 font-mono text-xs text-slate-400">
                                {pos.investorClass} · {pos.domicile}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-400">
                                {basePct.toFixed(2)}%
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-white font-semibold">
                                {pos.pctCurrent.toFixed(2)}%
                              </td>
                              <td
                                className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                                  deltaPct > 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {deltaPct > 0 ? `+${deltaPct.toFixed(2)}%` : `${deltaPct.toFixed(2)}%`}
                              </td>
                              <td
                                className={`py-2.5 px-3 text-right font-mono tabular-nums ${
                                  deltaShares > 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {formatSharesCompact(deltaShares)}
                              </td>
                              <td
                                className={`py-2.5 px-3 text-xs font-semibold ${getSignalColorClass(
                                  pos.signal
                                )}`}
                              >
                                {pos.signal}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section B: Register Tightening Leaderboard */}
            {(metricSubView === 'ALL' || metricSubView === 'TIGHTENING') && (
              <div className="bg-[#0F1624] border border-slate-800/90 rounded-lg p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white font-display">
                    02. Register Tightening &amp; Free-Float Compression Index
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mengukur seberapa ketat pasokan saham publik akibat penyerapan ke dalam akun
                    pemegang saham ≥1%. Semakin tinggi skor, semakin tipis likuiditas order book.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...ISSUERS_DATA]
                    .sort((a, b) => b.registerTighteningScore - a.registerTighteningScore)
                    .slice(0, 9)
                    .map((iss, idx) => (
                      <div
                        key={iss.ticker}
                        onClick={() => {
                          setSelectedTicker(iss.ticker);
                          setSimulatedBuyPct(0);
                        }}
                        className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-md hover:border-slate-700 cursor-pointer transition-colors space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-500">
                              0{idx + 1}.
                            </span>
                            <span className="font-mono font-bold text-white">{iss.ticker}</span>
                            <span className="text-xs text-slate-400 truncate max-w-[140px]">
                              {iss.companyName}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-bold text-amber-400 tabular-nums">
                            Score {iss.registerTighteningScore}/100
                          </span>
                        </div>

                        <div className="w-full h-2 bg-slate-800 rounded-xs overflow-hidden flex">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${iss.disclosedOnePctTotalPct}%` }}
                          />
                          <div
                            className="h-full bg-amber-500"
                            style={{ width: `${iss.effectiveFreeFloatPct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-300">
                          <span>KSEI ≥1%: {iss.disclosedOnePctTotalPct.toFixed(2)}%</span>
                          <span className="text-amber-400">
                            Free Float: {iss.effectiveFreeFloatPct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Section C: Investor-Class Drift */}
            {(metricSubView === 'ALL' || metricSubView === 'DRIFT') && (
              <div className="bg-[#0F1624] border border-slate-800/90 rounded-lg p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white font-display">
                    03. Investor-Class Capital Drift (Rotasi Antar Kelas Investor KSEI)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Perbandingan nilai kepemilikan dan rotasi modal bersih antar kategori institusi
                    KSEI (CP, OT, ID, PF, IB, FD).
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs text-slate-400">
                        <th className="py-2.5 px-3">Kelas Investor KSEI</th>
                        <th className="py-2.5 px-3 text-right">Nilai Periode Lalu</th>
                        <th className="py-2.5 px-3 text-right">Nilai Saat Ini</th>
                        <th className="py-2.5 px-3 text-right">Porsi Total KSEI</th>
                        <th className="py-2.5 px-3 text-right">Net Flow Bulanan</th>
                        <th className="py-2.5 px-3">Top Akumulasi</th>
                        <th className="py-2.5 px-3">Top Distribusi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {INVESTOR_CLASS_DRIFT_DATA.map((row) => (
                        <tr key={row.investorClass} className="hover:bg-slate-800/30">
                          <td className="py-3 px-3 font-medium text-white">{row.label}</td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-400">
                            Rp {formatNumber(row.shareValueTrillionPrev)} T
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-white font-semibold">
                            Rp {formatNumber(row.shareValueTrillionCurrent)} T
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                            {row.pctOfTotalDisclosed.toFixed(1)}%
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-mono tabular-nums font-bold ${
                              row.netMonthlyDeltaBillionIdr > 0
                                ? 'text-emerald-400'
                                : row.netMonthlyDeltaBillionIdr < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {row.netMonthlyDeltaBillionIdr > 0 ? '+' : ''}
                            Rp {formatNumber(row.netMonthlyDeltaBillionIdr)} M
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-emerald-400">
                            {row.topAccumulatedTickers.length > 0
                              ? row.topAccumulatedTickers.join(' · ')
                              : '—'}
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-rose-400">
                            {row.topDistributedTickers.length > 0
                              ? row.topDistributedTickers.join(' · ')
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* =====================================================================
            TAB 5: CHANGELOG (DISCLOSURE FEED & >=1% THRESHOLD CROSSINGS)
           ===================================================================== */}
        {activeTab === 'changelog' && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#0F1624] border border-slate-800/90 rounded-lg">
              <div>
                <h2 className="text-base font-bold text-white font-display">
                  KSEI ≥1% Filing Changelog &amp; Threshold Crossings
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Log kronologis perubahan posisi signifikan, masuknya pemegang saham ≥1% baru, dan
                  keluarnya institusi ke bawah ambang 1.00%.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                {[
                  { id: 'ALL', label: 'Semua Perubahan' },
                  { id: 'Clean Accumulation', label: 'Accumulation' },
                  { id: 'Register Tightening', label: 'Tightening' },
                  { id: 'New >=1% Entry', label: 'New ≥1% Entry' },
                  { id: 'Below 1% Floor Exit', label: 'Floor Exit (<1%)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setChangelogFilter(f.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      changelogFilter === f.id
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0F1624] border border-slate-800/90 rounded-lg divide-y divide-slate-800/80">
              {CHANGELOG_EVENTS.filter(
                (ev) => changelogFilter === 'ALL' || ev.eventType === changelogFilter
              ).map((ev) => {
                const deltaPct = Number((ev.pctAfter - ev.pctBefore).toFixed(2));
                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setSelectedTicker(ev.ticker);
                      setSimulatedBuyPct(0);
                    }}
                    className="p-5 hover:bg-slate-800/30 transition-colors cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono tabular-nums text-slate-400">
                          {ev.filingDate}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span className={`font-semibold ${getSignalColorClass(ev.eventType)}`}>
                          {ev.eventType}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span className="font-mono text-slate-300">
                          {ev.investorClass} ({ev.domicile})
                        </span>
                        {ev.conglomerateGroup && (
                          <>
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <span className="text-slate-400">{ev.conglomerateGroup}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-baseline gap-2.5">
                        <span className="font-mono text-base font-bold text-emerald-400">
                          {ev.ticker}
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {ev.investorName}
                        </span>
                        <span className="text-xs text-slate-500">({ev.companyName})</span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{ev.summaryNote}</p>
                    </div>

                    <div className="flex sm:items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/80 font-mono tabular-nums shrink-0">
                      <div className="text-left lg:text-right">
                        <div className="text-xs text-slate-400">Perubahan Porsi KSEI</div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          {ev.pctBefore.toFixed(2)}% → {ev.pctAfter.toFixed(2)}%{' '}
                          <span
                            className={deltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                          >
                            ({deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`})
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-400">Volume &amp; Nilai Transaksi</div>
                        <div
                          className={`text-sm font-bold mt-0.5 ${
                            ev.deltaShares >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {formatSharesCompact(ev.deltaShares)} (Rp{' '}
                          {formatNumber(Math.abs(ev.estimatedValueIdrBillion))} M)
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* =======================================================================
          ISSUER DEEP-DIVE DRAWER (MODAL / SLIDE-OVER INSPECTOR)
         ======================================================================= */}
      {activeIssuerDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex justify-end"
          onClick={() => setSelectedTicker(null)}
        >
          <div
            className="w-full max-w-3xl bg-[#0B101B] border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{activeIssuerDetail.issuer.sector}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeIssuerDetail.issuer.subSector}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400">
                    {activeIssuerDetail.issuer.conglomerateGroup}
                  </span>
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                  <h2 className="text-2xl font-bold font-mono text-white">
                    {activeIssuerDetail.issuer.ticker}
                  </h2>
                  <span className="text-base font-medium text-slate-300">
                    {activeIssuerDetail.issuer.companyName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicker(null)}
                className="p-2 text-slate-400 hover:text-white rounded-md bg-slate-900 border border-slate-800 cursor-pointer"
                aria-label="Close detail drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary KPI Strip for Selected Issuer */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
              <div className="p-3 bg-[#0F1624] border border-slate-800 rounded-md">
                <div className="text-[11px] font-sans text-slate-400">Harga &amp; Market Cap</div>
                <div className="text-sm font-bold text-white mt-1">
                  Rp {formatNumber(activeIssuerDetail.issuer.closePriceIdr)}
                </div>
                <div className="text-xs text-slate-500">
                  Rp {activeIssuerDetail.issuer.marketCapTrillionIdr.toFixed(2)} T
                </div>
              </div>

              <div className="p-3 bg-[#0F1624] border border-slate-800 rounded-md">
                <div className="text-[11px] font-sans text-slate-400">KSEI ≥1% Terkunci</div>
                <div className="text-sm font-bold text-emerald-400 mt-1">
                  {activeIssuerDetail.issuer.disclosedOnePctTotalPct.toFixed(2)}%
                </div>
                <div className="text-xs text-slate-500">
                  {activeIssuerDetail.issuer.holderCountCurrent} Entitas ≥1%
                </div>
              </div>

              <div className="p-3 bg-[#0F1624] border border-slate-800 rounded-md">
                <div className="text-[11px] font-sans text-slate-400">Effective Free Float</div>
                <div className="text-sm font-bold text-amber-400 mt-1">
                  {activeIssuerDetail.issuer.effectiveFreeFloatPct.toFixed(2)}%
                </div>
                <div className="text-xs text-slate-500">Kepemilikan &lt;1%</div>
              </div>

              <div className="p-3 bg-[#0F1624] border border-slate-800 rounded-md">
                <div className="text-[11px] font-sans text-slate-400">Tightening Score</div>
                <div className="text-sm font-bold text-white mt-1">
                  {activeIssuerDetail.issuer.registerTighteningScore}/100
                </div>
                <div className="text-xs text-slate-500">
                  {activeIssuerDetail.issuer.primarySignal}
                </div>
              </div>
            </div>

            {/* Disclosed >=1% Shareholders Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-300">
                  Daftar Pemegang Saham KSEI ≥1.00% ({activeIssuerDetail.holders.length} Entitas)
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Total Saham Tercatat:{' '}
                  {formatSharesCompact(activeIssuerDetail.issuer.totalListedShares)} lembar
                </span>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#0F1624]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3">Nama Pemegang Saham &amp; Kustodian</th>
                      <th className="py-2.5 px-2">Kelas</th>
                      <th className="py-2.5 px-3 text-right">Jumlah Lembar</th>
                      <th className="py-2.5 px-3 text-right">Porsi Kini</th>
                      <th className="py-2.5 px-3 text-right">Delta (1M)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {activeIssuerDetail.holders.map((h) => {
                      const deltaPct = Number((h.pctCurrent - h.pctPrev).toFixed(2));
                      const deltaShares = h.sharesCurrent - h.sharesPrev;
                      return (
                        <tr key={h.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-white">{h.investorName}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {h.custodianName}
                              {h.isController ? ' · Pengendali' : ''}
                              {h.isNominee ? ' · Nominee' : ''}
                            </div>
                          </td>
                          <td className="py-3 px-2 font-mono text-slate-300">
                            {h.investorClass} ({h.domicile})
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-200">
                            {formatNumber(h.sharesCurrent)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-white">
                            {h.pctCurrent.toFixed(2)}%
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-mono tabular-nums ${
                              deltaPct > 0
                                ? 'text-emerald-400'
                                : deltaPct < 0
                                ? 'text-rose-400'
                                : 'text-slate-500'
                            }`}
                          >
                            <div>
                              {deltaPct > 0
                                ? `+${deltaPct.toFixed(2)}%`
                                : deltaPct < 0
                                ? `${deltaPct.toFixed(2)}%`
                                : '0.00%'}
                            </div>
                            {deltaShares !== 0 && (
                              <div className="text-[10px]">
                                {formatSharesCompact(deltaShares)}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Public <1% Residual Row */}
                    <tr className="bg-slate-950/60">
                      <td className="py-3 px-3 font-medium text-amber-400" colSpan={2}>
                        Masyarakat / Investor Ritel &amp; Institusi (&lt;1.00% KSEI Threshold)
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-400">
                        {formatNumber(
                          (activeIssuerDetail.issuer.totalListedShares *
                            activeIssuerDetail.issuer.effectiveFreeFloatPct) /
                            100
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-amber-400">
                        {activeIssuerDetail.issuer.effectiveFreeFloatPct.toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        Free Float
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Interactive Float Squeeze & Absorption Calculator */}
            <div className="p-4 bg-[#0F1624] border border-slate-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white">
                  Simulasi Penyerapan Free Float (Register Tightening Calculator)
                </h3>
                <span className="text-xs font-mono text-emerald-400 tabular-nums">
                  Simulasi Beli: +{simulatedBuyPct.toFixed(1)}% Saham Beredar
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Geser untuk menghitung kebutuhan modal (IDR) dan sisa Free Float publik apabila
                investor institusi/konglomerat menyerap tambahan saham dari pasar reguler:
              </p>
              <input
                type="range"
                min={0}
                max={Math.min(15, Number(activeIssuerDetail.issuer.effectiveFreeFloatPct.toFixed(1)))}
                step={0.5}
                value={simulatedBuyPct}
                onChange={(e) => setSimulatedBuyPct(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="grid grid-cols-3 gap-3 pt-2 text-xs font-mono tabular-nums">
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <div className="text-slate-500 font-sans">Lembar Diserap</div>
                  <div className="text-white font-bold mt-0.5">
                    {formatSharesCompact(
                      (activeIssuerDetail.issuer.totalListedShares * simulatedBuyPct) / 100
                    )}
                  </div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <div className="text-slate-500 font-sans">Kebutuhan Modal</div>
                  <div className="text-emerald-400 font-bold mt-0.5">
                    Rp{' '}
                    {formatNumber(
                      (activeIssuerDetail.issuer.marketCapTrillionIdr *
                        1000 *
                        simulatedBuyPct) /
                        100
                    )}{' '}
                    M
                  </div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <div className="text-slate-500 font-sans">Sisa Free Float Baru</div>
                  <div className="text-amber-400 font-bold mt-0.5">
                    {(activeIssuerDetail.issuer.effectiveFreeFloatPct - simulatedBuyPct).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiet Institutional Footer */}
      <footer className="mt-12 border-t border-slate-800/80 py-6 px-6 text-xs text-slate-500">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            Klinik Penyesalan · 1% Shareholders Data Dashboard · Sumber Data: KSEI Public
            Disclosure (≥1% Ownership)
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('ringkasan')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Ringkasan Saham
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('konglo')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Peta Konglomerasi
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleExportCsv}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Export Data CSV
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
