import { useId } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  BarChart2, ArrowUpRight, ArrowDownRight, Loader2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useDashboardStats } from '../../hooks/useDashboard';

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const formatM = (n: number) => `${(n / 1000000).toFixed(1)}M`;

const KPICard = ({ label, value, growth, icon, color, bg, loading }: {
  label: string; value: string; growth?: number; icon: React.ReactNode;
  color: string; bg: string; loading?: boolean;
}) => {
  const isPositive = (growth ?? 0) >= 0;
  return (
    <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <div style={{ color }}>{icon}</div>
        </div>
        {growth !== undefined && (
          <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
            style={{ background: isPositive ? '#ecfdf5' : '#fee2e2', color: isPositive ? '#059669' : '#dc2626' }}>
            {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(growth).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-sm" style={{ color: '#9ca3af' }}>{label}</p>
      {loading ? (
        <div className="h-8 w-32 rounded-lg mt-1" style={{ background: '#f3f4f6', animation: 'pulse 2s infinite' }} />
      ) : (
        <p className="text-2xl font-bold mt-1" style={{ fontFamily: 'Montserrat, sans-serif', color: '#1f2937' }}>{value}</p>
      )}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3" style={{ background: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      <p className="text-xs font-bold mb-2" style={{ color: '#6F4E37' }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: '#6b7280' }}>
            {p.name === 'revenue' ? 'Pendapatan' : p.name === 'expense' ? 'Pengeluaran' : 'Profit'}:
          </span>
          <span className="font-semibold" style={{ color: '#1f2937' }}>{formatRupiah(p.value * 1000000)}</span>
        </div>
      ))}
    </div>
  );
};

export function OwnerDashboard() {
  const { user } = useAuth();
  const { stats, chartData, loading } = useDashboardStats();
  const uid = useId().replace(/:/g, '');

  const chartDataScaled = chartData.map(d => ({
    ...d,
    revenue: d.revenue / 1000000,
    expense: d.expense / 1000000,
    profit: d.profit / 1000000,
  }));

  const now = new Date();
  const dateLabel = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ fontFamily: 'Roboto, sans-serif' }}>
      {/* Executive Banner */}
      <div className="rounded-2xl p-6 mb-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #3d2b1f 0%, #6F4E37 50%, #8B6347 100%)', boxShadow: '0 4px 24px rgba(61,43,31,0.35)' }}>
        <div className="absolute right-6 top-0 bottom-0 flex items-center opacity-5">
          <BarChart2 size={180} style={{ color: 'white' }} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#FFD700' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C19A6B' }}>
              Executive Dashboard
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Coffee Street Overview
          </h2>
          <p style={{ color: '#C19A6B', fontSize: 14, marginTop: 4 }}>
            Selamat datang, {user?.name} · {dateLabel}
          </p>
          {stats && (
            <div className="mt-4 flex gap-6 flex-wrap">
              <div>
                <p className="text-xs" style={{ color: '#C19A6B' }}>Pendapatan Hari Ini</p>
                <p className="text-lg font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {formatRupiah(stats.revenue_today)}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: '#C19A6B' }}>Transaksi Hari Ini</p>
                <p className="text-lg font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {stats.transactions_today} txn
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Pendapatan Bulan Ini"
          value={loading || !stats ? '—' : formatRupiah(stats.revenue_month)}
          icon={<DollarSign size={24} />}
          color="#059669" bg="#ecfdf5" loading={loading}
        />
        <KPICard
          label="Pengeluaran Bulan Ini"
          value={loading || !stats ? '—' : formatRupiah(stats.expense_month)}
          icon={<TrendingDown size={24} />}
          color="#dc2626" bg="#fee2e2" loading={loading}
        />
        <KPICard
          label="Laba Bersih Bulan Ini"
          value={loading || !stats ? '—' : formatRupiah(stats.profit_month)}
          icon={<TrendingUp size={24} />}
          color="#7c3aed" bg="#f5f3ff" loading={loading}
        />
        <KPICard
          label="Total Transaksi Bulan Ini"
          value={loading || !stats ? '—' : `${stats.transactions_month} txn`}
          icon={<ShoppingCart size={24} />}
          color="#6F4E37" bg="#FFF8E7" loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue vs Expense Area Chart */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
              Pendapatan vs Pengeluaran (7 Bulan)
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#FFF8E7', color: '#6F4E37' }}>
              dalam Juta Rp
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center" style={{ height: 220 }}>
              <Loader2 size={28} className="animate-spin" style={{ color: '#6F4E37' }} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartDataScaled}>
                <defs>
                  <linearGradient id={`${uid}revGrad`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={`${uid}expGrad`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2.5} fill={`url(#${uid}revGrad)`} name="revenue" />
                <Area type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2.5} fill={`url(#${uid}expGrad)`} name="expense" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Profit Bar Chart */}
        <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 className="font-bold text-sm mb-4" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
            Laba Bersih per Bulan
          </h3>
          {loading ? (
            <div className="flex items-center justify-center" style={{ height: 220 }}>
              <Loader2 size={28} className="animate-spin" style={{ color: '#6F4E37' }} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartDataScaled} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}M`} />
                <YAxis dataKey="month" type="category" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip formatter={(v: number) => [formatRupiah(v * 1000000), 'Profit']} />
                <Bar dataKey="profit" fill="#6F4E37" radius={[0, 4, 4, 0]} name="profit" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Alert Cards */}
      {stats && (stats.critical_stock_count > 0 || stats.pending_payroll_count > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.critical_stock_count > 0 && (
            <div className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#dc2626' }}>
                <TrendingDown size={20} style={{ color: 'white' }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#dc2626' }}>
                  {stats.critical_stock_count} Item Stok Kritis
                </p>
                <p className="text-xs" style={{ color: '#ef4444' }}>
                  +{stats.warning_stock_count} item dalam status Warning
                </p>
              </div>
            </div>
          )}
          {stats.pending_payroll_count > 0 && (
            <div className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#d97706' }}>
                <DollarSign size={20} style={{ color: 'white' }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#d97706' }}>
                  {stats.pending_payroll_count} Payroll Belum Dibayar
                </p>
                <p className="text-xs" style={{ color: '#f59e0b' }}>Segera proses pembayaran gaji karyawan</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
