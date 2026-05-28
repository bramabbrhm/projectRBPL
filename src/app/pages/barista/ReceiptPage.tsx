import { useState, useRef, useEffect } from 'react';
import { Printer, Coffee, CheckCircle, Receipt, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { transactionService } from '../../services/transactionService';
import { exportReceiptToPDF } from '../../services/exportService';
import type { Transaction } from '../../types/database';

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export function ReceiptPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    transactionService.getByCashier(user.id, 30).then(({ data }) => {
      const txns = data ?? [];
      setTransactions(txns);
      if (txns.length > 0) setSelectedTx(txns[0]);
      setLoading(false);
    });
  }, [user]);

  const handlePrint = () => {
    const content = receiptRef.current?.innerHTML;
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win || !content) return;
    win.document.write(`<html><head><title>Struk</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;padding:20px}.divider{border-top:1px dashed #000;margin:8px 0}.center{text-align:center}.bold{font-weight:bold}.row{display:flex;justify-content:space-between;margin-bottom:4px}</style></head><body>${content}</body></html>`);
    win.document.close();
    win.print();
  };

  const handlePDFExport = async () => {
    if (!selectedTx) return;
    await exportReceiptToPDF(selectedTx);
  };

  return (
    <div className="flex gap-6" style={{ fontFamily: 'Roboto, sans-serif' }}>
      {/* Transaction List */}
      <div className="w-80 flex-shrink-0 rounded-2xl overflow-hidden"
        style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: 'fit-content' }}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#f3f4f6', background: '#6F4E37' }}>
          <Receipt size={18} style={{ color: '#FFD700' }} />
          <span className="font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Transaksi Saya</span>
        </div>
        <div className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight: 500 }}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin" style={{ color: '#6F4E37' }} />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Receipt size={28} style={{ color: '#d1d5db' }} />
              <p className="text-xs" style={{ color: '#9ca3af' }}>Belum ada transaksi</p>
            </div>
          ) : transactions.map(tx => (
            <button
              key={tx.id}
              onClick={() => setSelectedTx(tx)}
              className="w-full text-left p-3 rounded-xl transition-all"
              style={{
                background: selectedTx?.id === tx.id ? '#FFF8E7' : '#F5F5F5',
                border: selectedTx?.id === tx.id ? '2px solid #FFD700' : '2px solid transparent',
              }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold" style={{ color: '#6F4E37' }}>
                  {tx.id.slice(0, 8).toUpperCase()}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#ecfdf5', color: '#059669' }}>
                  {tx.payment_method}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#9ca3af' }}>
                  {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-sm font-bold" style={{ color: '#1f2937' }}>
                  {formatRupiah(tx.total)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Receipt Preview */}
      <div className="flex-1">
        {!selectedTx ? (
          <div className="flex flex-col items-center justify-center h-full rounded-2xl"
            style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', minHeight: 400 }}>
            <Coffee size={48} style={{ color: '#d1d5db' }} />
            <p className="mt-3 text-sm" style={{ color: '#9ca3af' }}>Pilih transaksi untuk melihat struk</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {/* Toolbar */}
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#f3f4f6' }}>
              <h3 className="font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
                Preview Struk
              </h3>
              <div className="flex gap-3">
                <button onClick={handlePDFExport}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: '#FFF8E7', color: '#6F4E37', border: '1px solid #FFD70040' }}>
                  PDF
                </button>
                <button onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: '#6F4E37', color: 'white' }}>
                  <Printer size={16} />
                  Cetak
                </button>
              </div>
            </div>

            {/* Thermal Receipt */}
            <div className="flex justify-center p-8" style={{ background: '#F5F5F5' }}>
              <div ref={receiptRef}
                style={{
                  background: 'white',
                  width: 300,
                  padding: 20,
                  fontFamily: "'Courier New', monospace",
                  fontSize: 12,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  borderRadius: 4,
                }}>
                {/* Header */}
                <div className="text-center mb-3">
                  <div className="font-bold text-base">☕ COFFEE STREET</div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>Jl. Kopi Enak No. 1, Jakarta</div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>Telp: 021-1234567</div>
                </div>
                <div className="mb-2" style={{ borderTop: '1px dashed #000' }} />

                {/* Transaction Info */}
                <div className="text-xs space-y-0.5 mb-2">
                  <div className="flex justify-between">
                    <span>No</span><span className="font-bold">{selectedTx.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tgl</span>
                    <span>{new Date(selectedTx.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waktu</span>
                    <span>{new Date(selectedTx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir</span>
                    <span>{user?.name ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bayar</span>
                    <span className="font-bold">{selectedTx.payment_method}</span>
                  </div>
                </div>
                <div className="mb-2" style={{ borderTop: '1px dashed #000' }} />

                {/* Items */}
                <div className="space-y-1 mb-2">
                  {(selectedTx.items ?? []).map((item, idx) => (
                    <div key={idx}>
                      <div className="text-xs font-bold">{(item as { product_name: string }).product_name}</div>
                      <div className="flex justify-between text-xs">
                        <span>{(item as { quantity: number }).quantity}x {formatRupiah((item as { unit_price: number }).unit_price)}</span>
                        <span className="font-bold">{formatRupiah((item as { total_price: number }).total_price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mb-2" style={{ borderTop: '1px dashed #000' }} />

                {/* Totals */}
                <div className="space-y-0.5 text-xs mb-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span><span>{formatRupiah(selectedTx.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pajak (10%)</span><span>{formatRupiah(selectedTx.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm">
                    <span>TOTAL</span><span>{formatRupiah(selectedTx.total)}</span>
                  </div>
                  {selectedTx.payment_method === 'Cash' && selectedTx.cash_received && (
                    <>
                      <div className="flex justify-between">
                        <span>Tunai</span><span>{formatRupiah(selectedTx.cash_received)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Kembali</span><span>{formatRupiah(selectedTx.change_amount ?? 0)}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="mb-2" style={{ borderTop: '1px dashed #000' }} />

                {/* Footer */}
                <div className="text-center text-xs" style={{ color: '#6b7280' }}>
                  <div>Terima kasih telah berkunjung!</div>
                  <div>Selamat menikmati kopi Anda ☕</div>
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <CheckCircle size={10} style={{ color: '#059669' }} />
                    <span>Pembayaran Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
