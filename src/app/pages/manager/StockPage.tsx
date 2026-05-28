import { useState } from 'react';
import {
  Search, Plus, Filter, Package, AlertTriangle, TrendingDown,
  CheckCircle, Loader2, Save, X, Trash2, Edit2, Database,
} from 'lucide-react';
import { Link } from 'react-router';
import { toast, Toaster } from 'sonner';
import { useInventory } from '../../hooks/useInventory';
import type { InventoryItem } from '../../types/database';

type FilterStatus = 'all' | 'Normal' | 'Warning' | 'Critical';

const STATUS_STYLE = {
  Normal:   { bg: '#ecfdf5', color: '#059669', icon: <CheckCircle size={14} /> },
  Warning:  { bg: '#fffbeb', color: '#d97706', icon: <AlertTriangle size={14} /> },
  Critical: { bg: '#fee2e2', color: '#dc2626', icon: <TrendingDown size={14} /> },
};

const CATEGORIES = ['Bahan Baku', 'Kemasan', 'Bumbu', 'Minuman', 'Peralatan', 'Lainnya'];
const UNITS = ['kg', 'gram', 'liter', 'ml', 'pcs', 'pack', 'botol', 'karung'];

interface ItemForm {
  name: string;
  category: string;
  unit: string;
  available: number;
  min_stock: number;
}

const EMPTY_FORM: ItemForm = { name: '', category: 'Bahan Baku', unit: 'kg', available: 0, min_stock: 0 };

