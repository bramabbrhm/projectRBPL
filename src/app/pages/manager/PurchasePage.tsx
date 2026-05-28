import { useState, useEffect } from 'react';
import {
  ShoppingBag, CheckCircle, Plus, X, Package,
  Loader2, Users, Edit2, Trash2, ChevronRight, Database,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { purchaseService } from '../../services/purchaseService';
import type { Purchase, Supplier, InventoryItem } from '../../types/database';
import { inventoryService } from '../../services/inventoryService';

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

interface LocalItem {
  uid: string;
  inventory_id: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
}

interface SupplierForm {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
}

const EMPTY_SUPPLIER_FORM: SupplierForm = { name: '', contact_person: '', phone: '', email: '', address: '' };

export function PurchasePage() {
  const { user } = useAuth();

  // Data state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // PO form state
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LocalItem[]>([
    { uid: '1', inventory_id: '', name: '', qty: 1, unit: 'kg', price: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Supplier management modal state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(EMPTY_SUPPLIER_FORM);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierAction, setSupplierAction] = useState(false);
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState<Supplier | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);

  const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    Menunggu:   { bg: '#fffbeb', color: '#d97706' },
    Diterima:   { bg: '#ecfdf5', color: '#059669' },
    Dibatalkan: { bg: '#fee2e2', color: '#dc2626' },
  };

  useEffect(() => {
    Promise.all([
      purchaseService.getSuppliers(),
      inventoryService.getAll(),
      purchaseService.getAll(),
    ]).then(([sup, inv, po]) => {
      setSuppliers(sup.data ?? []);
      setInventoryItems(inv.data ?? []);
      setPurchases(po.data ?? []);
      // Surface first DB error if any
      const firstError = sup.error ?? inv.error ?? po.error;
      if (firstError?.includes('DATABASE_NOT_CONFIGURED')) setDbError(firstError);
      setLoadingData(false);
    });
  }, []);

  // ── PO item helpers ──
  const addItem = () =>
    setItems(prev => [...prev, { uid: Date.now().toString(), inventory_id: '', name: '', qty: 1, unit: 'kg', price: 0 }]);

  const removeItem = (uid: string) => setItems(prev => prev.filter(i => i.uid !== uid));

  const updateLocalItem = (uid: string, field: keyof LocalItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.uid !== uid) return item;
      if (field === 'inventory_id') {
        const found = inventoryItems.find(s => s.id === value);
        return { ...item, inventory_id: value as string, name: found?.name ?? '', unit: found?.unit ?? 'kg' };
      }
      return { ...item, [field]: value };
    }));
  };

  const totalCost = items.reduce((s, i) => s + i.qty * i.price, 0);
  const isValid = supplierId && items.every(i => i.inventory_id && i.qty > 0 && i.price > 0);

  // ── Save PO ──
  const handleSave = async () => {
    if (!supplierId || !user || items.some(i => !i.inventory_id || i.qty <= 0 || i.price <= 0)) return;
    setSubmitting(true);

    const { data, error } = await purchaseService.create({
      supplier_id: supplierId,
      ordered_by: user.id,
      notes,
      items: items.map(i => ({
        inventory_id: i.inventory_id,
        quantity: i.qty,
        unit_price: i.price,
      })),
    });

    setSubmitting(false);
    if (error || !data) {
      toast.error('Gagal membuat PO: ' + (error ?? 'Unknown error'));
      return;
    }

    toast.success('Purchase Order berhasil dibuat!');
    setPurchases(prev => [data, ...prev]);
    setSupplierId('');
    setNotes('');
    setItems([{ uid: Date.now().toString(), inventory_id: '', name: '', qty: 1, unit: 'kg', price: 0 }]);
  };

  // ── Update PO status ──
  const handleUpdateStatus = async (id: string, status: 'Diterima' | 'Dibatalkan') => {
    const { error } = await purchaseService.updateStatus(id, status);
    if (error) {
      toast.error('Gagal memperbarui status: ' + error);
      return;
    }
    setPurchases(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    if (status === 'Diterima') {
      toast.success('PO diterima. Stok inventori telah diperbarui.');
    } else {
      toast.error('PO dibatalkan.');
    }
  };

  // ── Supplier CRUD ──
  const openCreateSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm(EMPTY_SUPPLIER_FORM);
    setShowSupplierForm(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name,
      contact_person: s.contact_person ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      address: s.address ?? '',
    });
    setShowSupplierForm(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name.trim()) {
      toast.error('Nama supplier wajib diisi.');
      return;
    }
    setSupplierAction(true);
    const payload = {
      name: supplierForm.name.trim(),
      contact_person: supplierForm.contact_person || null,
      phone: supplierForm.phone || null,
      email: supplierForm.email || null,
      address: supplierForm.address || null,
    };

    if (editingSupplier) {
      const { data, error } = await purchaseService.updateSupplier(editingSupplier.id, payload);
      setSupplierAction(false);
      if (error || !data) { toast.error('Gagal menyimpan supplier.'); return; }
      setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? data : s));
      toast.success(`${data.name} berhasil diperbarui.`);
    } else {
      const { data, error } = await purchaseService.createSupplier(payload);
      setSupplierAction(false);
      if (error || !data) { toast.error('Gagal menambah supplier.'); return; }
      setSuppliers(prev => [...prev, data]);
      toast.success(`${data.name} berhasil ditambahkan.`);
    }
    setShowSupplierForm(false);
    setEditingSupplier(null);
  };

  const handleDeleteSupplier = async () => {
    if (!deleteSupplierTarget) return;
    setSupplierAction(true);
    const { error } = await purchaseService.deleteSupplier(deleteSupplierTarget.id);
    setSupplierAction(false);
    if (error) { toast.error('Gagal menghapus supplier.'); return; }
    setSuppliers(prev => prev.filter(s => s.id !== deleteSupplierTarget.id));
    if (supplierId === deleteSupplierTarget.id) setSupplierId('');
    toast.success(`${deleteSupplierTarget.name} telah dihapus.`);
    setDeleteSupplierTarget(null);
  };

  const inputStyle = { border: '1.5px solid #e5e7eb', color: '#374151', background: 'white' };

  return (
    <div style={{ fontFamily: 'Roboto, sans-serif' }}>
      <Toaster position="top-right" richColors />

      {/* ── Supplier Management Modal ── */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl w-[520px] max-w-[95vw] flex flex-col"
            style={{ background: 'white', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '85vh' }}>

            {/* Modal header */}
            <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
              style={{ background: '#6F4E37', borderRadius: '16px 16px 0 0' }}>
              <div className="flex items-center gap-2">
                <Users size={18} style={{ color: '#FFD700' }} />
                <h3 className="font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Kelola Supplier
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {!showSupplierForm && (
                  <button
                    onClick={openCreateSupplier}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                    style={{ background: '#FFD700', color: '#6F4E37' }}>
                    <Plus size={14} /> Tambah
                  </button>
                )}
                <button onClick={() => { setShowSupplierModal(false); setShowSupplierForm(false); }}
                  style={{ color: '#C19A6B' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Delete confirm (inside modal) */}
            {deleteSupplierTarget && (
              <div className="px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#f3f4f6', background: '#fff5f5' }}>
                <p className="text-sm font-semibold mb-2" style={{ color: '#dc2626' }}>
                  Hapus "{deleteSupplierTarget.name}"?
                </p>
                <p className="text-xs mb-3" style={{ color: '#6b7280' }}>
                  Supplier tidak akan muncul di dropdown, namun riwayat PO tetap tersimpan.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setDeleteSupplierTarget(null)}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: '#F5F5F5', color: '#6b7280' }}>Batal</button>
                  <button onClick={handleDeleteSupplier} disabled={supplierAction}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1"
                    style={{ background: '#dc2626', color: 'white', cursor: supplierAction ? 'not-allowed' : 'pointer' }}>
                    {supplierAction ? <Loader2 size={14} className="animate-spin" /> : null}
                    Hapus
                  </button>
                </div>
              </div>
            )}

            {/* Add/Edit form */}
            {showSupplierForm && (
              <div className="px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#f3f4f6', background: '#FAFAFA' }}>
                <h4 className="text-sm font-semibold mb-3" style={{ color: '#3d2b1f' }}>
                  {editingSupplier ? `Edit: ${editingSupplier.name}` : 'Tambah Supplier Baru'}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>Nama Supplier *</label>
                    <input type="text" placeholder="Nama perusahaan atau toko"
                      value={supplierForm.name}
                      onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>Kontak</label>
                    <input type="text" placeholder="Nama kontak"
                      value={supplierForm.contact_person}
                      onChange={e => setSupplierForm(f => ({ ...f, contact_person: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>No. Telepon</label>
                    <input type="text" placeholder="08xx-xxxx-xxxx"
                      value={supplierForm.phone}
                      onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>Email</label>
                    <input type="email" placeholder="email@supplier.com"
                      value={supplierForm.email}
                      onChange={e => setSupplierForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>Alamat</label>
                    <input type="text" placeholder="Alamat supplier"
                      value={supplierForm.address}
                      onChange={e => setSupplierForm(f => ({ ...f, address: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setShowSupplierForm(false); setEditingSupplier(null); }}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: '#F5F5F5', color: '#6b7280' }}>Batal</button>
                  <button onClick={handleSaveSupplier} disabled={supplierAction}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1"
                    style={{ background: '#6F4E37', color: 'white', cursor: supplierAction ? 'not-allowed' : 'pointer' }}>
                    {supplierAction ? <Loader2 size={14} className="animate-spin" /> : null}
                    {editingSupplier ? 'Simpan' : 'Tambah'}
                  </button>
                </div>
              </div>
            )}

            {/* Supplier list */}
            <div className="overflow-y-auto flex-1">
              {suppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Users size={32} style={{ color: '#d1d5db' }} />
                  <p className="text-sm" style={{ color: '#9ca3af' }}>Belum ada supplier</p>
                </div>
              ) : suppliers.map(s => (
                <div key={s.id} className="px-6 py-4 border-b flex items-start justify-between"
                  style={{ borderColor: '#f3f4f6' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#1f2937' }}>{s.name}</p>
                    {s.contact_person && <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{s.contact_person}</p>}
                    {s.phone && <p className="text-xs" style={{ color: '#9ca3af' }}>{s.phone}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openEditSupplier(s)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold"
                      style={{ background: '#FFF8E7', color: '#6F4E37' }}>
                      <Edit2 size={12} /> Edit
                    </button>
                    <button onClick={() => setDeleteSupplierTarget(s)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold"
                      style={{ background: '#fee2e2', color: '#dc2626' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Database setup banner */}
      {dbError && (
        <div className="mb-5 p-4 rounded-2xl flex items-start gap-3"
          style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
          <Database size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
              Database belum dikonfigurasi
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#b45309' }}>
              Jalankan <code className="px-1.5 py-0.5 rounded" style={{ background: '#fde68a' }}>supabase-patch.sql</code> di
              Supabase SQL Editor (Dashboard → SQL Editor → New Query → paste isi file → Run).
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── PO Form ── */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden"
          style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="px-6 py-4 border-b flex items-center gap-3"
            style={{ borderColor: '#f3f4f6', background: '#6F4E37' }}>
            <ShoppingBag size={20} style={{ color: '#FFD700' }} />
            <h3 className="font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Buat Purchase Order
            </h3>
          </div>

          <div className="p-6 space-y-5">
            {/* Supplier */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>
                  Supplier
                </label>
                <button
                  onClick={() => { setShowSupplierModal(true); setShowSupplierForm(false); setDeleteSupplierTarget(null); }}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: '#F5F5F5', color: '#6F4E37' }}>
                  <Users size={12} /> Kelola Supplier
                  <ChevronRight size={12} />
                </button>
              </div>
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid #e5e7eb', color: supplierId ? '#374151' : '#9ca3af', background: 'white' }}>
                <option value="">Pilih supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>
                  Item Pembelian
                </label>
                <button onClick={addItem}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: '#FFF8E7', color: '#6F4E37' }}>
                  <Plus size={14} /> Tambah Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.uid} className="p-4 rounded-xl flex gap-3" style={{ background: '#F5F5F5' }}>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <select
                        value={item.inventory_id}
                        onChange={e => updateLocalItem(item.uid, 'inventory_id', e.target.value)}
                        className="col-span-2 px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ border: '1.5px solid #e5e7eb', background: 'white', color: item.inventory_id ? '#374151' : '#9ca3af' }}>
                        <option value="">Pilih bahan baku...</option>
                        {inventoryItems.map(inv => (
                          <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                        ))}
                      </select>
                      <input
                        type="number" min={0.1} step="0.1"
                        placeholder="Qty"
                        value={item.qty || ''}
                        onChange={e => updateLocalItem(item.uid, 'qty', parseFloat(e.target.value) || 0)}
                        className="px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ border: '1.5px solid #e5e7eb', background: 'white', color: '#374151' }}
                      />
                      <input
                        type="number" min={0}
                        placeholder="Harga/unit (Rp)"
                        value={item.price || ''}
                        onChange={e => updateLocalItem(item.uid, 'price', parseFloat(e.target.value) || 0)}
                        className="px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ border: '1.5px solid #e5e7eb', background: 'white', color: '#374151' }}
                      />
                    </div>
                    <div className="flex flex-col items-center justify-between">
                      <button onClick={() => removeItem(item.uid)} style={{ color: '#ef4444' }}>
                        <X size={16} />
                      </button>
                      <span className="text-xs font-bold" style={{ color: '#6F4E37' }}>
                        {formatRupiah(item.qty * item.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6b7280' }}>
                Catatan
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Catatan tambahan..."
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ border: '1.5px solid #e5e7eb', color: '#374151' }}
              />
            </div>

            {/* Total & Submit */}
            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: '#f3f4f6' }}>
              <div>
                <p className="text-xs" style={{ color: '#9ca3af' }}>Total Pembelian</p>
                <p className="text-xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: '#6F4E37' }}>
                  {formatRupiah(totalCost)}
                </p>
              </div>
              <button
                onClick={handleSave}
                disabled={!isValid || submitting}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: !isValid || submitting ? '#e5e7eb' : 'linear-gradient(135deg, #6F4E37 0%, #8B6347 100%)',
                  color: !isValid || submitting ? '#9ca3af' : 'white',
                  cursor: !isValid || submitting ? 'not-allowed' : 'pointer',
                  boxShadow: isValid && !submitting ? '0 4px 12px rgba(111,78,55,0.3)' : 'none',
                }}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Buat PO
              </button>
            </div>
          </div>
        </div>

        {/* ── Recent Purchases ── */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden"
          style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: '#f3f4f6' }}>
            <Package size={20} style={{ color: '#6F4E37' }} />
            <h3 className="font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
              Riwayat PO
            </h3>
          </div>
          {loadingData ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={28} className="animate-spin" style={{ color: '#6F4E37' }} />
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
              {purchases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Package size={36} style={{ color: '#d1d5db' }} />
                  <p className="text-sm mt-2" style={{ color: '#9ca3af' }}>Belum ada PO</p>
                </div>
              ) : purchases.map(po => {
                const supplierName = (po.supplier as { name: string })?.name ?? '-';
                const statusStyle = STATUS_STYLE[po.status] ?? STATUS_STYLE.Menunggu;
                const dateLabel = new Date(po.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'short', year: 'numeric',
                });
                return (
                  <div key={po.id} className="px-5 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#1f2937' }}>{supplierName}</p>
                        <p className="text-xs" style={{ color: '#9ca3af' }}>
                          {dateLabel} · PO/{po.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ background: statusStyle.bg, color: statusStyle.color }}>
                        {po.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold" style={{ color: '#6F4E37' }}>
                        {formatRupiah(po.total_amount)}
                      </span>
                      {po.status === 'Menunggu' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdateStatus(po.id, 'Diterima')}
                            className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                            style={{ background: '#ecfdf5', color: '#059669' }}>
                            Terima
                          </button>
                          <button onClick={() => handleUpdateStatus(po.id, 'Dibatalkan')}
                            className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                            style={{ background: '#fee2e2', color: '#dc2626' }}>
                            Batal
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
