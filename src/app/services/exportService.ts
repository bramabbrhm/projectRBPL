import type { Transaction, PayrollRecord, MonthlyChartData } from '../types/database';

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

// ── Excel export ──────────────────────────────────────────
export async function exportTransactionsToExcel(transactions: Transaction[], filename = 'transaksi') {
  const { utils, writeFile } = await import('xlsx');
  const rows = transactions.map(t => ({
    ID: t.id.slice(0, 8).toUpperCase(),
    Tanggal: new Date(t.created_at).toLocaleDateString('id-ID'),
    Waktu: new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    Kasir: (t.cashier as { full_name: string })?.full_name ?? '-',
    'Metode Bayar': t.payment_method,
    Subtotal: t.subtotal,
    Pajak: t.tax,
    Total: t.total,
  }));
  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Transaksi');
  writeFile(wb, `${filename}_${Date.now()}.xlsx`);
}

export async function exportPayrollToExcel(records: PayrollRecord[], filename = 'payroll') {
  const { utils, writeFile } = await import('xlsx');
  const rows = records.map(r => ({
    Karyawan: (r.employee as { full_name: string })?.full_name ?? '-',
    Jabatan: (r.employee as { role: string })?.role ?? '-',
    'Periode Mulai': r.period_start,
    'Periode Akhir': r.period_end,
    'Jam Kerja': r.hours_worked,
    'Tarif/Jam': r.hourly_rate,
    'Gaji Kotor': r.gross_salary,
    Potongan: r.deductions,
    'Gaji Bersih': r.net_salary,
    Status: r.status,
  }));
  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Payroll');
  writeFile(wb, `${filename}_${Date.now()}.xlsx`);
}

export async function exportFinancialReportToExcel(data: MonthlyChartData[], filename = 'laporan_keuangan') {
  const { utils, writeFile } = await import('xlsx');
  const rows = data.map(d => ({
    Bulan: d.month,
    Pendapatan: d.revenue,
    Pengeluaran: d.expense,
    'Laba Bersih': d.profit,
  }));
  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Laporan Keuangan');
  writeFile(wb, `${filename}_${Date.now()}.xlsx`);
}

// ── PDF export ────────────────────────────────────────────
export async function exportPayrollToPDF(records: PayrollRecord[], period: string) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Coffee Street — Laporan Payroll', 14, 20);
  doc.setFontSize(10);
  doc.text(`Periode: ${period}`, 14, 28);
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 34);

  autoTable(doc, {
    startY: 42,
    head: [['Karyawan', 'Jabatan', 'Jam Kerja', 'Gaji Kotor', 'Potongan', 'Gaji Bersih', 'Status']],
    body: records.map(r => [
      (r.employee as { full_name: string })?.full_name ?? '-',
      (r.employee as { role: string })?.role ?? '-',
      `${r.hours_worked} jam`,
      formatRupiah(r.gross_salary),
      formatRupiah(r.deductions),
      formatRupiah(r.net_salary),
      r.status,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [111, 78, 55] },
  });

  const total = records.reduce((s, r) => s + r.net_salary, 0);
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.text(`Total Payroll: ${formatRupiah(total)}`, 14, finalY);

  doc.save(`payroll_${period}_${Date.now()}.pdf`);
}

export async function exportReceiptToPDF(transaction: Transaction) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ format: [80, 200], unit: 'mm' });

  const cx = 40;
  let y = 8;
  const line = () => { doc.line(4, y, 76, y); y += 3; };

  doc.setFontSize(12);
  doc.text('COFFEE STREET', cx, y, { align: 'center' }); y += 5;
  doc.setFontSize(8);
  doc.text('Jl. Kopi Enak No. 1, Jakarta', cx, y, { align: 'center' }); y += 4;
  doc.text('Telp: 021-1234567', cx, y, { align: 'center' }); y += 4;
  line();

  doc.text(`No: ${transaction.id.slice(0, 8).toUpperCase()}`, 4, y); y += 4;
  doc.text(`Tgl: ${new Date(transaction.created_at).toLocaleDateString('id-ID')}`, 4, y); y += 4;
  doc.text(`Kasir: ${(transaction.cashier as { full_name: string })?.full_name ?? '-'}`, 4, y); y += 4;
  doc.text(`Bayar: ${transaction.payment_method}`, 4, y); y += 4;
  line();

  (transaction.items ?? []).forEach((item: Record<string, unknown>) => {
    doc.text(`${item.product_name}`, 4, y); y += 4;
    doc.text(`  ${item.quantity}x ${formatRupiah(item.unit_price as number)}`, 4, y);
    doc.text(formatRupiah(item.total_price as number), 76, y, { align: 'right' }); y += 5;
  });

  line();
  doc.text('Subtotal', 4, y); doc.text(formatRupiah(transaction.subtotal), 76, y, { align: 'right' }); y += 4;
  doc.text('Pajak (10%)', 4, y); doc.text(formatRupiah(transaction.tax), 76, y, { align: 'right' }); y += 4;
  doc.setFontSize(10);
  doc.text('TOTAL', 4, y); doc.text(formatRupiah(transaction.total), 76, y, { align: 'right' }); y += 5;

  if (transaction.cash_received) {
    doc.setFontSize(8);
    doc.text('Tunai', 4, y); doc.text(formatRupiah(transaction.cash_received), 76, y, { align: 'right' }); y += 4;
    doc.text('Kembali', 4, y); doc.text(formatRupiah(transaction.change_amount ?? 0), 76, y, { align: 'right' }); y += 4;
  }

  line();
  doc.setFontSize(8);
  doc.text('Terima kasih! Selamat menikmati kopi Anda ☕', cx, y, { align: 'center' }); y += 4;
  doc.text('Coffee Street — Where Every Sip Matters', cx, y, { align: 'center' });

  doc.save(`struk_${transaction.id.slice(0, 8)}.pdf`);
}
