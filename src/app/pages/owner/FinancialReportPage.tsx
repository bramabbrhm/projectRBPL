import { useState } from 'react';
import {
  BarChart2, TrendingUp, TrendingDown, DollarSign,
  Download, Filter, FileText, Loader2,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useDashboardStats } from '../../hooks/useDashboard';
import { useTransactionsByRange } from '../../hooks/useTransactions';
import { exportFinancialReportToExcel } from '../../services/exportService';

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export function FinancialReportPage() {
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(lastOfMonth);
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const { stats, chartData, loading } = useDashboardStats();
  const { transactions, loading: txLoading } = useTransactionsByRange(dateFrom, dateTo);

  const totalRevenue = chartData.reduce((s, m) => s + m.revenue, 0);
  const totalExpense = chartData.reduce((s, m) => s + m.expense, 0);
  const totalProfit = chartData.reduce((s, m) => s + m.profit, 0);

  const chartDataScaled = chartData.map(d => ({
    ...d,
    revenue: parseFloat((d.revenue / 1000000).toFixed(2)),
    expense: parseFloat((d.expense / 1000000).toFixed(2)),
    profit: parseFloat((d.profit / 1000000).toFixed(2)),
  }));

  const periodRevenue = transactions.reduce((s, t) => s + (t.total ?? 0), 0);
  const periodCount = transactions.length;

  const handleExportExcel = async () => {
    await exportFinancialReportToExcel(chartData);
  };

  return (
    <div style={{ fontFamily: 'Roboto, sans-serif' }}>
      {/* Filter Bar */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} style={{ color: '#9ca3af' }} />
            <span className="text-sm font-semibold" style={{ color: '#374151' }}>Filter Periode:</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ border: '1.5px solid #e5e7eb', color: '#374151' }} />
            <span className="text-sm" style={{ color: '#9ca3af' }}>—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ border: '1.5px solid #e5e7eb', color: '#374151' }} />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1.5px solid #e5e7eb' }}>
              {(['chart', 'table'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className="px-4 py-2 text-sm font-semibold"
                  style={{ background: view === v ? '#6F4E37' : 'white', color: view === v ? 'white' : '#6b7280' }}>
                  {v === 'chart' ? 'Grafik' : 'Tabel'}
                </button>
              ))}
            </div>
            <button onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#6F4E37', color: 'white' }}>
              <Download size={16} />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Pendapatan (7 bln)', value: loading ? '—' : formatRupiah(totalRevenue), icon: <TrendingUp size={22} />, color: '#059669', bg: '#ecfdf5' },
          { label: 'Total Pengeluaran (7 bln)', value: loading ? '—' : formatRupiah(totalExpense), icon: <TrendingDown size={22} />, color: '#dc2626', bg: '#fee2e2' },
          { label: 'Total Laba Bersih (7 bln)', value: loading ? '—' : formatRupiah(totalProfit), icon: <DollarSign size={22} />, color: '#7c3aed', bg: '#f5f3ff' },
          { label: `Pendapatan ${dateFrom.slice(0, 7)}`, value: txLoading ? '—' : formatRupiah(periodRevenue), icon: <BarChart2 size={22} />, color: '#6F4E37', bg: '#FFF8E7' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: card.bg }}>
              <div style={{ color: card.color }}>{card.icon}</div>
            </div>
            <p className="text-xs" style={{ color: '#9ca3af' }}>{card.label}</p>
            <p className="text-xl font-bold mt-1" style={{ fontFamily: 'Montserrat, sans-serif', color: '#1f2937' }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Chart / Table */}
      <div className="rounded-2xl p-6" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
            {view === 'chart' ? 'Grafik Keuangan 7 Bulan' : 'Tabel Laporan Bulanan'}
          </h3>
          {!loading && (
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#FFF8E7', color: '#6F4E37' }}>
              dalam Juta Rp
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{ height: 320 }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#6F4E37' }} />
          </div>
        ) : view === 'chart' ? (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartDataScaled}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}M`} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}M`, '']} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Pendapatan" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Pengeluaran" fill="#dc2626" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="profit" name="Laba Bersih" stroke="#FFD700" strokeWidth={3} dot={{ fill: '#FFD700', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F5F5F5' }}>
                  {['Bulan', 'Pendapatan', 'Pengeluaran', 'Laba Bersih', 'Margin'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#9ca3af' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.map((m, i) => {
                  const margin = m.revenue > 0 ? (m.profit / m.revenue * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={m.month} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: '#1f2937' }}>{m.month}</td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: '#059669' }}>{formatRupiah(m.revenue)}</td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: '#dc2626' }}>{formatRupiah(m.expense)}</td>
                      <td className="px-5 py-3.5 text-sm font-bold" style={{ color: '#6F4E37' }}>{formatRupiah(m.profit)}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: parseFloat(margin) >= 50 ? '#ecfdf5' : '#fffbeb', color: parseFloat(margin) >= 50 ? '#059669' : '#d97706' }}>
                          {margin}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Period Transactions */}
      {!txLoading && transactions.length > 0 && (
        <div className="mt-4 rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#f3f4f6' }}>
            <div className="flex items-center gap-2">
              <FileText size={18} style={{ color: '#6F4E37' }} />
              <h3 className="font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
                Transaksi Periode {dateFrom} s/d {dateTo}
              </h3>
            </div>
            <span className="text-xs" style={{ color: '#9ca3af' }}>{periodCount} transaksi · {formatRupiah(periodRevenue)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F5F5F5' }}>
                  {['ID', 'Tanggal', 'Kasir', 'Metode', 'Total'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#9ca3af' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td className="px-5 py-3 text-xs font-mono" style={{ color: '#6b7280' }}>{t.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: '#374151' }}>{new Date(t.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: '#374151' }}>{(t.cashier as { full_name: string })?.full_name ?? '-'}</td>
                    <td className="px-5 py-3"><span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#F5F5F5', color: '#6b7280' }}>{t.payment_method}</span></td>
                    <td className="px-5 py-3 text-sm font-bold" style={{ color: '#6F4E37' }}>{formatRupiah(t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
