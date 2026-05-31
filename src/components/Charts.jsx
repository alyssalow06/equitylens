import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts'

const TEAL = '#0F766E'
const TEAL_LIGHT = '#5EEAD4'
const SLATE = '#94A3B8'
const GREEN = '#10B981'
const RED = '#EF4444'
const INDIGO = '#6366F1'

function fmtAxis(v) {
  const abs = Math.abs(v)
  if (abs >= 1000000) return `${(v / 1000000).toFixed(1)}B`
  if (abs >= 1000) return `${(v / 1000).toFixed(0)}M`
  return `${v}`
}

function ChartTooltip({ active, payload, label, dark, suffix = "K (RM'000)" }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="p-3 rounded-lg shadow-lg border text-xs"
      style={{
        backgroundColor: dark ? '#1E293B' : '#fff',
        borderColor: dark ? '#334155' : '#E2E8F0',
        color: dark ? '#F1F5F9' : '#1E293B',
      }}
    >
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="mb-0.5">
          {p.name}: {p.value?.toLocaleString()}{suffix}
        </p>
      ))}
    </div>
  )
}

export function RevenueBarChart({ data, dark }) {
  const axis = dark ? '#94A3B8' : '#64748B'
  const grid = dark ? '#1E293B' : '#F1F5F9'
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barGap={2} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
        <XAxis dataKey="name" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtAxis} tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<ChartTooltip dark={dark} />} />
        <Legend wrapperStyle={{ color: axis, fontSize: 11, paddingTop: 8 }} />
        <Bar dataKey="current" name="Current Quarter" fill={TEAL} radius={[3, 3, 0, 0]} />
        <Bar dataKey="prior" name="Prior Year" fill={SLATE} radius={[3, 3, 0, 0]} />
        <Bar dataKey="preceding" name="Preceding Qtr" fill={TEAL_LIGHT} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MarginLineChart({ data, dark }) {
  const axis = dark ? '#94A3B8' : '#64748B'
  const grid = dark ? '#1E293B' : '#F1F5F9'
  return (
    <ResponsiveContainer width="100%" height={270}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
        <XAxis dataKey="period" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: axis, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={40}
          domain={['auto', 'auto']}
        />
        <Tooltip
          formatter={(v) => [`${v?.toFixed(1)}%`]}
          contentStyle={{
            backgroundColor: dark ? '#1E293B' : '#fff',
            borderColor: dark ? '#334155' : '#E2E8F0',
            color: dark ? '#F1F5F9' : '#1E293B',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ color: axis, fontSize: 11, paddingTop: 8 }} />
        <Line type="monotone" dataKey="gp" name="GP Margin" stroke={TEAL} strokeWidth={2.5} dot={{ r: 4, fill: TEAL }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="pbt" name="PBT Margin" stroke={GREEN} strokeWidth={2.5} dot={{ r: 4, fill: GREEN }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="pat" name="PAT Margin" stroke={INDIGO} strokeWidth={2.5} dot={{ r: 4, fill: INDIGO }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function CashFlowChart({ data, dark }) {
  const axis = dark ? '#94A3B8' : '#64748B'
  const grid = dark ? '#1E293B' : '#F1F5F9'
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
        <XAxis dataKey="name" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtAxis} tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<ChartTooltip dark={dark} />} />
        <Bar dataKey="value" name="RM'000" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.value >= 0 ? GREEN : RED} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function BalanceSheetChart({ data, dark }) {
  const axis = dark ? '#94A3B8' : '#64748B'
  const grid = dark ? '#1E293B' : '#F1F5F9'
  const colors = [TEAL, '#F59E0B', INDIGO]
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
        <XAxis dataKey="name" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtAxis} tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<ChartTooltip dark={dark} />} />
        <Bar dataKey="value" name="RM'000" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
