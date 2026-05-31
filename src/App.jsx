import { useState, useRef, useEffect } from 'react'
import { extractMultiplePDFs } from './utils/pdfExtract'
import { analyzeReport } from './utils/analyzePrompt'
import { RevenueBarChart, MarginLineChart, CashFlowChart, BalanceSheetChart } from './components/Charts'

const TEAL = '#0F766E'
const GREEN = '#10B981'

const TABS = ['All', 'Snapshot', 'P&L', 'Margins', 'Balance Sheet', 'Cash Flow', 'Metrics', 'Dividends', 'Commentary', 'Flags']

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtRM(n) {
  if (n == null) return 'N/A'
  if (typeof n !== 'number') return String(n)
  if (Math.abs(n) >= 1000000) return `RM${(n / 1000000).toFixed(2)}B`
  if (Math.abs(n) >= 1000) return `RM${(n / 1000).toFixed(0)}M`
  return `RM${n.toFixed(0)}K`
}

function fmtNum(n) {
  if (n == null) return 'N/A'
  return typeof n === 'number' ? n.toLocaleString() : String(n)
}

// ── Small atoms ──────────────────────────────────────────────────────────────

function DarkToggle({ dark, setDark }) {
  return (
    <button
      onClick={() => setDark(!dark)}
      className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-base"
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: TEAL }}
      >
        <span className="text-white text-sm font-bold">E</span>
      </div>
      <span className="text-xl font-bold text-slate-800 dark:text-slate-100">EquityLens</span>
    </div>
  )
}

function TrendBadge({ value, suffix = '%' }) {
  if (value == null) return null
  const pos = value >= 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-semibold text-xs ${
        pos
          ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950'
          : 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950'
      }`}
    >
      {pos ? '▲' : '▼'} {Math.abs(value).toFixed(1)}{suffix}
    </span>
  )
}

function MetricCard({ label, value, change, changeSuffix = '%', badge, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 ${className}`}>
      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 leading-none">{label}</p>
      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight mt-1">{value}</p>
      {change != null && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <TrendBadge value={change} suffix={changeSuffix} />
          <span className="text-xs text-slate-400">YoY</span>
        </div>
      )}
      {badge && <p className="mt-1 text-xs text-slate-400">{badge}</p>}
    </div>
  )
}