export function StockPage() {
  const { items, loading, error, createItem, updateItem, deleteItem } = useInventory();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<ItemForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState<ItemForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const categories = ['all', ...Array.from(new Set([...CATEGORIES, ...items.map(s => s.category)]))];

  const filtered = items.filter(item =>
    (filterStatus === 'all' || item.status === filterStatus) &&
    (filterCategory === 'all' || item.category === filterCategory) &&
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    all: items.length,
    Normal: items.filter(s => s.status === 'Normal').length,
    Warning: items.filter(s => s.status === 'Warning').length,
    Critical: items.filter(s => s.status === 'Critical').length,
  };

  // ── Create ──
  const openCreate = () => {
    setCreateForm(EMPTY_FORM);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.unit.trim()) {
      toast.error('Nama dan satuan wajib diisi.');
      return;
    }
    setCreating(true);
    const { error } = await createItem({
      name: createForm.name.trim(),
      category: createForm.category,
      unit: createForm.unit,
      available: createForm.available,
      min_stock: createForm.min_stock,
    });
    setCreating(false);
    if (error) {
      toast.error('Gagal menambah item: ' + error);
    } else {
      toast.success(`${createForm.name} berhasil ditambahkan.`);
      setShowCreate(false);
    }
  };

  // ── Edit ──
  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setEditForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      available: item.available,
      min_stock: item.min_stock,
    });
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    if (!editForm.name.trim() || !editForm.unit.trim()) {
      toast.error('Nama dan satuan wajib diisi.');
      return;
    }
    setSaving(true);
    const error = await updateItem(editItem.id, {
      name: editForm.name.trim(),
      category: editForm.category,
      unit: editForm.unit,
      available: editForm.available,
      min_stock: editForm.min_stock,
    });
    setSaving(false);
    if (error) {
      toast.error('Gagal menyimpan: ' + error);
    } else {
      toast.success(`${editForm.name} berhasil diperbarui.`);
      setEditItem(null);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const error = await deleteItem(deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error('Gagal menghapus: ' + error);
    } else {
      toast.success(`${deleteTarget.name} berhasil dihapus.`);
    }
    setDeleteTarget(null);
  };

  const inputStyle = { border: '1.5px solid #e5e7eb', color: '#374151', background: 'white' };

  const isDbError = error?.includes('DATABASE_NOT_CONFIGURED');

  return (
    <div style={{ fontFamily: 'Roboto, sans-serif' }}>
      <Toaster position="top-right" richColors />

      {/* Database setup banner */}
      {isDbError && (
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

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl w-[440px] max-w-[95vw]" style={{ background: 'white', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: '#f3f4f6', background: '#6F4E37', borderRadius: '16px 16px 0 0' }}>
              <h3 className="font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Tambah Item Baru
              </h3>
              <button onClick={() => setShowCreate(false)} style={{ color: '#C19A6B' }}><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>Nama Item *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Biji Kopi Arabika"
                    value={createForm.name}
                    onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>Kategori</label>
                  <select
                    value={createForm.category}
                    onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>Satuan *</label>
                  <select
                    value={createForm.unit}
                    onChange={e => setCreateForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>Stok Awal</label>
                  <input
                    type="number" min={0} step="0.1"
                    value={createForm.available}
                    onChange={e => setCreateForm(f => ({ ...f, available: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>Stok Minimum</label>
                  <input
                    type="number" min={0} step="0.1"
                    value={createForm.min_stock}
                    onChange={e => setCreateForm(f => ({ ...f, min_stock: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: '#F5F5F5', color: '#6b7280' }}>
                  Batal
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: '#6F4E37', color: 'white', cursor: creating ? 'not-allowed' : 'pointer' }}>
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Tambah
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl w-[440px] max-w-[95vw]" style={{ background: 'white', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: '#f3f4f6', background: '#6F4E37', borderRadius: '16px 16px 0 0' }}>
              <h3 className="font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Edit Item
              </h3>
              <button onClick={() => setEditItem(null)} style={{ color: '#C19A6B' }}><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>Nama Item *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>Kategori</label>
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>Satuan *</label>
                  <select
                    value={editForm.unit}
                    onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>Stok Tersedia</label>
                  <input
                    type="number" min={0} step="0.1"
                    value={editForm.available}
                    onChange={e => setEditForm(f => ({ ...f, available: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>Stok Minimum</label>
                  <input
                    type="number" min={0} step="0.1"
                    value={editForm.min_stock}
                    onChange={e => setEditForm(f => ({ ...f, min_stock: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditItem(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: '#F5F5F5', color: '#6b7280' }}>
                  Batal
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: '#6F4E37', color: 'white', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl w-80 text-center" style={{ background: 'white', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div className="px-6 pt-8 pb-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#fee2e2' }}>
                <Trash2 size={28} style={{ color: '#dc2626' }} />
              </div>
              <h3 className="font-bold text-base mb-2" style={{ fontFamily: 'Montserrat, sans-serif', color: '#1f2937' }}>
                Hapus Item?
              </h3>
              <p className="text-sm mb-1" style={{ color: '#6b7280' }}>
                Anda akan menghapus:
              </p>
              <p className="text-sm font-semibold mb-4" style={{ color: '#1f2937' }}>
                "{deleteTarget.name}"
              </p>
              <p className="text-xs mb-6" style={{ color: '#9ca3af' }}>
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex border-t" style={{ borderColor: '#f3f4f6' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3.5 text-sm font-semibold rounded-bl-2xl"
                style={{ color: '#6b7280', background: '#fafafa' }}>
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3.5 text-sm font-semibold rounded-br-2xl flex items-center justify-center gap-2"
                style={{ color: '#dc2626', background: '#fff5f5', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? <Loader2 size={14} className="animate-spin" /> : null}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Item', value: counts.all,     color: '#6F4E37', bg: '#FFF8E7', icon: <Package size={22} /> },
          { label: 'Normal',    value: counts.Normal,   color: '#059669', bg: '#ecfdf5', icon: <CheckCircle size={22} /> },
          { label: 'Warning',   value: counts.Warning,  color: '#d97706', bg: '#fffbeb', icon: <AlertTriangle size={22} /> },
          { label: 'Critical',  value: counts.Critical, color: '#dc2626', bg: '#fee2e2', icon: <TrendingDown size={22} /> },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
              <div style={{ color: card.color }}>{card.icon}</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: card.color }}>
                {loading ? '—' : card.value}
              </div>
              <div className="text-xs" style={{ color: '#9ca3af' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Cari item..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#F5F5F5', border: '1.5px solid #e5e7eb', color: '#374151' }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} style={{ color: '#9ca3af' }} />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as FilterStatus)}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: '1.5px solid #e5e7eb', color: '#374151', background: 'white' }}>
              <option value="all">Semua Status</option>
              <option value="Normal">Normal</option>
              <option value="Warning">Warning</option>
              <option value="Critical">Critical</option>
            </select>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: '1.5px solid #e5e7eb', color: '#374151', background: 'white' }}>
              {categories.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'Semua Kategori' : c}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#6F4E37', color: 'white' }}>
              <Plus size={16} />
              Tambah Item
            </button>
            <Link to="/app/purchase"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#FFF8E7', color: '#6F4E37', border: '1px solid #FFD70040', textDecoration: 'none' }}>
              <Package size={16} />
              Buat PO
            </Link>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin" style={{ color: '#6F4E37' }} />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F5F5F5' }}>
                {['Nama Item', 'Kategori', 'Tersedia', 'Minimum', 'Status', 'Aksi'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: '#9ca3af' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm" style={{ color: '#9ca3af' }}>
                    Tidak ada item ditemukan
                  </td>
                </tr>
              ) : filtered.map((item, i) => {
                const statusStyle = STATUS_STYLE[item.status] ?? STATUS_STYLE.Normal;
                const pct = item.min_stock > 0 ? Math.min(100, (item.available / item.min_stock) * 100) : 100;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-sm" style={{ color: '#1f2937' }}>{item.name}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: '#F5F5F5', color: '#6b7280' }}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-sm" style={{ color: statusStyle.color }}>
                        {item.available} {item.unit}
                      </div>
                      <div className="mt-1 h-1.5 rounded-full w-24" style={{ background: '#e5e7eb' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: statusStyle.color }} />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm" style={{ color: '#6b7280' }}>{item.min_stock} {item.unit}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                        style={{ background: statusStyle.bg, color: statusStyle.color }}>
                        {statusStyle.icon}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                          style={{ background: '#FFF8E7', color: '#6F4E37', border: '1px solid #FFD70040' }}>
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                          style={{ background: '#fee2e2', color: '#dc2626' }}>
                          <Trash2 size={12} /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
