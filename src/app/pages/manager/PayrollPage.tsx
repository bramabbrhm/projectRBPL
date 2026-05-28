import { useState } from 'react';
import { Users, DollarSign, Clock, Printer, CheckCircle, Play, TrendingUp, Loader2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePayroll } from '../../hooks/usePayroll';
import { exportPayrollToPDF, exportPayrollToExcel } from '../../services/exportService';
import type { PayrollRecord } from '../../types/database';

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const now = new Date();
const PERIOD_LABEL = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

export function PayrollPage() {
  const { user } = useAuth();
  const { records, loading, markPaid, markAllPaid, generateMonthly, pendingCount, totalPending } = usePayroll();
  const [selectedEmp, setSelectedEmp] = useState<PayrollRecord | null>(null);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const totalPayroll = records.reduce((s, r) => s + r.net_salary, 0);
  const paidCount = records.filter(r => r.status === 'Sudah Dibayar').length;

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    await generateMonthly(user.id);
    setGenerating(false);
  };

  const handleMarkPaid = async (id: string) => {
    setActionLoading(id);
    await markPaid(id);
    setActionLoading(null);
    if (selectedEmp?.id === id) setSelectedEmp(null);
  };

  const handleMarkAllPaid = async () => {
    const ids = records.filter(r => r.status === 'Belum Dibayar').map(r => r.id);
    setActionLoading('all');
    await markAllPaid(ids);
    setActionLoading(null);
  };

  const handlePrintPDF = async () => {
    await exportPayrollToPDF(records, PERIOD_LABEL);
  };

  const handleExcelExport = async () => {
    await exportPayrollToExcel(records, `payroll_${PERIOD_LABEL.replace(' ', '_')}`);
  };

  const getEmployeeName = (rec: PayrollRecord) => (rec.employee as { full_name: string })?.full_name ?? '-';
  const getEmployeeRole = (rec: PayrollRecord) => (rec.employee as { role: string })?.role ?? '-';

  return (
    <div style={{ fontFamily: 'Roboto, sans-serif' }}>
      {/* Slip Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl overflow-hidden w-96" style={{ background: 'white', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div className="px-6 py-5 flex items-center justify-between" style={{ background: '#6F4E37' }}>
              <div>
                <h3 className="font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Slip Gaji – {getEmployeeName(selectedEmp)}
                </h3>
                <p style={{ color: '#C19A6B', fontSize: 13 }}>Periode: {PERIOD_LABEL}</p>
              </div>
              <button onClick={() => setSelectedEmp(null)} style={{ color: '#C19A6B' }}><X size={18} /></button>
            </div>
            <div className="px-6 py-5">
              <div className="space-y-3">
                {[
                  { label: 'Nama',      value: getEmployeeName(selectedEmp) },
                  { label: 'Jabatan',   value: getEmployeeRole(selectedEmp) },
                  { label: 'Jam Kerja', value: `${selectedEmp.hours_worked} jam` },
                  { label: 'Rate/Jam',  value: formatRupiah(selectedEmp.hourly_rate) },
                  { label: 'Gaji Kotor',value: formatRupiah(selectedEmp.gross_salary) },
                  { label: 'Potongan',  value: formatRupiah(selectedEmp.deductions) },
                ].map(row => (
                  <div key={row.label} className="flex justify-between py-2 border-b" style={{ borderColor: '#f3f4f6' }}>
                    <span className="text-sm" style={{ color: '#6b7280' }}>{row.label}</span>
                    <span className="text-sm font-semibold" style={{ color: '#1f2937' }}>{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between py-3 rounded-xl px-3" style={{ background: '#FFF8E7' }}>
                  <span className="text-sm font-bold" style={{ color: '#6F4E37' }}>Gaji Bersih</span>
                  <span className="text-lg font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: '#6F4E37' }}>
                    {formatRupiah(selectedEmp.net_salary)}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setSelectedEmp(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: '#F5F5F5', color: '#6b7280' }}>Tutup</button>
                {selectedEmp.status === 'Belum Dibayar' && (
                  <button
                    onClick={() => handleMarkPaid(selectedEmp.id)}
                    disabled={actionLoading === selectedEmp.id}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                    style={{ background: '#059669', color: 'white' }}>
                    {actionLoading === selectedEmp.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    Tandai Lunas
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Karyawan', value: records.length,     icon: <Users size={22} />,      color: '#6F4E37', bg: '#FFF8E7' },
          { label: 'Total Payroll',  value: formatRupiah(totalPayroll), icon: <DollarSign size={22} />, color: '#7c3aed', bg: '#f5f3ff', isText: true },
          { label: 'Sudah Dibayar',  value: paidCount,          icon: <CheckCircle size={22} />,color: '#059669', bg: '#ecfdf5' },
          { label: 'Belum Dibayar',  value: pendingCount,       icon: <Clock size={22} />,      color: '#d97706', bg: '#fffbeb' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
              <div style={{ color: card.color }}>{card.icon}</div>
            </div>
            <div>
              <div className={`font-bold`} style={{
                fontFamily: 'Montserrat, sans-serif', color: card.color,
                fontSize: (card as { isText?: boolean }).isText ? 14 : 22,
              }}>
                {loading ? '—' : card.value}
              </div>
              <div className="text-xs" style={{ color: '#9ca3af' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions bar */}
      <div className="rounded-2xl p-5 mb-4 flex flex-wrap items-center justify-between gap-3"
        style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#1f2937' }}>Periode: {PERIOD_LABEL}</p>
          {pendingCount > 0 && (
            <p className="text-xs mt-0.5" style={{ color: '#d97706' }}>
              {pendingCount} karyawan belum dibayar · {formatRupiah(totalPending)}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={generating || loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#6F4E37', color: 'white', cursor: generating ? 'not-allowed' : 'pointer' }}>
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Generate Payroll
          </button>
          {pendingCount > 0 && (
            <button
              onClick={handleMarkAllPaid}
              disabled={actionLoading === 'all'}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#059669', color: 'white' }}>
              {actionLoading === 'all' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Bayar Semua
            </button>
          )}
          <button onClick={handlePrintPDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#F5F5F5', color: '#6b7280' }}>
            <Printer size={16} /> PDF
          </button>
          <button onClick={handleExcelExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#F5F5F5', color: '#059669' }}>
            <TrendingUp size={16} /> Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin" style={{ color: '#6F4E37' }} />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users size={40} style={{ color: '#d1d5db' }} />
            <p className="text-sm" style={{ color: '#9ca3af' }}>Belum ada data payroll. Klik "Generate Payroll" untuk membuat.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F5F5F5' }}>
                {['Karyawan', 'Jabatan', 'Jam Kerja', 'Gaji Kotor', 'Potongan', 'Gaji Bersih', 'Status', 'Aksi'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: '#9ca3af' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((rec, i) => (
                <tr key={rec.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: '#FFF8E7', color: '#6F4E37' }}>
                        {(rec.employee as { avatar_initials: string })?.avatar_initials ?? '?'}
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#1f2937' }}>{getEmployeeName(rec)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><span className="text-sm" style={{ color: '#6b7280' }}>{getEmployeeRole(rec)}</span></td>
                  <td className="px-5 py-4"><span className="text-sm font-semibold" style={{ color: '#1f2937' }}>{rec.hours_worked}j</span></td>
                  <td className="px-5 py-4"><span className="text-sm" style={{ color: '#6b7280' }}>{formatRupiah(rec.gross_salary)}</span></td>
                  <td className="px-5 py-4"><span className="text-sm" style={{ color: '#dc2626' }}>-{formatRupiah(rec.deductions)}</span></td>
                  <td className="px-5 py-4"><span className="text-sm font-bold" style={{ color: '#6F4E37' }}>{formatRupiah(rec.net_salary)}</span></td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={rec.status === 'Sudah Dibayar'
                        ? { background: '#ecfdf5', color: '#059669' }
                        : { background: '#fffbeb', color: '#d97706' }}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedEmp(rec)}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                        style={{ background: '#F5F5F5', color: '#6b7280' }}>Lihat</button>
                      {rec.status === 'Belum Dibayar' && (
                        <button
                          onClick={() => handleMarkPaid(rec.id)}
                          disabled={actionLoading === rec.id}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1"
                          style={{ background: '#ecfdf5', color: '#059669' }}>
                          {actionLoading === rec.id ? <Loader2 size={12} className="animate-spin" /> : null}
                          Bayar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