function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm ${className}`}>
      {title && (
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-4">
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({ activeTab, onSelect }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current?.querySelector(`[data-tab="${activeTab}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeTab])

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 sticky top-[57px] z-10">
      <div className="max-w-5xl mx-auto">
        <div ref={ref} className="flex overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              data-tab={tab}
              onClick={() => onSelect(tab)}
              className="shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
              style={
                activeTab === tab
                  ? { borderColor: TEAL, color: TEAL }
                  : { borderColor: 'transparent', color: '' }
              }
            >
              <span className={activeTab !== tab ? 'text-slate-500 dark:text-slate-400 hover:text-slate-700' : ''}>
                {tab}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard sections ────────────────────────────────────────────────────────

function CompanySnapshot({ result }) {
  const curr = result.income_statement?.current_period ?? {}
  const yoy = result.yoy_changes ?? {}
  const div = result.dividend ?? {}

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{result.company_name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {result.sector && (
              <span className="text-xs px-2.5 py-0.5 rounded-full border" style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', color: TEAL }}>
                {result.sector}
              </span>
            )}
            {result.report_type && (
              <span className="text-xs px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700">
                {result.report_type} {result.period_end_date?.slice(0, 4)}
              </span>
            )}
            {result.stock_code && (
              <span className="text-xs px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700">
                Bursa: {result.stock_code}
              </span>
            )}
          </div>
        </div>
        <div className="text-right text-sm text-slate-500 dark:text-slate-400 shrink-0">
          <p>Period ended</p>
          <p className="font-medium text-slate-700 dark:text-slate-200">{result.period_end_date}</p>
          <p className="mt-0.5 text-xs">{result.currency}</p>
        </div>
      </div>

      {result.executive_summary && (
        <p
          className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic mb-5 pl-4"
          style={{ borderLeft: `3px solid ${TEAL}` }}
        >
          {result.executive_summary}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Revenue" value={fmtRM(curr.revenue)} change={yoy.revenue_pct} />
        <MetricCard label="Profit (PAT)" value={fmtRM(curr.profit_after_tax)} change={yoy.profit_after_tax_pct} />
        <MetricCard label="EPS" value={curr.eps_sen != null ? `${curr.eps_sen} sen` : 'N/A'} change={yoy.eps_pct} />
        <MetricCard
          label="Dividend"
          value={div.declared ? `${div.amount_per_share_sen} sen` : 'None'}
          badge={div.declared ? div.dividend_type : undefined}
        />
      </div>
    </div>
  )
}

function PLSection({ result, dark }) {
  const curr = result.income_statement?.current_period ?? {}
  const prior = result.income_statement?.prior_year_period ?? {}
  const prec = result.income_statement?.preceding_quarter ?? {}

  const data = [
    { name: 'Revenue', current: curr.revenue, prior: prior.revenue, preceding: prec.revenue },
    { name: 'Gross Profit', current: curr.gross_profit, prior: prior.gross_profit, preceding: prec.gross_profit },
    { name: 'PBT', current: curr.profit_before_tax, prior: prior.profit_before_tax, preceding: prec.profit_before_tax },
    { name: 'PAT', current: curr.profit_after_tax, prior: prior.profit_after_tax, preceding: prec.profit_after_tax },
  ]

  return (
    <Card title="P&L — Period Comparison">
      <p className="text-xs text-slate-400 mb-3">
        <span className="font-semibold" style={{ color: TEAL }}>■</span> {curr.period ?? '—'}
        &nbsp;&nbsp;<span className="text-slate-300">■</span> {prior.period ?? '—'}
        &nbsp;&nbsp;<span className="font-semibold" style={{ color: '#5EEAD4' }}>■</span> {prec.period ?? '—'}
        &nbsp;(RM'000)
      </p>
      <RevenueBarChart data={data} dark={dark} />
    </Card>
  )
}

function QoQTable({ result }) {
  const curr = result.income_statement?.current_period ?? {}
  const prec = result.income_statement?.preceding_quarter ?? {}

  const rows = [
    { label: 'Revenue', c: curr.revenue, p: prec.revenue },
    { label: 'Cost of Sales', c: curr.cost_of_sales, p: prec.cost_of_sales, neg: true },
    { label: 'Gross Profit', c: curr.gross_profit, p: prec.gross_profit, bold: true },
    { label: 'Other Income', c: curr.other_income, p: prec.other_income },
    { label: 'Operating Expenses', c: curr.operating_expenses, p: prec.operating_expenses, neg: true },
    { label: 'Finance Costs', c: curr.finance_costs, p: prec.finance_costs, neg: true },
    { label: 'Profit Before Tax', c: curr.profit_before_tax, p: prec.profit_before_tax, bold: true },
    { label: 'Income Tax', c: curr.income_tax, p: prec.income_tax, neg: true },
    { label: 'Profit After Tax', c: curr.profit_after_tax, p: prec.profit_after_tax, bold: true },
  ]

  return (
    <Card title="QoQ Comparison (RM'000)">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="text-left py-2 pr-4 text-slate-600 dark:text-slate-300 font-semibold">Metric</th>
              <th className="text-right py-2 px-3 text-slate-600 dark:text-slate-300 font-semibold">{curr.period}</th>
              <th className="text-right py-2 px-3 text-slate-600 dark:text-slate-300 font-semibold">{prec.period}</th>
              <th className="text-right py-2 px-3 text-slate-600 dark:text-slate-300 font-semibold">Change</th>
              <th className="text-right py-2 pl-3 text-slate-600 dark:text-slate-300 font-semibold">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, c, p, bold, neg }) => {
              const diff = c != null && p != null ? c - p : null
              const pct = diff != null && p ? (diff / Math.abs(p)) * 100 : null
              const goodChange = neg ? diff < 0 : diff > 0
              const color =
                diff == null
                  ? 'text-slate-400'
                  : diff === 0
                  ? 'text-slate-400'
                  : goodChange
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'

              return (
                <tr
                  key={label}
                  className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td className={`py-2 pr-4 ${bold ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>
                    {label}
                  </td>
                  <td className={`py-2 px-3 text-right tabular-nums ${bold ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>
                    {c != null ? fmtNum(c) : '—'}
                  </td>
                  <td className={`py-2 px-3 text-right tabular-nums ${bold ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>
                    {p != null ? fmtNum(p) : '—'}
                  </td>
                  <td className={`py-2 px-3 text-right tabular-nums font-medium ${color}`}>
                    {diff != null ? (diff > 0 ? '+' : '') + fmtNum(diff) : '—'}
                  </td>
                  <td className={`py-2 pl-3 text-right tabular-nums font-semibold ${color}`}>
                    {pct != null ? (pct > 0 ? '+' : '') + pct.toFixed(1) + '%' : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function MarginsSection({ result, dark }) {
  const m = result.margins ?? {}
  const is = result.income_statement ?? {}

  const data = [
    {
      period: is.prior_year_period?.period ?? 'Prior Year',
      gp: m.prior_year?.gp_margin_pct,
      pbt: m.prior_year?.pbt_margin_pct,
      pat: m.prior_year?.pat_margin_pct,
    },
    {
      period: is.preceding_quarter?.period ?? 'Prev Qtr',
      gp: m.preceding_quarter?.gp_margin_pct,
      pbt: m.preceding_quarter?.pbt_margin_pct,
      pat: m.preceding_quarter?.pat_margin_pct,
    },
    {
      period: is.current_period?.period ?? 'Current',
      gp: m.current?.gp_margin_pct,
      pbt: m.current?.pbt_margin_pct,
      pat: m.current?.pat_margin_pct,
    },
  ]

  const gpDelta = m.current?.gp_margin_pct != null && m.prior_year?.gp_margin_pct != null
    ? m.current.gp_margin_pct - m.prior_year.gp_margin_pct : null
  const pbtDelta = m.current?.pbt_margin_pct != null && m.prior_year?.pbt_margin_pct != null
    ? m.current.pbt_margin_pct - m.prior_year.pbt_margin_pct : null
  const patDelta = m.current?.pat_margin_pct != null && m.prior_year?.pat_margin_pct != null
    ? m.current.pat_margin_pct - m.prior_year.pat_margin_pct : null

  return (
    <Card title="Margin Trends">
      <MarginLineChart data={data} dark={dark} />
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[
          { label: 'GP Margin', val: m.current?.gp_margin_pct, delta: gpDelta, color: TEAL },
          { label: 'PBT Margin', val: m.current?.pbt_margin_pct, delta: pbtDelta, color: GREEN },
          { label: 'PAT Margin', val: m.current?.pat_margin_pct, delta: patDelta, color: '#6366F1' },
        ].map(({ label, val, delta, color }) => (
          <div key={label} className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-2xl font-bold mt-0.5" style={{ color }}>
              {val != null ? `${val.toFixed(1)}%` : 'N/A'}
            </p>
            {delta != null && <TrendBadge value={delta} suffix="pp" />}
          </div>
        ))}
      </div>
    </Card>
  )
}

function BalanceSheetSection({ result, dark }) {
  const bs = result.balance_sheet ?? {}

  const data = [
    { name: 'Total Assets', value: bs.total_assets },
    { name: 'Total Liabilities', value: bs.total_liabilities },
    { name: 'Total Equity', value: bs.total_equity },
  ]

  return (
    <Card title="Balance Sheet">
      <BalanceSheetChart data={data} dark={dark} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        <MetricCard label="Total Assets" value={fmtRM(bs.total_assets)} className="p-3" />
        <MetricCard label="Total Equity" value={fmtRM(bs.total_equity)} className="p-3" />
        <MetricCard label="Total Liabilities" value={fmtRM(bs.total_liabilities)} className="p-3" />
        <MetricCard label="Cash & Equivalents" value={fmtRM(bs.cash_and_equivalents)} className="p-3" />
        <MetricCard label="Total Borrowings" value={fmtRM(bs.total_borrowings)} className="p-3" />
        <MetricCard
          label="NTA / Share"
          value={bs.net_assets_per_share != null ? `RM${bs.net_assets_per_share.toFixed(4)}` : 'N/A'}
          className="p-3"
        />
      </div>
    </Card>
  )
}

function CashFlowSection({ result, dark }) {
  const cf = result.cash_flow ?? {}

  const data = [
    { name: 'Operating', value: cf.operating },
    { name: 'Investing', value: cf.investing },
    { name: 'Financing', value: cf.financing },
    { name: 'Net Change', value: cf.net_change },
  ]

  return (
    <Card title="Cash Flow (RM'000)">
      <CashFlowChart data={data} dark={dark} />
      <div className="grid grid-cols-3 gap-3 mt-4 text-center">
        <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Opening Cash</p>
          <p className="font-bold text-slate-700 dark:text-slate-200">{fmtRM(cf.beginning_cash)}</p>
        </div>
        <div
          className="rounded-lg p-3"
          style={{ backgroundColor: cf.net_change >= 0 ? '#ECFDF5' : '#FEF2F2' }}
        >
          <p className="text-xs mb-0.5" style={{ color: cf.net_change >= 0 ? '#065F46' : '#991B1B' }}>Net Change</p>
          <p className="font-bold" style={{ color: cf.net_change >= 0 ? '#065F46' : '#991B1B' }}>
            {fmtRM(cf.net_change)}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Closing Cash</p>
          <p className="font-bold text-slate-700 dark:text-slate-200">{fmtRM(cf.ending_cash)}</p>
        </div>
      </div>
    </Card>
  )
}

function KeyMetricsSection({ result }) {
  const kr = result.key_ratios ?? {}
  const div = result.dividend ?? {}
  const curr = result.income_statement?.current_period ?? {}
  const bs = result.balance_sheet ?? {}
  const yoy = result.yoy_changes ?? {}

  return (
    <Card title="Key Metrics">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard label="EPS" value={curr.eps_sen != null ? `${curr.eps_sen} sen` : 'N/A'} change={yoy.eps_pct} />
        <MetricCard
          label="Dividend"
          value={div.declared ? `${div.amount_per_share_sen} sen` : 'None'}
          badge={div.declared && div.payment_date ? `Pay: ${div.payment_date}` : undefined}
        />
        <MetricCard label="ROE" value={kr.roe_pct != null ? `${kr.roe_pct}%` : 'N/A'} />
        <MetricCard label="Current Ratio" value={kr.current_ratio != null ? `${kr.current_ratio}x` : 'N/A'} />
        <MetricCard label="Gearing" value={kr.gearing_ratio != null ? `${kr.gearing_ratio}x` : 'N/A'} />
        <MetricCard
          label="NTA / Share"
          value={bs.net_assets_per_share != null ? `RM${bs.net_assets_per_share.toFixed(4)}` : 'N/A'}
        />
      </div>
    </Card>
  )
}

function OperationalHighlights({ result }) {
  const highlights = result.operational_highlights
  if (!highlights?.length) return null

  return (
    <Card title="Operational Highlights">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {highlights.map((h, i) => (
          <div key={i} className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 leading-tight">{h.metric}</p>
            <p className="font-bold text-slate-800 dark:text-slate-100">{h.current}</p>
            {h.change && (
              <p
                className={`text-xs mt-0.5 font-medium ${
                  String(h.change).startsWith('+') || (!String(h.change).startsWith('-') && parseFloat(h.change) > 0)
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {h.change} vs {h.prior}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

function DividendSection({ result }) {
  const div = result.dividend ?? {}

  if (!div.declared) {
    return (
      <Card title="Dividend">
        <p className="text-sm text-slate-500 dark:text-slate-400">No dividend declared for this period.</p>
      </Card>
    )
  }

  return (
    <Card title="Dividend">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Amount</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{div.amount_per_share_sen}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">sen per share</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Type</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{div.dividend_type || '—'}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Entitlement</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{div.entitlement_date || '—'}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Payment</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{div.payment_date || '—'}</p>
        </div>
      </div>
      {div.total_amount && (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Total distribution: <span className="font-semibold text-slate-700 dark:text-slate-200">{div.total_amount}</span>
        </p>
      )}
    </Card>
  )
}

function ManagementCommentary({ result }) {
  const mc = result.management_commentary
  if (!mc) return null

  const sections = [
    { key: 'performance_review', label: 'Performance Review' },
    { key: 'qoq_commentary', label: 'QoQ Commentary' },
    { key: 'prospects', label: 'Outlook & Prospects' },
  ]

  return (
    <Card title="Management Commentary">
      <div className="space-y-5">
        {sections.map(({ key, label }) =>
          mc[key] ? (
            <div key={key}>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{label}</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{mc[key]}</p>
            </div>
          ) : null
        )}
        {mc.key_initiatives?.filter(Boolean).length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Key Initiatives</h3>
            <ul className="space-y-1.5">
              {mc.key_initiatives.filter(Boolean).map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="shrink-0 mt-0.5" style={{ color: TEAL }}>→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}

function FlagsSection({ result }) {
  const highlights = result.highlights ?? []
  const redFlags = result.red_flags ?? []

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-emerald-900 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-3">
          🟢 Highlights
        </h2>
        {highlights.filter(Boolean).length > 0 ? (
          <ul className="space-y-2">
            {highlights.filter(Boolean).map((h, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No highlights identified.</p>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-100 dark:border-red-900 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-3">
          🔴 Red Flags
        </h2>
        {redFlags.filter(Boolean).length > 0 ? (
          <ul className="space-y-2">
            {redFlags.filter(Boolean).map((flag, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="text-red-500 shrink-0 mt-0.5">⚠</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No red flags identified.</p>
        )}
      </div>
    </div>
  )
}

function IPOSection({ result }) {
  const ipo = result.ipo_proceeds_utilization
  if (!ipo?.applicable) return null

  return (
    <Card title="IPO Proceeds Utilization">
      <div className="flex flex-wrap justify-between text-sm text-slate-500 dark:text-slate-400 mb-4 gap-2">
        <span>Total raised: <strong className="text-slate-700 dark:text-slate-200">{ipo.total_raised}</strong></span>
        <span>Balance: <strong className="text-slate-700 dark:text-slate-200">{ipo.balance}</strong></span>
      </div>
      <div className="space-y-3">
        {ipo.details?.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 dark:text-slate-300">{item.purpose}</span>
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                {item.utilized} / {item.budget} ({item.percentage}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(item.percentage, 100)}%`,
                  backgroundColor: item.percentage >= 100 ? GREEN : TEAL,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function DataGaps({ result }) {
  const gaps = result.data_gaps?.filter(Boolean)
  if (!gaps?.length) return null

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 p-5" style={{ backgroundColor: '#FFFBEB' }}>
      <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-2">⚠️ Data Gaps</h2>
      <p className="text-xs text-amber-600 mb-3">
        Information not available in the uploaded documents that an analyst would typically want:
      </p>
      <ul className="space-y-1.5">
        {gaps.map((gap, i) => (
          <li key={i} className="flex gap-2 text-sm text-amber-800">
            <span className="shrink-0">→</span>
            <span>{gap}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Results dashboard ─────────────────────────────────────────────────────────

function ResultsDashboard({ result, dark, setDark, onReset, activeTab, setActiveTab }) {
  const show = (tab) => activeTab === 'All' || activeTab === tab

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <DarkToggle dark={dark} setDark={setDark} />
            <button
              onClick={onReset}
              className="text-sm text-white px-3 py-2 rounded-lg transition hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              ← New
            </button>
          </div>
        </div>
      </header>

      <TabBar activeTab={activeTab} onSelect={setActiveTab} />

      <div className="max-w-5xl mx-auto px-4 sm:px-5 py-5 space-y-4">
        {show('Snapshot') && <CompanySnapshot result={result} />}
        {show('P&L') && <PLSection result={result} dark={dark} />}
        {show('P&L') && <QoQTable result={result} />}
        {show('Margins') && <MarginsSection result={result} dark={dark} />}
        {show('Balance Sheet') && <BalanceSheetSection result={result} dark={dark} />}
        {show('Cash Flow') && <CashFlowSection result={result} dark={dark} />}
        {show('Metrics') && <KeyMetricsSection result={result} />}
        {show('Metrics') && <OperationalHighlights result={result} />}
        {show('Dividends') && <DividendSection result={result} />}
        {show('Commentary') && <OperationalHighlights result={result} />}
        {show('Commentary') && <ManagementCommentary result={result} />}
        {show('Flags') && <FlagsSection result={result} />}
        {show('Flags') && <IPOSection result={result} />}
        {show('Flags') && <DataGaps result={result} />}
      </div>
    </div>
  )
}

// ── Landing page ──────────────────────────────────────────────────────────────

function LandingPage({ files, setFiles, dragOver, setDragOver, onAnalyze, onDemo, error, dark, setDark }) {
  const fileRef = useRef()

  const handleFiles = (incoming) => {
    const pdfs = Array.from(incoming).filter((f) => f.type === 'application/pdf')
    if (pdfs.length) setFiles((prev) => [...prev, ...pdfs])
  }

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  const features = [
    { icon: '📈', title: 'P&L Analysis', desc: 'Revenue, margins, YoY & QoQ changes' },
    { icon: '🔍', title: 'Red Flag Detection', desc: 'Restatements, related-party transactions' },
    { icon: '📊', title: 'Interactive Charts', desc: 'Bar, line & waterfall charts' },
    { icon: '💰', title: 'Key Ratios', desc: 'ROE, gearing, current ratio, NTA/share' },
    { icon: '💬', title: 'AI Commentary', desc: "Management's voice, summarized clearly" },
    { icon: '📁', title: 'Multi-File Upload', desc: 'Quarterly report + press release together' },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors">
      <header className="border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Logo />
          <DarkToggle dark={dark} setDark={setDark} />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 pt-16 pb-8">
        <div className="max-w-xl">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white leading-tight mb-4">
            Financial reports,
            <br />
            <span style={{ color: TEAL }}>decoded.</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
            Upload any Bursa Malaysia quarterly report and get an interactive
            dashboard — charts, margins, key ratios, and AI commentary in seconds.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 pb-20">
        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-150 cursor-pointer ${
            dragOver
              ? 'border-teal-400 bg-teal-50 dark:bg-teal-950/30'
              : files.length > 0
              ? 'border-teal-300 dark:border-teal-700 bg-teal-50/30 dark:bg-teal-950/20'
              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {files.length === 0 ? (
            <>
              <div className="text-4xl mb-3">📊</div>
              <p className="text-lg font-medium text-slate-600 dark:text-slate-300">
                Drop PDFs here or{' '}
                <span style={{ color: TEAL }} className="font-semibold">browse</span>
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Quarterly report + press release (multiple files supported)
              </p>
            </>
          ) : (
            <>
              <div className="text-3xl mb-2">📄</div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {files.length} file{files.length > 1 ? 's' : ''} selected — click to add more
              </p>
            </>
          )}
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-4 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-400 shrink-0">📄</span>
                  <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{f.name}</span>
                  <span className="text-xs text-slate-400 shrink-0">({(f.size / 1024 / 1024).toFixed(1)}MB)</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                  className="text-slate-300 hover:text-red-500 transition text-xl leading-none ml-3 shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* CTAs */}
        <div className="mt-6 flex flex-wrap gap-3">
          {files.length > 0 && (
            <button
              onClick={onAnalyze}
              className="text-white px-6 py-3 rounded-xl font-semibold text-base transition hover:opacity-90 shadow-sm"
              style={{ backgroundColor: TEAL }}
            >
              Analyze {files.length > 1 ? `${files.length} Reports` : 'Report'} →
            </button>
          )}
          <button
            onClick={onDemo}
            className="px-6 py-3 rounded-xl font-semibold text-base transition border-2 hover:opacity-90"
            style={{ borderColor: TEAL, color: TEAL, backgroundColor: 'transparent' }}
          >
            Try Demo: 99 Speed Mart Q1 2026 →
          </button>
        </div>

        {/* Feature grid */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {features.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
            >
              <div className="text-2xl mb-2">{icon}</div>
              <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{title}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-slate-100 dark:border-slate-800 py-6">
        <p className="text-center text-xs text-slate-400">
          Built by{' '}
          <a
            href="https://alyssa-low-resume.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: TEAL }}
          >
            Alyssa Low
          </a>
          {' '}•{' '}
          <a
            href="https://pitchlens-summary.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: TEAL }}
          >
            PitchLens
          </a>
          {' '}• Powered by Claude AI
        </p>
      </footer>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('All')
  const [dragOver, setDragOver] = useState(false)
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('equitylens-dark') === 'true' } catch { return false }
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('equitylens-dark', dark) } catch {}
  }, [dark])

  const handleDemo = async () => {
    setError(null)
    try {
      const res = await fetch('/demo-99smart.json')
      if (!res.ok) throw new Error('Demo data not found')
      const data = await res.json()
      setResult(data)
      setActiveTab('All')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAnalyze = async () => {
    if (!files.length) return
    setLoading(true)
    setError(null)
    try {
      const extracted = await extractMultiplePDFs(files)
      const data = await analyzeReport(extracted)
      setResult(data)
      setActiveTab('All')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFiles([])
    setResult(null)
    setError(null)
    setActiveTab('All')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div
            className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 rounded-full animate-spin mx-auto mb-6"
            style={{ borderTopColor: TEAL }}
          />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Reading the financial report…
          </h2>
          <p className="text-slate-400">Extracting metrics, ratios, and commentary</p>
          <p className="text-sm text-slate-400 mt-1">This takes 15–30 seconds</p>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <ResultsDashboard
        result={result}
        dark={dark}
        setDark={setDark}
        onReset={handleReset}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    )
  }

  return (
    <LandingPage
      files={files}
      setFiles={setFiles}
      dragOver={dragOver}
      setDragOver={setDragOver}
      onAnalyze={handleAnalyze}
      onDemo={handleDemo}
      error={error}
      dark={dark}
      setDark={setDark}
    />
  )
}
