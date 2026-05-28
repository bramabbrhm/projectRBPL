import { useState } from 'react';
import type { ReactNode } from 'react';
import { ShoppingCart, Plus, Minus, Coffee, CreditCard, Smartphone, Banknote, CheckCircle, X, Search, Printer, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProducts } from '../../hooks/useProducts';
import { transactionService } from '../../services/transactionService';
import { exportReceiptToPDF } from '../../services/exportService';
import type { Transaction, ProductCategory } from '../../types/database';

type Category = 'all' | ProductCategory;
type PaymentMethod = 'Cash' | 'QRIS' | 'E-Wallet';

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

const CAT_LABELS: Record<Category, string> = {
  all: 'Semua',
  coffee: '☕ Kopi',
  'non-coffee': '🍵 Non-Kopi',
  snack: '🥐 Snack',
};

const PAYMENT_ICONS: Record<PaymentMethod, ReactNode> = {
  Cash: <Banknote size={20} />,
  QRIS: <Smartphone size={20} />,
  'E-Wallet': <CreditCard size={20} />,
};

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export function POSPage() {
  const { user } = useAuth();
  const { products, loading: productsLoading } = useProducts();
  const [category, setCategory] = useState<Category>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState<PaymentMethod>('Cash');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successTxn, setSuccessTxn] = useState<Transaction | null>(null);
  const [cashInput, setCashInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filtered = products.filter(p =>
    (category === 'all' || p.category === category) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: typeof products[0]) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(c => c.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev =>
      prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c)
        .filter(c => c.qty > 0)
    );
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;
  const cashNum = parseInt(cashInput.replace(/\D/g, '')) || 0;
  const change = cashNum - total;

  const handlePayment = async () => {
    if (cart.length === 0 || !user || submitting) return;
    setSubmitting(true);
    setError(null);

    const { data, error } = await transactionService.create({
      cashier_id: user.id,
      payment_method: payment,
      cart,
      cash_received: payment === 'Cash' ? cashNum : undefined,
    });

    setSubmitting(false);

    if (error) {
      setError(error);
      return;
    }

    if (data) {
      setSuccessTxn({ ...data, items: cart.map(c => ({
        id: '',
        transaction_id: data.id,
        product_id: c.id,
        product_name: c.name,
        quantity: c.qty,
        unit_price: c.price,
        total_price: c.price * c.qty,
      })) });
      setCart([]);
      setCashInput('');
    }
  };

  const handlePrintReceipt = async () => {
    if (!successTxn) return;
    await exportReceiptToPDF(successTxn);
  };

  const handleCloseSuccess = () => setSuccessTxn(null);

  return (
    <div className="flex gap-4 h-[calc(100vh-112px)]" style={{ fontFamily: 'Roboto, sans-serif' }}>
      {/* Success Modal */}
      {successTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-8 text-center w-80" style={{ background: 'white', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#ecfdf5' }}>
              <CheckCircle size={44} style={{ color: '#059669' }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Montserrat, sans-serif', color: '#1f2937' }}>
              Pembayaran Berhasil!
            </h3>
            <p className="text-sm" style={{ color: '#6b7280' }}>Total: {formatRupiah(successTxn.total)} · {successTxn.payment_method}</p>
            {successTxn.payment_method === 'Cash' && successTxn.change_amount != null && (
              <p className="text-sm mt-1 font-semibold" style={{ color: '#059669' }}>
                Kembalian: {formatRupiah(successTxn.change_amount)}
              </p>
            )}
            <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
              No. Transaksi: {successTxn.id.slice(0, 8).toUpperCase()}
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: '#F5F5F5', color: '#6b7280' }}>
                <Printer size={16} /> Cetak
              </button>
              <button
                onClick={handleCloseSuccess}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: '#6F4E37', color: 'white' }}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left: Product Grid */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-2xl" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Cari menu..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#F5F5F5', border: '1.5px solid #e5e7eb', color: '#374151' }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            {(Object.keys(CAT_LABELS) as Category[]).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: category === cat ? '#6F4E37' : '#F5F5F5',
                  color: category === cat ? 'white' : '#6b7280',
                }}
              >
                {CAT_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {productsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={32} className="animate-spin" style={{ color: '#6F4E37' }} />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(p => {
                const inCart = cart.find(c => c.id === p.id);
                const outOfStock = p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={outOfStock}
                    className="rounded-xl p-4 text-left transition-all relative"
                    style={{
                      background: outOfStock ? '#fafafa' : inCart ? '#FFF8E7' : '#F5F5F5',
                      border: inCart ? '2px solid #FFD700' : '2px solid transparent',
                      boxShadow: inCart ? '0 2px 12px rgba(255,215,0,0.2)' : 'none',
                      opacity: outOfStock ? 0.5 : 1,
                      cursor: outOfStock ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: '#FFD700', color: '#6F4E37' }}>
                        {inCart.qty}
                      </div>
                    )}
                    <div className="text-3xl mb-2">{p.emoji}</div>
                    <div className="text-sm font-semibold mb-1" style={{ color: '#1f2937' }}>{p.name}</div>
                    <div className="text-sm font-bold" style={{ color: '#6F4E37' }}>{formatRupiah(p.price)}</div>
                    <div className="text-xs mt-1" style={{ color: outOfStock ? '#ef4444' : '#9ca3af' }}>
                      {outOfStock ? 'Habis' : `Stok: ${p.stock}`}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-80 flex flex-col rounded-2xl overflow-hidden flex-shrink-0"
        style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-4 border-b flex items-center gap-2"
          style={{ borderColor: '#f3f4f6', background: '#6F4E37' }}>
          <ShoppingCart size={20} style={{ color: '#FFD700' }} />
          <span className="font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Keranjang ({cart.reduce((s, c) => s + c.qty, 0)})
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <Coffee size={40} style={{ color: '#d1d5db' }} />
              <p className="text-sm mt-3" style={{ color: '#9ca3af' }}>Keranjang masih kosong</p>
              <p className="text-xs mt-1" style={{ color: '#d1d5db' }}>Pilih menu di sebelah kiri</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="rounded-xl p-3" style={{ background: '#F5F5F5' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-medium flex-1" style={{ color: '#1f2937' }}>{item.name}</div>
                    <button onClick={() => removeItem(item.id)} className="ml-2" style={{ color: '#ef4444' }}>
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, -1)}
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: '#6F4E37', color: 'white' }}>
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-bold w-5 text-center" style={{ color: '#1f2937' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)}
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: '#6F4E37', color: 'white' }}>
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="text-sm font-bold" style={{ color: '#6F4E37' }}>
                      {formatRupiah(item.price * item.qty)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t" style={{ borderColor: '#f3f4f6', background: '#fafafa' }}>
          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ background: '#fee2e2', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-sm" style={{ color: '#6b7280' }}>
              <span>Subtotal</span><span>{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: '#6b7280' }}>
              <span>Pajak (10%)</span><span>{formatRupiah(tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t" style={{ color: '#1f2937', borderColor: '#e5e7eb' }}>
              <span>Total</span><span style={{ color: '#6F4E37' }}>{formatRupiah(total)}</span>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>METODE PEMBAYARAN</p>
            <div className="grid grid-cols-3 gap-2">
              {(['Cash', 'QRIS', 'E-Wallet'] as PaymentMethod[]).map(m => (
                <button key={m} onClick={() => setPayment(m)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: payment === m ? '#6F4E37' : '#F5F5F5',
                    color: payment === m ? 'white' : '#6b7280',
                    border: payment === m ? '2px solid #6F4E37' : '2px solid #e5e7eb',
                  }}>
                  {PAYMENT_ICONS[m]}
                  {m}
                </button>
              ))}
            </div>
          </div>

          {payment === 'Cash' && (
            <div className="mb-3">
              <input
                type="text"
                placeholder="Uang diterima"
                value={cashInput}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setCashInput(val ? parseInt(val).toLocaleString('id-ID') : '');
                }}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ border: '1.5px solid #e5e7eb', color: '#374151' }}
              />
              {change >= 0 && cashInput && (
                <p className="text-xs mt-1.5 font-semibold" style={{ color: '#059669' }}>
                  Kembalian: {formatRupiah(change)}
                </p>
              )}
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={cart.length === 0 || submitting}
            className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: cart.length === 0 || submitting ? '#e5e7eb' : 'linear-gradient(135deg, #FFD700 0%, #FFC200 100%)',
              color: cart.length === 0 || submitting ? '#9ca3af' : '#6F4E37',
              boxShadow: cart.length > 0 && !submitting ? '0 4px 12px rgba(255,215,0,0.4)' : 'none',
              cursor: cart.length === 0 || submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {submitting ? 'Memproses...' : 'Proses Pembayaran'}
          </button>
        </div>
      </div>
    </div>
  );
}
